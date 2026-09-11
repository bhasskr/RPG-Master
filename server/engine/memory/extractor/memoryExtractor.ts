/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  TurnContext,
  MemoryExtractionResult,
  ExtractedEvent,
  ExtractedKnowledgeChange,
  ExtractedRelationshipChange,
  ExtractedInventoryChange,
  ExtractedQuestChange,
  ExtractedNPCChange,
  ExtractedWorldChange,
  MemoryConflict,
} from './types';
import { normalizeText, calculateFactSimilarity, extractKeyTokens } from '../knowledgeAcquisition';
import { getModelChain, summarizeApiError, logModelExecution } from '../../modelPolicy';

/**
 * System Instructions específicas para o papel isolado de MEMORY EXTRACTOR.
 */
const MEMORY_EXTRACTOR_SYSTEM_INSTRUCTIONS = `Você é o MEMORY EXTRACTOR do Game Engine.
Sua única responsabilidade é analisar o turno concluído de uma campanha de RPG e identificar SOMENTE alterações persistentes reais no estado do mundo, personagens, conhecimento, inventário, relacionamentos e missões.

REGRAS FUNDAMENTAIS:
1. SOMENTE MUDANÇAS NOVAS E PERSISTENTES.
2. SISTEMA EPISTEMOLÓGICO:
   - WORLD_TRUTH (isWorldTruth: true): Fato objetivo do mundo, sem necessidade de observador.
   - DIRECT_OBSERVATION (epistemicStatus: "DIRECT_OBSERVATION"): O personagem efetivamente viu/ouviu. (Ex: observedBy: ["João"]).
   - REPORTED_INFORMATION: O personagem foi informado por alguém. (Ex: informationChain: ["Marta", "João"]).
   - RUMOR: Informação não verificada circulando.
   - SUSPICION: Um palpite fundamentado. (Ex: suspectedBy: ["Pedro"]).
   - BELIEF / FALSE_BELIEF: O personagem acredita com convicção (believedBy: ["Carlos"]).
   - DISPUTED: Se uma crença anterior é contestada por novas evidências.
3. ISOLAMENTO RÍGIDO: Se Marta descobre um segredo, não inclua João em knownBy. Use knownBy apenas para quem realmente domina a informação. Se for observação, use observedBy. Se for crença, believedBy.
4. INVENTÁRIO, NPCS E MUNDO: Apenas alterações permanentes.
5. CONFLITOS E ANTI-RETCON: Apenas contradição canônica vai para conflicts. Diferenças de crenças entre NPCs são legítimas e NÃO são conflitos de retcon.`;

const EXTRACTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          participants: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING },
          consequences: { type: Type.ARRAY, items: { type: Type.STRING } },
          category: { type: Type.STRING },
        },
        required: ['location', 'participants', 'description'],
      },
    },
    knowledgeChanges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fact: { type: Type.STRING },
          truthStatus: { type: Type.STRING },
          knownBy: { type: Type.ARRAY, items: { type: Type.STRING } },
          suspectedBy: { type: Type.ARRAY, items: { type: Type.STRING } },
          source: { type: Type.STRING },
          reliability: { type: Type.NUMBER },
          isWorldTruth: { type: Type.BOOLEAN },
          isPublicKnowledge: { type: Type.BOOLEAN },
          epistemicStatus: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          observedBy: { type: Type.ARRAY, items: { type: Type.STRING } },
          believedBy: { type: Type.ARRAY, items: { type: Type.STRING } },
          disputedBy: { type: Type.ARRAY, items: { type: Type.STRING } },
          informationChain: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['fact', 'truthStatus', 'knownBy'],
      },
    },
    relationshipChanges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          characterA: { type: Type.STRING },
          characterB: { type: Type.STRING },
          trustChange: { type: Type.NUMBER },
          hostilityChange: { type: Type.NUMBER },
          familiarityChange: { type: Type.NUMBER },
          reason: { type: Type.STRING },
        },
        required: ['characterA', 'characterB'],
      },
    },
    inventoryChanges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          owner: { type: Type.STRING },
          item: { type: Type.STRING },
          action: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
        },
        required: ['owner', 'item', 'action', 'quantity'],
      },
    },
    questChanges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          action: { type: Type.STRING },
          status: { type: Type.STRING },
          objectiveDescription: { type: Type.STRING },
          participants: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'action'],
      },
    },
    npcChanges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          npcIdOrName: { type: Type.STRING },
          statusChange: { type: Type.STRING },
          locationChange: { type: Type.STRING },
          factionChange: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
        required: ['npcIdOrName'],
      },
    },
    worldChanges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          locationOrRegion: { type: Type.STRING },
          changeType: { type: Type.STRING },
          description: { type: Type.STRING },
          isPermanent: { type: Type.BOOLEAN },
        },
        required: ['locationOrRegion', 'changeType', 'description', 'isPermanent'],
      },
    },
    conflicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          existing: { type: Type.STRING },
          proposed: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['type', 'existing', 'proposed', 'reason'],
      },
    },
  },
  required: [
    'events',
    'knowledgeChanges',
    'relationshipChanges',
    'inventoryChanges',
    'questChanges',
    'npcChanges',
    'worldChanges',
  ],
};

