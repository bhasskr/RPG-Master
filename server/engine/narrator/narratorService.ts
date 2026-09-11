/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { NarratorPromptContext, NarratorResponse } from './types';
import { generateProceduralNarrative, generateDeterministicRollNarrative } from './fallbackNarrative';
import { NARRATOR_FUNCTION_DECLARATIONS, executeMemoryToolCall } from './memoryTools';
import { classifyActionRisk } from '../dice/actionClassifier';
import { executeRollCheck } from '../dice/diceEngine';
import { getModelChain, summarizeApiError, logModelExecution } from '../modelPolicy';

export class NarratorError extends Error {
  constructor(
    message: string,
    public code: 'MISSING_API_KEY' | 'API_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'UNKNOWN',
    public details?: unknown
  ) {
    super(message);
    this.name = 'NarratorError';
  }
}

/**
 * Executa uma Promise com timeout rigoroso
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutErrorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutErrorMessage));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function generateWithToolsFallback(
  ai: GoogleGenAI,
  promptText: string,
  context: NarratorPromptContext
): Promise<{ text: string; modelUsed: string; executedTools: any[]; diceRolls: any[] }> {
  let lastError: unknown = null;
  const executionCache = context.turnExecutionCache || new Map<string, any>();
  const executedTools: any[] = [];
  const diceRolls: any[] = [];

  // Rastreador de chamadas repetidas para evitar loops de Function Calling
  const toolCallCounter = new Map<string, number>();

  const modelChain = getModelChain('NARRATOR', {
    preferBestAvailableNarrator: context.preferBestAvailableNarrator,
  });

  for (const model of modelChain) {
    try {
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: context.systemInstructions,
          temperature: 0.85,
          tools: [{ functionDeclarations: NARRATOR_FUNCTION_DECLARATIONS }],
        },
      });

      // Timeout de 12s para a primeira mensagem
      let response = await withTimeout(
        chat.sendMessage({ message: promptText }),
        12000,
        `Gemini request timed out on model ${model} (12s)`
      );

      let toolIterations = 0;
      const maxToolIterations = 3; // Limite rigoroso de 3 iterações de ferramentas

      while (
        response.functionCalls &&
        response.functionCalls.length > 0 &&
        toolIterations < maxToolIterations
      ) {
        toolIterations++;
        const functionResponses = [];

        for (const call of response.functionCalls) {
          console.log(
            `[NarratorService] [${model}] Executing tool: ${call.name}`,
            call.args
          );

          // Detecção e quebra de loop infinito para a mesma ferramenta e argumentos
          const toolCallSignature = `${call.name}:${JSON.stringify(call.args || {})}`;
          const callCount = (toolCallCounter.get(toolCallSignature) || 0) + 1;
          toolCallCounter.set(toolCallSignature, callCount);

          let toolResult: { success: boolean; data?: any; error?: string; tool?: string; action?: string; message?: string };

          if (callCount > 2) {
            console.warn(`[NarratorService] Loop de ferramenta detectado para ${toolCallSignature}. Interrompendo repetição.`);
            toolResult = {
              success: false,
              action: 'rejected',
              error: 'LOOP_PREVENTED',
              tool: call.name,
              message: 'Consulta já realizada neste turno. Prossiga imediatamente com a narrativa.',
            };
          } else if (context.campaignId && context.memoryManager) {
            try {
              toolResult = await executeMemoryToolCall(
                call.name,
                (call.args as Record<string, any>) || {},
                context.campaignId,
                context.memoryManager,
                context.gameStateManager,
                executionCache,
                'narrator'
              );
            } catch (toolErr) {
              console.error(`[NarratorService] Erro ao executar ferramenta ${call.name}:`, toolErr);
              toolResult = {
                success: false,
                action: 'error',
                error: 'TOOL_EXECUTION_FAILED',
                tool: call.name,
                message: `Falha na execução da ferramenta: ${(toolErr as Error)?.message || 'Erro interno'}. Prossiga com a narrativa.`,
              };
            }
          } else {
            toolResult = {
              success: false,
              action: 'rejected',
              error: 'Contexto de memória não disponível para execução de persistência.',
              tool: call.name,
            };
          }

          executedTools.push({
            name: call.name,
            args: (call.args as Record<string, any>) || {},
            result: toolResult,
          });

          if ((call.name === 'roll_d20' || call.name === 'roll_check') && toolResult.data) {
            diceRolls.push(toolResult.data);
          }

          functionResponses.push({
            functionResponse: {
              name: call.name,
              id: call.id,
              response: toolResult,
            },
          });
        }

        // Timeout de 5s para respostas de ferramentas
        response = await withTimeout(
          chat.sendMessage({ message: functionResponses }),
          5000,
          `Gemini tool-response timed out on model ${model} (5s)`
        );
      }

      let text = response.text;

      // Se a ação era INCERTA e nenhum dado foi rolado, o Game Engine intervém autoritativamente
      const risk = classifyActionRisk(context.currentUserInput);
      if (risk.category === 'UNCERTAIN' && diceRolls.length === 0) {
        console.warn('[NarratorService] Ação INCERTA sem rolagem prévia. Game Engine gerando resolução mecânica oficial no servidor...');
        const forcedRoll = executeRollCheck({
          skill: risk.suggestedSkill || 'Perícia Geral',
          actor: context.player?.name || 'Jogador',
          difficulty: risk.suggestedDifficulty || 'MEDIUM',
        });
        diceRolls.push(forcedRoll);
        executedTools.push({
          name: 'roll_check',
          args: { skill: risk.suggestedSkill, difficulty: risk.suggestedDifficulty },
          result: { success: true, data: forcedRoll, message: 'Game Engine authoritative resolution' }
        });

        // Instruir o narrador a seguir estritamente o resultado do servidor com timeout de 8s
        const rollDirective = `[Game Engine — Resolução Mecânica Oficial]: O teste de ação foi resolvido no servidor pelo motor: D20=${forcedRoll.roll} (Total=${forcedRoll.total}, Dificuldade=${forcedRoll.difficultyLevel} [${forcedRoll.difficulty}], Resultado=${forcedRoll.outcome}, Sucesso=${forcedRoll.success}). Narre o desfecho da ação respeitando ESTRITAMENTE este resultado mecânico imutável. Se o resultado for FALHA (FAILURE ou CRITICAL_FAILURE), NUNCA narre sucesso funcional ou alcance do objetivo principal; narre o obstáculo e as complicações materiais concretas. Se for SUCCESS_WITH_COST, narre o sucesso com complicação ou custo real.`;
        try {
          const followUp = await withTimeout(
            chat.sendMessage({ message: rollDirective }),
            8000,
            'Dice follow-up timed out'
          );
          if (followUp.text && followUp.text.trim().length > 0) {
            text = followUp.text.trim();
          } else {
            text = generateDeterministicRollNarrative(context, forcedRoll);
          }
        } catch (followUpErr) {
          console.warn('[NarratorService] Follow-up de dado falhou ou expirou, utilizando narrativa procedural determinística compatível com o resultado mecânico:', followUpErr);
          text = generateDeterministicRollNarrative(context, forcedRoll);
        }
      }

      if (text && text.trim().length > 0) {
        logModelExecution({
          functionExecuted: 'NARRATOR',
          modelAttempted: model,
          modelSucceeded: model,
        });
        return { text: text.trim(), modelUsed: model, executedTools, diceRolls };
      }
    } catch (error: unknown) {
      lastError = error;
      const summarized = summarizeApiError(error);

      logModelExecution({
        functionExecuted: 'NARRATOR',
        modelAttempted: model,
        fallbackUsed: true,
        summarizedError: `${summarized.errorType}: ${summarized.message}`,
      });

      if (!summarized.isTransient) {
        // Se for erro de autenticação / chave ausente fatal, propaga de imediato
        throw error;
      }
    }
  }

  throw lastError || new Error('Todos os modelos de IA estão temporariamente indisponíveis.');
}

export class NarratorService {
  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
      throw new NarratorError(
        'A chave GEMINI_API_KEY não foi configurada. Configure sua API Key no painel Settings > Secrets do Google AI Studio.',
        'MISSING_API_KEY'
      );
    }

    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    return this.aiClient;
  }

  /**
   * Constrói o bloco de prompt para o turno inicial (abertura da campanha).
   */
  public buildOpeningPrompt(context: NarratorPromptContext): string {
    const {
      campaignFoundation,
      worldState,
      player,
    } = context;

    const sections: string[] = [];

    sections.push(`=== [DIRETIVAS DE ABERTURA] ===
Você é o Mestre de Jogo de um RPG. Esta é a primeira mensagem da campanha (o início da aventura).
Regras obrigatórias para a abertura:
- Seja curto e jogável.
- Use o mundo, as regras, o personagem e as preferências narrativas definidas.
- Respeite o local de origem definido.
- Apresente uma situação concreta com espaço imediato para escolha.
- Não decida pensamentos, emoções, falas ou ações do jogador.
- Não crie destinos, profecias ou missões obrigatórias.
- Evite prólogos longos e exposições enciclopédicas.
- Termine em um ponto onde o jogador possa agir livremente.`);

    // [FUNDAÇÃO DA CAMPANHA]
    const hasFoundation = campaignFoundation && (campaignFoundation.title || campaignFoundation.genre || campaignFoundation.premise);
    if (hasFoundation) {
      const foundLines = [
        campaignFoundation.title ? `Título: ${campaignFoundation.title}` : '',
        campaignFoundation.genre ? `Gênero/Cenário: ${campaignFoundation.genre}` : '',
        campaignFoundation.tone ? `Tom Narrativo: ${campaignFoundation.tone}` : '',
        campaignFoundation.premise ? `Premissa: ${campaignFoundation.premise}` : '',
        campaignFoundation.startingLocation ? `Local de Origem: ${campaignFoundation.startingLocation}` : '',
        campaignFoundation.rulesOfUniverse ? `Regras do Universo: ${campaignFoundation.rulesOfUniverse}` : '',
        campaignFoundation.masterResponseLength ? `Extensão Preferencial de Resposta: ${campaignFoundation.masterResponseLength}` : '',
        campaignFoundation.masterPacing ? `Ritmo Preferencial: ${campaignFoundation.masterPacing}` : '',
        campaignFoundation.masterDescriptionLevel ? `Nível de Detalhe Descritivo: ${campaignFoundation.masterDescriptionLevel}` : '',
        campaignFoundation.masterFocus ? `Foco Narrativo: ${campaignFoundation.masterFocus}` : '',
      ].filter(Boolean).join('\n');

      sections.push(`=== [FUNDAÇÃO DA CAMPANHA] ===\n${foundLines}`);
    }

    // [ESTADO ATUAL DO MUNDO]
    const hasWorld = worldState && (worldState.currentLocation || worldState.statusSummary || worldState.weather);
    if (hasWorld) {
      const worldLines = [
        worldState.currentLocation ? `Localização Atual: ${worldState.currentLocation}` : '',
        worldState.timeOfDay ? `Momento/Hora: ${worldState.timeOfDay}` : '',
        worldState.weather ? `Clima/Ambiente: ${worldState.weather}` : '',
      ].filter(Boolean).join('\n');

      sections.push(`=== [ESTADO DO MUNDO] ===\n${worldLines}`);
    }

    // [PROTAGONISTA (JOGADOR)]
    const hasPlayer = player && (player.name || player.archetype || player.description || player.backstory);
    if (hasPlayer) {
      const charDesc = [
        player.name ? `Nome: ${player.name}` : '',
        player.archetype ? `Arquétipo/Classe: ${player.archetype}` : '',
        player.description ? `Aparência: ${player.description}` : '',
        player.personality ? `Personalidade: ${player.personality}` : '',
        player.backstory ? `Origem/Histórico: ${player.backstory}` : '',
      ].filter(Boolean).join(' | ');

      sections.push(`=== [PERSONAGEM DO JOGADOR] ===\n${charDesc}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Gera a abertura da aventura (primeiro turno) via Gemini API.
   */
  async generateOpeningMessage(context: NarratorPromptContext): Promise<NarratorResponse> {
    const ai = this.getClient();
    const promptText = this.buildOpeningPrompt(context);

    const modelChain = getModelChain('NARRATOR', {
      preferBestAvailableNarrator: context.preferBestAvailableNarrator,
    });

    for (const model of modelChain) {
      try {
        const chat = ai.chats.create({
          model,
          config: {
            systemInstruction: context.systemInstructions,
            temperature: 0.85,
          },
        });

        const response = await withTimeout(
          chat.sendMessage({ message: promptText }),
          12000,
          `Gemini request timed out on model ${model} (12s)`
        );

        const text = response.text;
        if (text && text.trim().length > 0) {
          logModelExecution({
            functionExecuted: 'NARRATOR/generateOpeningMessage',
            modelAttempted: model,
            modelSucceeded: model,
          });
          return { text: text.trim(), modelUsed: model, executedTools: [], diceRolls: [] };
        }
      } catch (error: unknown) {
        const summarized = summarizeApiError(error);
        logModelExecution({
          functionExecuted: 'NARRATOR/generateOpeningMessage',
          modelAttempted: model,
          fallbackUsed: true,
          summarizedError: `${summarized.errorType}: ${summarized.message}`,
        });
      }
    }

    // Fallback procedural se todos os modelos falharem
    console.warn('[NarratorService] Using procedural fallback for opening message.');
    const loc = context.campaignFoundation?.startingLocation || context.worldState?.currentLocation || 'um local desconhecido';
    return {
      text: `A aventura começa em ${loc}. O que você faz?`,
      modelUsed: 'procedural-fallback',
      executedTools: [],
      diceRolls: [],
    };
  }

  /**
   * Constrói o bloco de prompt contextual formatado contendo:
   * 1. Fundação da Campanha
   * 2. Estado Atual do Mundo
   * 3. Personagem do Jogador
   * 4. Memórias Relevantes
   * 5. Mensagens Recentes
   * 6. Ação atual do Jogador
   */
  public buildPrompt(context: NarratorPromptContext): string {
    const {
      campaignFoundation,
      worldState,
      player,
      activeNpcs,
      activeQuests,
      keyInventoryItems,
      recentMessages,
      currentUserInput,
    } = context;

    const sections: string[] = [];

    // [PRECEDÊNCIA CANÔNICA E ANTI-RETCON]
    sections.push(
      `=== [ORDEM DE PRECEDÊNCIA CANÔNICA DE VERDADE & ANTI-RETCON] ===\n` +
      `1. ESTADO ESTRUTURADO PERSISTIDO (Fundação, Localização, Inventário, NPCs, Ferimentos, Quests)\n` +
      `2. EVENTOS & CONHECIMENTO CANÔNICO AUTORIZADO\n` +
      `3. HISTÓRICO RECENTE DE MENSAGENS\n` +
      `4. INFERÊNCIA DO MODELO (NUNCA substitui nem contradiz fatos persistidos)\n` +
      `REGRA: Se houver qualquer conflito factual, OBEDEÇA ESTRITAMENTE ao estado persistido. Objeto consumido/destruído não reaparece. Ferimento grave não desaparece sem cura real. Quest concluída não reinicia. NPC morto não revive.`
    );

    // [FUNDAÇÃO DA CAMPANHA] (Apenas se definida pelo usuário ou pela campanha)
    const hasFoundation = campaignFoundation && (campaignFoundation.title || campaignFoundation.genre || campaignFoundation.premise);
    if (hasFoundation) {
      const foundLines = [
        campaignFoundation.title ? `Título: ${campaignFoundation.title}` : '',
        campaignFoundation.genre ? `Gênero/Cenário: ${campaignFoundation.genre}` : '',
        campaignFoundation.tone ? `Tom Narrativo: ${campaignFoundation.tone}` : '',
        campaignFoundation.premise ? `Premissa: ${campaignFoundation.premise}` : '',
        campaignFoundation.startingLocation ? `Local de Origem: ${campaignFoundation.startingLocation}` : '',
        campaignFoundation.rulesOfUniverse ? `Regras do Universo: ${campaignFoundation.rulesOfUniverse}` : '',
        campaignFoundation.masterResponseLength ? `Extensão Preferencial de Resposta: ${campaignFoundation.masterResponseLength}` : '',
        campaignFoundation.masterPacing ? `Ritmo Preferencial: ${campaignFoundation.masterPacing}` : '',
        campaignFoundation.masterDescriptionLevel ? `Nível de Detalhe Descritivo: ${campaignFoundation.masterDescriptionLevel}` : '',
        campaignFoundation.masterFocus ? `Foco Narrativo: ${campaignFoundation.masterFocus}` : '',
      ].filter(Boolean).join('\n');

      sections.push(`=== [FUNDAÇÃO DA CAMPANHA] ===\n${foundLines}`);
    }

    // [ESTADO ATUAL DO MUNDO] (Apenas se houver dados reais)
    const hasWorld = worldState && (worldState.currentLocation || worldState.statusSummary || worldState.weather);
    if (hasWorld) {
      const worldLines = [
        worldState.currentLocation ? `Localização Atual: ${worldState.currentLocation}` : '',
        worldState.timeOfDay ? `Momento/Hora: ${worldState.timeOfDay}` : '',
        worldState.weather ? `Clima/Ambiente: ${worldState.weather}` : '',
        worldState.statusSummary ? `Resumo da Situação: ${worldState.statusSummary}` : '',
      ].filter(Boolean).join('\n');

      sections.push(`=== [ESTADO DO MUNDO] ===\n${worldLines}`);
    }

    // [PROTAGONISTA (JOGADOR)] (Apenas se o jogador tiver nome ou traços definidos)
    const hasPlayer = player && (player.name || player.archetype || player.description || player.backstory);
    if (hasPlayer) {
      const charDesc = [
        player.name ? `Nome: ${player.name}` : '',
        player.archetype ? `Arquétipo/Classe: ${player.archetype}` : '',
        player.description ? `Aparência: ${player.description}` : '',
        player.personality ? `Personalidade: ${player.personality}` : '',
        player.backstory ? `Origem/Histórico: ${player.backstory}` : '',
      ].filter(Boolean).join(' | ');

      sections.push(`=== [PERSONAGEM DO JOGADOR] ===\n${charDesc}`);
    }

    // NPCs Ativos na Cena (com atributos persistidos completos: identidade, traços, objetivos, disposição e segredos)
    if (activeNpcs && activeNpcs.length > 0) {
      const npcList = activeNpcs.map(n => {
        const details = [
          `Papel: ${n.role}`,
          `Status: ${n.status}`,
          (n as any).faction ? `Facção: ${(n as any).faction}` : '',
          n.disposition ? `Disposição: ${n.disposition}` : '',
          n.archetype ? `Arquétipo: ${n.archetype}` : '',
          n.personality ? `Personalidade/Traços: ${n.personality}` : '',
          (n as any).goals && (n as any).goals.length > 0 ? `Objetivos: ${(n as any).goals.join('; ')}` : '',
          n.description ? `Descrição: ${n.description}` : '',
          n.secrets && n.secrets.length > 0 ? `Segredos Ocultos: ${n.secrets.join('; ')}` : '',
        ].filter(Boolean).join(' | ');

        return `- ${n.name} [${details}]`;
      }).join('\n');
      sections.push(`=== [NPCs RELEVANTES NA CENA (CONDUTA PAUTADA EM OBJETIVOS, DISPOSIÇÃO E PERSONALIDADE PERSISTIDAS)] ===\n${npcList}`);
    }

    // Itens e Missões Ativas (se houver)
    if (keyInventoryItems && keyInventoryItems.length > 0) {
      const itemsList = keyInventoryItems.map(i => `- ${i.name} (${i.rarity}) x${i.quantity}`).join(', ');
      sections.push(`=== [ITENS EM POSSE] ===\n${itemsList}`);
    }

    if (activeQuests && activeQuests.length > 0) {
      const questList = activeQuests.map(q => `- ${q.title}: ${q.description}`).join('\n');
      sections.push(`=== [OBJETIVOS / MISSÕES ATIVAS] ===\n${questList}`);
    }

    // [MEMÓRIA E CONTEXTO ESTRUTURADO DO MUNDO]
    if (context.relevantContextSummary && context.relevantContextSummary.trim().length > 0) {
      sections.push(`=== [MEMÓRIA ESTRUTURADA RELEVANTE PARA ESTE TURNO] ===\n${context.relevantContextSummary}`);
    }

    // [DIRETIVA DE MUNDO AUTÔNOMO E RITMO SANDBOX]
    sections.push(
      `=== [DIRETIVA DE AUTONOMIA DO MUNDO E RITMO SANDBOX] ===\n` +
      `1. O mundo NÃO gira em torno do protagonista: NPCs e facções operam por seus próprios objetivos e cronogramas.\n` +
      `2. Respeite cenas quietas e momentos calmos: não force perigos, ganchos ou coincidências artificiais.\n` +
      `3. Isolamento cognitivo: o jogador NÃO descobre eventos fora da cena magicamente; a informação requer meios plausíveis (rumor, notícia, testemunho ou observação direta).`
    );

    // [HISTÓRICO RECENTE DE DIÁLOGOS E AÇÕES]
    if (recentMessages && recentMessages.length > 0) {
      const playerNameTag = player?.name ? `Jogador - ${player.name}` : 'Jogador';
      const historyList = recentMessages
        .map(msg => {
          const speaker = msg.role === 'user' ? `[${playerNameTag}]` : '[Mestre do RPG]';
          return `${speaker} (Turno ${msg.turn}):\n${msg.content}`;
        })
        .join('\n\n');
      sections.push(`=== [HISTÓRICO RECENTE DE MENSAGENS (CONSULTE PARA CONTINUIDADE, EVITANDO ECO, REPETIÇÃO DE SINTAXE E REDESCRIÇÃO DE ELEMENTOS JÁ APRESENTADOS)] ===\n${historyList}`);
    }

    // [AÇÃO / ENTRADA ATUAL DO JOGADOR]
    const userLabel = player?.name ? `Jogador (${player.name})` : 'Jogador';
    sections.push(`=== [MENSAGEM / AÇÃO DO JOGADOR] ===
[${userLabel}]:
${currentUserInput}`);

    
    const risk = classifyActionRisk(currentUserInput);
    if (risk.category === 'UNCERTAIN') {
      sections.push(
        `=== [DIRETIVA DE MOTOR OBRIGATÓRIA (AÇÃO INCERTA / ARRISCADA)] ===\n` +
        `A ação declarada pelo jogador tem desfecho incerto ou oposição (${risk.reason}).\n` +
        `Perícia sugerida: ${risk.suggestedSkill || 'Geral'} | Dificuldade sugerida: ${risk.suggestedDifficulty || 'MEDIUM'}.\n` +
        `ORDEM CANÔNICA: VOCÊ É OBRIGADO a chamar a ferramenta 'roll_check' ou 'roll_d20' para que o Game Engine resolva o teste aleatório no servidor ANTES de narrar o desfecho.\n` +
        `OBEDIÊNCIA MECÂNICA ABSOLUTA: Os valores retornados pelo servidor (roll, total, difficulty, outcome, success) são IMUTÁVEIS. Se o servidor retornar FAILURE ou CRITICAL_FAILURE, é ESTRITAMENTE PROIBIDO narrar sucesso funcional disfarçado.`
      );
    } else if (risk.category === 'IMPOSSIBLE') {
      sections.push(
        `=== [DIRETIVA DE MOTOR OBRIGATÓRIA (AÇÃO IMPOSSÍVEL)] ===\n` +
        `A ação declarada pelo jogador é fisicamente ou logicamente impossível (${risk.reason}).\n` +
        `NÃO chame 'roll_check' ou 'roll_d20' para dar chance de sucesso. Narre a impossibilidade direta da tentativa e a falha causal de acordo com o estado do mundo.`
      );
    } else if (risk.category === 'TRIVIAL') {
      sections.push(
        `=== [DIRETIVA DE MOTOR (AÇÃO TRIVIAL)] ===\n` +
        `A ação declarada pelo jogador é rotineira ou sem oposição. Narre a execução direta sem exigir rolagem de dados.`
      );
    }

    return sections.join('\n\n');
  }

  /**
   * Gera a resposta do Mestre do RPG via Gemini API.
   */
  async generateMasterResponse(context: NarratorPromptContext): Promise<NarratorResponse> {
    const ai = this.getClient();
    const promptText = this.buildPrompt(context);

    try {
      const { text, modelUsed, executedTools, diceRolls } = await generateWithToolsFallback(
        ai,
        promptText,
        context
      );

      return {
        text: text.trim(),
        modelUsed,
        executedTools,
        diceRolls,
      };
    } catch (err: unknown) {
      if (err instanceof NarratorError) {
        throw err;
      }

      const errMessage = (err as Error)?.message || String(err);
      if (errMessage.includes('API_KEY') || errMessage.includes('apiKey') || errMessage.includes('UNAUTHENTICATED')) {
        throw new NarratorError(
          'Chave da Gemini API inválida ou não autorizada. Verifique suas credenciais em Settings > Secrets.',
          'MISSING_API_KEY',
          err
        );
      }

      if (
        errMessage.includes('503') ||
        errMessage.includes('UNAVAILABLE') ||
        errMessage.includes('high demand') ||
        errMessage.includes('todos os modelos') ||
        errMessage.includes('Todos os modelos') ||
        errMessage.includes('RESOURCE_EXHAUSTED') ||
        errMessage.includes('429') ||
        errMessage.includes('quota') ||
        errMessage.includes('rate limit') ||
        errMessage.includes('Rate limit') ||
        errMessage.includes('Too Many Requests')
      ) {
        console.warn('[NarratorService] Using procedural fallback narrative due to temporary upstream API load or rate limiting.');
        const fallbackText = generateProceduralNarrative(context);
        return {
          text: fallbackText,
          modelUsed: 'procedural-fallback',
        };
      }

      if (errMessage.includes('timed out') || errMessage.includes('timeout') || errMessage.includes('DEADLINE_EXCEEDED')) {
        console.warn('[NarratorService] Using procedural fallback narrative due to request timeout.');
        const fallbackText = generateProceduralNarrative(context);
        return {
          text: fallbackText,
          modelUsed: 'procedural-fallback',
        };
      }

      throw new NarratorError(
        `Erro ao comunicar com a Gemini API: ${errMessage}`,
        'API_ERROR',
        err
      );
    }
  }
}