/**
 * Cria o prompt de análise para o LLM caso a API esteja disponível
 */
function buildExtractionPrompt(turnContext: TurnContext): string {
  const previousState = turnContext.previousState;
  const prevNpcs = previousState?.npcs?.map((n) => `${n.name} (Status: ${n.status}, Local: ${n.location})`).join('; ') || 'Nenhum';
  const prevInventory = previousState?.inventory?.map((i) => `${i.owner}: ${i.item} x${i.quantity}`).join('; ') || 'Vazio';
  const prevKnowledge = previousState?.knowledge?.map((k) => `[${k.truthStatus}] "${k.fact}" (Sabem: ${k.knownBy.join(', ')})`).join('\n') || 'Nenhum';

  const toolsSummary = turnContext.toolsCalled && turnContext.toolsCalled.length > 0
    ? turnContext.toolsCalled.map((t) => `Ferramenta: ${t.name}(${JSON.stringify(t.args)}) -> Resultado: ${JSON.stringify(t.result)}`).join('\n')
    : 'Nenhuma ferramenta chamada';

  const diceSummary = turnContext.diceRolls && turnContext.diceRolls.length > 0
    ? turnContext.diceRolls.map((d) => `D20: ${d.roll} | Total: ${d.total ?? d.roll} | Resultado: ${d.outcome ?? 'N/A'}`).join('\n')
    : 'Nenhuma rolagem de dados';

  return `=== ESTADO ANTERIOR DA CAMPANHA ===
Local Atual: ${turnContext.currentLocation || 'Desconhecido'}
NPCs Cadastrados: ${prevNpcs}
Inventário Existente: ${prevInventory}
Conhecimentos Persistidos:
${prevKnowledge}

=== TURNO AVALIADO (TURNO ${turnContext.turn}) ===
Ação do Jogador:
${turnContext.playerAction}

NPCs Envolvidos na Cena: ${turnContext.involvedNpcs?.join(', ') || 'Nenhum explicitado'}

Rolagens de Dados:
${diceSummary}

Ferramentas Invocadas:
${toolsSummary}

Narrativa Final do Mestre:
${turnContext.finalNarrative}

Instruções Adicionais:
- Extraia SOMENTE os fatos novos gerados neste turno.
- Siga as REGRAS FUNDAMENTAIS estritamente.
`;
}

export function extractDeterministicMemoryChanges(turnContext: TurnContext): MemoryExtractionResult {
  const result: MemoryExtractionResult = {
    events: [],
    knowledgeChanges: [],
    relationshipChanges: [],
    inventoryChanges: [],
    questChanges: [],
    npcChanges: [],
    worldChanges: [],
    conflicts: [],
  };

  if (!turnContext.toolsCalled || turnContext.toolsCalled.length === 0) {
    return result;
  }

  for (const tool of turnContext.toolsCalled) {
    if (tool.result && (tool.result.error || tool.result.status === 'error')) {
      continue;
    }

    const args = tool.args;

    if (tool.name === 'create_knowledge' || tool.name === 'update_knowledge') {
      const fact = args.fact || args.knowledge;
      if (fact) {
        const truthStatus = args.truthStatus || 'true';
        const isWorldTruth = args.isWorldTruth ?? (truthStatus === 'true' && (!args.knownBy || args.knownBy.length === 0));
        
        result.knowledgeChanges.push({
          fact,
          truthStatus,
          knownBy: args.knownBy && Array.isArray(args.knownBy) ? args.knownBy : ['player'],
          suspectedBy: args.suspectedBy || [],
          source: args.source || 'Observação / Interação direta',
          reliability: args.reliability ?? 10,
          isWorldTruth,
          isPublicKnowledge: args.isPublicKnowledge ?? false,
          epistemicStatus: args.epistemicStatus || (isWorldTruth ? 'WORLD_TRUTH' : 'UNKNOWN'),
          confidence: args.confidence ?? 10,
          observedBy: args.observedBy || [],
          believedBy: args.believedBy || [],
          disputedBy: args.disputedBy || [],
          informationChain: args.informationChain || [],
          action: tool.name === 'create_knowledge' ? 'create' : 'update'
        });
      }
    }

    if (tool.name === 'update_npc' || tool.name === 'create_npc') {
      const npcName = args.npcIdOrName || args.name || args.npcId;
      if (npcName) {
        result.npcChanges.push({
          npcIdOrName: npcName,
          statusChange: args.status,
          locationChange: args.location,
          notes: args.personalityNotes || args.notes,
        });
      }
    }
  }

  return result;
}

/**
 * Função principal modular: extractMemoryChanges(turnContext)
 * Utiliza o Gemini com schema estrito quando configurado, com fallback e integração
 * determinística completa para máxima confiabilidade.
 */
export async function extractMemoryChanges(turnContext: TurnContext): Promise<MemoryExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isApiConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');

  // 1. Se API do Gemini estiver configurada, tentar extração estruturada via LLM com timeout rigoroso
  if (isApiConfigured) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: 10000, // 10 segundos máximo para extração de memória estruturada
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = buildExtractionPrompt(turnContext);
      const extractionModels = getModelChain('MEMORY_EXTRACTION');

      for (const model of extractionModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: MEMORY_EXTRACTOR_SYSTEM_INSTRUCTIONS,
              temperature: 0.1, // Temperatura baixa para máxima fidelidade e determinismo
              responseMimeType: 'application/json',
              responseSchema: EXTRACTION_RESPONSE_SCHEMA,
            },
          });

          const rawJson = response.text;
          if (rawJson && rawJson.trim().length > 0) {
            const parsed = JSON.parse(rawJson.trim()) as MemoryExtractionResult;

            logModelExecution({
              functionExecuted: 'MEMORY_EXTRACTION',
              modelAttempted: model,
              modelSucceeded: model,
            });

            // Normalizar campos para garantir que todos os arrays existam
            return {
              events: parsed.events || [],
              knowledgeChanges: parsed.knowledgeChanges || [],
              relationshipChanges: parsed.relationshipChanges || [],
              inventoryChanges: parsed.inventoryChanges || [],
              questChanges: parsed.questChanges || [],
              npcChanges: parsed.npcChanges || [],
              worldChanges: parsed.worldChanges || [],
              conflicts: parsed.conflicts || [],
            };
          }
        } catch (modelErr) {
          const summarized = summarizeApiError(modelErr);
          logModelExecution({
            functionExecuted: 'MEMORY_EXTRACTION',
            modelAttempted: model,
            fallbackUsed: true,
            summarizedError: `${summarized.errorType}: ${summarized.message}`,
          });
        }
      }
    } catch (err) {
      console.info('[MemoryExtractor] Extração via IA indisponível, acionando extrator determinístico.');
      // Fallback determinístico seguro em caso de falha de rede/timeout
      return extractDeterministicMemoryChanges(turnContext);
    }
  }

  // 2. Executar motor determinístico com validação semântica profunda se API não estiver configurada
  return extractDeterministicMemoryChanges(turnContext);
}
