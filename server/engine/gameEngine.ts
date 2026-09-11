/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameStateManager, CreateCampaignParams } from './gameState/gameStateManager';
import { MemoryManager } from './memory/memoryManager';
import { NarratorService } from './narrator/narratorService';
import { getSystemInstructions } from './narrator/systemInstructions';
import { GameState } from './gameState/types';
import { ChatMessage } from './memory/types';
import { detectAndProcessKnowledgeAcquisition } from './memory/knowledgeAcquisition';
import { extractMemoryChanges } from './memory/extractor/memoryExtractor';
import { MemoryValidator } from './memory/extractor/memoryValidator';
import { MemoryExtractionResult, ValidatedMemoryChanges } from './memory/extractor/types';

export interface ProcessActionOutput {
  playerMessage: ChatMessage;
  masterMessage: ChatMessage;
  gameState: GameState;
  turn: number;
  campaignId: string;
  memoryChanges?: MemoryExtractionResult;
  validatedMemoryChanges?: ValidatedMemoryChanges;
}

export interface NewCampaignOutput {
  campaignId: string;
  gameState: GameState;
  openingMessage?: ChatMessage;
}

export interface EngineStatus {
  activeCampaignsCount: number;
  memoryStoreType: string;
  narratorModel: string;
  isApiKeyConfigured: boolean;
}

export class GameEngine {
  public gameStateManager: GameStateManager;
  public memoryManager: MemoryManager;
  public narratorService: NarratorService;

  constructor(
    memoryManager?: MemoryManager,
    gameStateManager?: GameStateManager,
    narratorService?: NarratorService
  ) {
    this.memoryManager = memoryManager || new MemoryManager();
    this.gameStateManager = gameStateManager || new GameStateManager();
    this.narratorService = narratorService || new NarratorService();
  }

  /**
   * Inicia uma nova sessão / campanha e gera o turno inicial (abertura).
   */
  async startNewCampaign(params: CreateCampaignParams = {}): Promise<NewCampaignOutput> {
    // 1. Criar estado inicial do jogo e fundação
    const gameState = this.gameStateManager.createCampaign(params);
    const campaignId = gameState.campaignId;

    // 2. Limpar memória anterior para garantir uma sessão limpa
    await this.memoryManager.clearCampaignData(campaignId);

    // 3. Montar contexto e chamar NarratorService para a abertura
    const systemInstructions = getSystemInstructions(
      gameState.foundation.rulesOfUniverse,
      gameState.foundation.tone || gameState.foundation.masterTone,
      {
        responseLength: gameState.foundation.masterResponseLength,
        pacing: gameState.foundation.masterPacing,
        descriptionLevel: gameState.foundation.masterDescriptionLevel,
        focus: gameState.foundation.masterFocus,
      }
    );
    
    let openingMessageText = '';
    try {
      const narratorResponse = await this.narratorService.generateOpeningMessage({
        campaignId,
        memoryManager: this.memoryManager,
        gameStateManager: this.gameStateManager,
        systemInstructions,
        campaignFoundation: gameState.foundation,
        worldState: gameState.worldState,
        player: gameState.player,
        currentUserInput: '', // Sem input do jogador na abertura
        recentMessages: [],
      });
      openingMessageText = narratorResponse.text;
    } catch (error) {
      console.error('[GameEngine] Falha ao gerar abertura inicial:', error);
      openingMessageText = `A aventura começa em ${gameState.foundation.startingLocation || 'um local desconhecido'}. O que você faz?`;
    }

    // 4. Salvar a resposta do Mestre como a primeira mensagem
    const openingMessage = await this.memoryManager.recordMessage(
      campaignId,
      'assistant',
      openingMessageText,
      0, // Turno 0 para abertura
      { location: gameState.worldState.currentLocation }
    );

    return {
      campaignId,
      gameState,
      openingMessage,
    };
  }

  /**
   * Processa a mensagem / ação do jogador seguindo o fluxo de arquitetura estrito:
   * 1. Receber mensagem do jogador
   * 2. Recuperar o estado da campanha
   * 3. Recuperar as mensagens recentes
   * 4. Montar o contexto com NARRATOR_SYSTEM_INSTRUCTIONS
   * 5. Chamar o Gemini
   * 6. Receber a resposta
   * 7. Salvar a mensagem do jogador
   * 8. Salvar a resposta do Mestre
   * 9. Devolver a resposta ao frontend
   */
  async processPlayerAction(campaignId: string, playerActionText: string): Promise<ProcessActionOutput> {
    // 1. Obter ou criar estado do jogo
    let gameState = campaignId ? this.gameStateManager.getGameState(campaignId) : null;
    if (!gameState) {
      gameState = this.gameStateManager.createCampaign({ campaignId: campaignId || undefined });
      campaignId = gameState.campaignId;
    }

    // 2. Avançar o turno
    const currentTurn = this.gameStateManager.advanceTurn(campaignId);

    // 3. Gravar mensagem do jogador na Memory Layer
    const playerMessage = await this.memoryManager.recordMessage(
      campaignId,
      'user',
      playerActionText,
      currentTurn,
      { location: gameState.worldState.currentLocation }
    );

    // 3.5. Detectar e processar aquisição automática de conhecimento por NPCs presentes
    try {
      await detectAndProcessKnowledgeAcquisition({
        campaignId,
        playerActionText,
        currentLocation: gameState.worldState.currentLocation,
        activeNpcs: gameState.npcs.map((n) => ({ id: n.id, name: n.name })),
        memoryManager: this.memoryManager,
      });
    } catch (acqErr) {
      console.error('[GameEngine] Erro na detecção de aquisição de conhecimento:', acqErr);
    }

    // 4. Montar contexto relevante estruturado através da Memory Layer e Game State
    const relevantContext = await this.memoryManager.getRelevantContext({
      campaignId,
      currentLocation: gameState.worldState.currentLocation,
      presentNPCs: gameState.npcs.map((n) => n.name),
      conversationSubject: playerActionText,
      playerCharacter: gameState.player.name,
      targetCharacter: 'narrator',
    });

    const recentMessages = await this.memoryManager.getRecentMessages(campaignId, 12);
    const systemInstructions = getSystemInstructions(
      gameState.foundation.rulesOfUniverse,
      gameState.foundation.tone || gameState.foundation.masterTone,
      {
        responseLength: gameState.foundation.masterResponseLength,
        pacing: gameState.foundation.masterPacing,
        descriptionLevel: gameState.foundation.masterDescriptionLevel,
        focus: gameState.foundation.masterFocus,
      }
    );

    // 5. Chamar o Narrator (Gemini) com o contexto relevante determinístico e ferramentas da Memory Layer
    const narratorResponse = await this.narratorService.generateMasterResponse({
      campaignId,
      memoryManager: this.memoryManager,
      gameStateManager: this.gameStateManager,
      systemInstructions,
      campaignFoundation: gameState.foundation,
      worldState: gameState.worldState,
      player: gameState.player,
      activeNpcs: gameState.npcs,
      activeQuests: gameState.quests,
      keyInventoryItems: gameState.inventory.items,
      relevantContextOutput: relevantContext,
      relevantContextSummary: relevantContext.formattedSummary,
      recentMessages,
      currentUserInput: playerActionText,
    });

    // 6. Gravar resposta do Mestre na Memory Layer (separada do banco de memória estruturada)
    const masterMessage = await this.memoryManager.recordMessage(
      campaignId,
      'assistant',
      narratorResponse.text,
      currentTurn,
      { 
        location: gameState.worldState.currentLocation, 
        diceRolls: narratorResponse.diceRolls,
        executedTools: narratorResponse.executedTools 
      }
    );

    // Atualizar sumário do mundo de forma leve
    this.gameStateManager.updateWorldState(campaignId, {
      statusSummary: `Último turno (${currentTurn}): ${playerActionText.slice(0, 60)}`,
    });

    const updatedGameState = this.gameStateManager.getGameState(campaignId)!;

    // 7. Memory Extractor analisa o turno concluído de forma assíncrona/não-bloqueante
    // A resposta narrativa já está pronta e gravada; a extração de memória roda sem bloquear a entrega ao jogador.
    this.processPostTurnMemoryExtraction(
      campaignId,
      currentTurn,
      gameState,
      playerActionText,
      narratorResponse,
      masterMessage.id
    ).catch((err) => {
      console.warn(`[GameEngine] Extração de memória em segundo plano falhou no turno ${currentTurn}:`, err);
    });

    return {
      playerMessage,
      masterMessage,
      gameState: updatedGameState,
      turn: currentTurn,
      campaignId,
    };
  }

  async retryLastPlayerAction(campaignId: string): Promise<ProcessActionOutput> {
    const gameState = this.gameStateManager.getGameState(campaignId);
    if (!gameState) throw new Error('Campanha não encontrada.');

    const recentMessages = await this.memoryManager.getRecentMessages(campaignId, 12);
    
    if (recentMessages.length === 0) {
      throw new Error('Nenhuma mensagem encontrada para repetir.');
    }

    // Caso 1: Apenas mensagem de abertura (Turno 0)
    const isOnlyOpening = recentMessages.length === 1 && recentMessages[0].role === 'assistant' && (recentMessages[0].turn === 0 || !recentMessages[0].turn);
    if (isOnlyOpening || (recentMessages.length === 1 && recentMessages[0].role === 'assistant')) {
      const openingMessage = recentMessages[0];
      const initialOpeningId = openingMessage.id;
      const initialOpeningContent = openingMessage.content;
      const initialOpeningTurn = openingMessage.turn || 0;

      // 1. NÃO remover a mensagem de abertura anterior antes da geração
      const systemInstructions = getSystemInstructions(
        gameState.foundation.rulesOfUniverse,
        gameState.foundation.tone || gameState.foundation.masterTone,
        {
          responseLength: gameState.foundation.masterResponseLength,
          pacing: gameState.foundation.masterPacing,
          descriptionLevel: gameState.foundation.masterDescriptionLevel,
          focus: gameState.foundation.masterFocus,
        }
      );

      // 2. Chamar Narrador (se falhar, o erro propaga e a abertura anterior fica intacta)
      const narratorResponse = await this.narratorService.generateOpeningMessage({
        campaignId,
        memoryManager: this.memoryManager,
        gameStateManager: this.gameStateManager,
        systemInstructions,
        campaignFoundation: gameState.foundation,
        worldState: gameState.worldState,
        player: gameState.player,
        currentUserInput: '',
        recentMessages: [],
      });

      if (!narratorResponse || !narratorResponse.text) {
        throw new Error('Falha ao gerar nova mensagem de abertura.');
      }

      // 3. Conferir se houve conflito antes da substituição
      const freshMessages = await this.memoryManager.getRecentMessages(campaignId, 12);
      const stillOpening = freshMessages.find((m) => m.id === initialOpeningId);
      if (!stillOpening || stillOpening.content !== initialOpeningContent || (stillOpening.turn || 0) !== initialOpeningTurn || freshMessages.length !== 1) {
        throw new Error('Conflito detectado: a mensagem de abertura foi alterada ou o histórico avançou durante a geração.');
      }

      // 4. Substituir atomicamente preservando o ID original
      const replacementMessage: ChatMessage = {
        id: initialOpeningId,
        role: 'assistant',
        content: narratorResponse.text,
        turn: 0,
        timestamp: Date.now(),
        metadata: {
          ...openingMessage.metadata,
          location: gameState.worldState.currentLocation,
          diceRolls: narratorResponse.diceRolls || [],
          executedTools: narratorResponse.executedTools || [],
        },
      };

      const persistedOpeningMessage = await this.memoryManager.replaceMessage(
        campaignId,
        initialOpeningId,
        replacementMessage
      );

      return {
        playerMessage: {
          id: `player_init_${campaignId}`,
          role: 'user',
          content: '',
          turn: 0,
          timestamp: Date.now(),
        },
        masterMessage: persistedOpeningMessage,
        gameState,
        turn: 0,
        campaignId,
      };
    }

    // Caso 2: Turno com ação do jogador
    const lastMessage = recentMessages[recentMessages.length - 1];
    let prevUserMessage: ChatMessage | undefined;
    let assistantMessageToReplace: ChatMessage | null = null;

    if (lastMessage.role === 'assistant') {
      if (lastMessage.metadata?.hasMutations) {
        throw new Error('Não é possível repetir este turno. Mudanças de estado irreversíveis já foram consolidadas pelo Game Engine.');
      }
      assistantMessageToReplace = lastMessage;
      // Encontrar a mensagem do usuário correspondente
      for (let i = recentMessages.length - 2; i >= 0; i--) {
        if (recentMessages[i].role === 'user') {
          prevUserMessage = recentMessages[i];
          break;
        }
      }
    } else if (lastMessage.role === 'user') {
      // O jogador enviou a mensagem mas a resposta do narrador não foi concluída
      prevUserMessage = lastMessage;
    }

    if (!prevUserMessage) {
      throw new Error('Nenhuma ação anterior do jogador foi encontrada para repetir.');
    }

    // 1. Guardar snapshots do estado inicial para verificação estrita de conflito
    const initialAssistantId = assistantMessageToReplace ? assistantMessageToReplace.id : null;
    const initialAssistantContent = assistantMessageToReplace ? assistantMessageToReplace.content : null;
    const initialAssistantTurn = assistantMessageToReplace ? assistantMessageToReplace.turn : null;
    const initialUserId = prevUserMessage.id;
    const initialUserContent = prevUserMessage.content;
    const playerActionText = prevUserMessage.content;
    const currentTurn = prevUserMessage.turn || gameState.turn || 1;

    // 2. Excluir a resposta substituída apenas da cópia temporária do contexto enviada ao Narrador
    const contextRecentMessages = assistantMessageToReplace
      ? recentMessages.filter((m) => m.id !== assistantMessageToReplace!.id)
      : [...recentMessages];

    const relevantContext = await this.memoryManager.getRelevantContext({
      campaignId,
      currentLocation: gameState.worldState.currentLocation,
      presentNPCs: gameState.npcs.map((n) => n.name),
      conversationSubject: playerActionText,
      playerCharacter: gameState.player.name,
      targetCharacter: 'narrator',
    });

    const systemInstructions = getSystemInstructions(
      gameState.foundation.rulesOfUniverse,
      gameState.foundation.tone || gameState.foundation.masterTone,
      {
        responseLength: gameState.foundation.masterResponseLength,
        pacing: gameState.foundation.masterPacing,
        descriptionLevel: gameState.foundation.masterDescriptionLevel,
        focus: gameState.foundation.masterFocus,
      }
    );

    // Preservar cache de ferramentas da mensagem anterior
    const turnExecutionCache = new Map<string, any>();
    if (assistantMessageToReplace?.metadata?.executedTools) {
      for (const tool of assistantMessageToReplace.metadata.executedTools) {
        if (tool.name && tool.result) {
          const cacheKey = `${tool.name}:${JSON.stringify(tool.args || {}, Object.keys(tool.args || {}).sort())}`;
          turnExecutionCache.set(cacheKey, tool.result);
        }
      }
    }

    // 3. Chamar o Narrador para gerar a nova resposta
    // Se o Narrador falhar, a resposta anterior continua salva e válida no store
    const narratorResponse = await this.narratorService.generateMasterResponse({
      campaignId,
      memoryManager: this.memoryManager,
      gameStateManager: this.gameStateManager,
      systemInstructions,
      campaignFoundation: gameState.foundation,
      worldState: gameState.worldState,
      player: gameState.player,
      activeNpcs: gameState.npcs,
      activeQuests: gameState.quests,
      keyInventoryItems: gameState.inventory.items,
      relevantContextOutput: relevantContext,
      relevantContextSummary: relevantContext.formattedSummary,
      recentMessages: contextRecentMessages,
      currentUserInput: playerActionText,
      turnExecutionCache,
    });

    if (!narratorResponse || !narratorResponse.text) {
      throw new Error('Falha ao gerar resposta do Mestre.');
    }

    // 4. Conferir conflitos antes da substituição
    const freshRecentMessages = await this.memoryManager.getRecentMessages(campaignId, 12);
    const freshUserMessage = freshRecentMessages.find((m) => m.id === initialUserId);
    if (!freshUserMessage || freshUserMessage.content !== initialUserContent) {
      throw new Error('Conflito detectado: a ação do jogador foi alterada ou removida durante a geração.');
    }

    if (assistantMessageToReplace) {
      const freshAssistant = freshRecentMessages.find((m) => m.id === initialAssistantId);
      if (!freshAssistant) {
        throw new Error('Conflito detectado: a resposta anterior foi removida por outra operação.');
      }
      if (freshAssistant.content !== initialAssistantContent || freshAssistant.turn !== initialAssistantTurn) {
        throw new Error('Conflito detectado: a resposta anterior foi modificada durante a geração.');
      }
      if (freshAssistant.metadata?.hasMutations) {
        throw new Error('Conflito detectado: o estado foi consolidado durante a geração e não pode mais ser repetido.');
      }
      const lastFresh = freshRecentMessages[freshRecentMessages.length - 1];
      if (lastFresh.id !== initialAssistantId) {
        throw new Error('Conflito detectado: novas mensagens foram inseridas no histórico durante a geração.');
      }
    } else {
      const lastFresh = freshRecentMessages[freshRecentMessages.length - 1];
      if (lastFresh.id !== initialUserId) {
        throw new Error('Conflito detectado: uma resposta já foi adicionada ao histórico durante a geração.');
      }
    }

    // 5. Preservar metadados autoritativos e D20 resolvidos
    const preservedDiceRolls = (narratorResponse.diceRolls && narratorResponse.diceRolls.length > 0)
      ? narratorResponse.diceRolls
      : (assistantMessageToReplace?.metadata?.diceRolls || []);

    const updatedMetadata = {
      ...(assistantMessageToReplace?.metadata || {}),
      location: gameState.worldState.currentLocation,
      diceRolls: preservedDiceRolls,
      executedTools: (narratorResponse.executedTools && narratorResponse.executedTools.length > 0)
        ? narratorResponse.executedTools
        : (assistantMessageToReplace?.metadata?.executedTools || []),
    };

    let persistedMasterMessage: ChatMessage;

    if (assistantMessageToReplace) {
      // Substituição segura preservando ID e posição
      const replacementMessage: ChatMessage = {
        id: assistantMessageToReplace.id,
        role: 'assistant',
        content: narratorResponse.text,
        turn: currentTurn,
        timestamp: Date.now(),
        metadata: updatedMetadata,
      };

      persistedMasterMessage = await this.memoryManager.replaceMessage(
        campaignId,
        assistantMessageToReplace.id,
        replacementMessage
      );
    } else {
      // Ação sem resposta anterior: gravar nova mensagem
      persistedMasterMessage = await this.memoryManager.recordMessage(
        campaignId,
        'assistant',
        narratorResponse.text,
        currentTurn,
        updatedMetadata
      );
    }

    // 6. Memory Extractor analisa o turno concluído SOMENTE após a substituição bem-sucedida
    this.processPostTurnMemoryExtraction(
      campaignId,
      currentTurn,
      gameState,
      playerActionText,
      narratorResponse,
      persistedMasterMessage.id
    ).catch((err) => {
      console.warn(`[GameEngine] Extração de memória falhou no retry do turno ${currentTurn}:`, err);
    });

    return {
      playerMessage: prevUserMessage,
      masterMessage: persistedMasterMessage,
      gameState,
      turn: currentTurn,
      campaignId,
    };
  }

  async editLastPlayerAction(campaignId: string, newPlayerActionText: string): Promise<ProcessActionOutput> {
    const gameState = this.gameStateManager.getGameState(campaignId);
    if (!gameState) throw new Error('Campanha não encontrada.');

    const recentMessages = await this.memoryManager.getRecentMessages(campaignId, 12);
    
    if (recentMessages.length === 0) {
      throw new Error('Nenhuma mensagem encontrada para editar.');
    }

    const lastMessage = recentMessages[recentMessages.length - 1];
    let prevUserMessage: ChatMessage | undefined;
    let assistantMessageToDelete: ChatMessage | null = null;

    if (lastMessage.role === 'assistant') {
      if (lastMessage.metadata?.hasMutations) {
        throw new Error('Não é possível editar esta ação. Mudanças de estado irreversíveis já foram consolidadas pelo Game Engine.');
      }
      if (lastMessage.metadata?.diceRolls && lastMessage.metadata.diceRolls.length > 0) {
        throw new Error('Ação já resolveu rolagens de dados (D20) que não podem ser recalculadas com segurança.');
      }
      assistantMessageToDelete = lastMessage;
      // Encontrar a mensagem do usuário correspondente
      for (let i = recentMessages.length - 2; i >= 0; i--) {
        if (recentMessages[i].role === 'user') {
          prevUserMessage = recentMessages[i];
          break;
        }
      }
    } else if (lastMessage.role === 'user') {
      prevUserMessage = lastMessage;
    }

    if (!prevUserMessage) {
      throw new Error('Nenhuma ação anterior do jogador foi encontrada para editar.');
    }

    // Update the player message in memory
    await this.memoryManager.updateMessage(campaignId, prevUserMessage.id, {
      content: newPlayerActionText
    });
    const updatedUserMessage = { ...prevUserMessage, content: newPlayerActionText };

    if (assistantMessageToDelete) {
      await this.memoryManager.deleteMessage(campaignId, assistantMessageToDelete.id);
    }
    
    const currentTurn = prevUserMessage.turn || gameState.turn || 1;

    // Use the same context gathering as processPlayerAction
    const relevantContext = await this.memoryManager.getRelevantContext({
      campaignId,
      currentLocation: gameState.worldState.currentLocation,
      presentNPCs: gameState.npcs.map((n) => n.name),
      conversationSubject: newPlayerActionText,
      playerCharacter: gameState.player.name,
      targetCharacter: 'narrator',
    });

    // Get recent messages again (without the deleted master message)
    const newRecentMessages = await this.memoryManager.getRecentMessages(campaignId, 12);
    const systemInstructions = getSystemInstructions(
      gameState.foundation.rulesOfUniverse,
      gameState.foundation.tone || gameState.foundation.masterTone,
      {
        responseLength: gameState.foundation.masterResponseLength,
        pacing: gameState.foundation.masterPacing,
        descriptionLevel: gameState.foundation.masterDescriptionLevel,
        focus: gameState.foundation.masterFocus,
      }
    );

    // Call Narrator
    const narratorResponse = await this.narratorService.generateMasterResponse({
      campaignId,
      memoryManager: this.memoryManager,
      gameStateManager: this.gameStateManager,
      systemInstructions,
      campaignFoundation: gameState.foundation,
      worldState: gameState.worldState,
      player: gameState.player,
      activeNpcs: gameState.npcs,
      activeQuests: gameState.quests,
      keyInventoryItems: gameState.inventory.items,
      relevantContextOutput: relevantContext,
      relevantContextSummary: relevantContext.formattedSummary,
      recentMessages: newRecentMessages,
      currentUserInput: newPlayerActionText,
    });

    const masterMessage = await this.memoryManager.recordMessage(
      campaignId,
      'assistant',
      narratorResponse.text,
      currentTurn,
      { 
        location: gameState.worldState.currentLocation,
        diceRolls: narratorResponse.diceRolls,
        executedTools: narratorResponse.executedTools
      }
    );

    // Memory Extractor analyzes the edited turn asynchronously
    this.processPostTurnMemoryExtraction(
      campaignId,
      currentTurn,
      gameState,
      newPlayerActionText,
      narratorResponse,
      masterMessage.id
    ).catch((err) => {
      console.warn(`[GameEngine] Extração de memória falhou no edit do turno ${currentTurn}:`, err);
    });

    return {
      playerMessage: updatedUserMessage,
      masterMessage,
      gameState,
      turn: currentTurn,
      campaignId,
    };
  }

  /**
   * Executa a extração e validação de memória pós-turno com proteção e sem prender a thread de resposta
   */
  private async processPostTurnMemoryExtraction(
    campaignId: string,
    currentTurn: number,
    gameState: GameState,
    playerActionText: string,
    narratorResponse: { executedTools?: any[]; diceRolls?: any[]; text: string },
    masterMessageId: string
  ): Promise<void> {
    try {
      const turnSnapshot = await this.memoryManager.getSnapshot(campaignId);

      const memoryChanges = await extractMemoryChanges({
        campaignId,
        turn: currentTurn,
        previousState: {
          snapshot: turnSnapshot,
          npcs: Object.values(turnSnapshot?.npcs || {}),
          worldState: gameState.worldState,
          inventory: turnSnapshot?.inventory || [],
          quests: turnSnapshot?.quests || [],
          relationships: turnSnapshot?.relationships || [],
          knowledge: turnSnapshot?.knowledge || [],
          events: turnSnapshot?.events || [],
        },
        playerAction: playerActionText,
        toolsCalled: narratorResponse.executedTools,
        diceRolls: narratorResponse.diceRolls,
        finalNarrative: narratorResponse.text,
        involvedNpcs: gameState.npcs.map((n) => n.name),
        currentLocation: gameState.worldState.currentLocation,
        recentEvents: turnSnapshot?.events?.slice(-5) || [],
      });

      // Validar e aplicar mudanças autorizadas
      const validated = await MemoryValidator.validateAndApply(
        campaignId,
        memoryChanges,
        this.memoryManager,
        currentTurn
      );

      const hasMutations = 
        validated.validEvents.some((e: any) => e.consequences && e.consequences.length > 0) ||
        validated.validKnowledge.length > 0 ||
        validated.validRelationships.length > 0 ||
        validated.validInventoryChanges.length > 0 ||
        validated.validQuests.length > 0 ||
        validated.validNPCUpdates.length > 0;

      if (hasMutations) {
        await this.memoryManager.updateMessage(campaignId, masterMessageId, {
          metadata: { hasMutations: true }
        });
      }

    } catch (extractErr) {
      console.error(`[GameEngine] Falha ao extrair/validar memória pós-turno ${currentTurn}:`, extractErr);
    }
  }

  /**
   * Recupera o estado atual completo da campanha para sincronização do frontend.
   */
  async getCampaignDetails(campaignId: string): Promise<{
    gameState: GameState | null;
    messages: ChatMessage[];
  }> {
    const gameState = this.gameStateManager.getGameState(campaignId);
    const messages = await this.memoryManager.getRecentMessages(campaignId, 100);

    return {
      gameState,
      messages,
    };
  }

  /**
   * Recupera a lista de todas as campanhas persistidas no servidor.
   */
  listAllCampaigns() {
    return this.gameStateManager.listAllCampaigns();
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    // 1. Apagar do GameState (disk & memory)
    this.gameStateManager.deleteCampaign(campaignId);
    // 2. Apagar do MemoryManager (histórico, snap, extrações)
    await this.memoryManager.clearCampaignData(campaignId);
  }

  /**
   * Retorna o status de integridade dos subsistemas da Engine.
   */
  getStatus(): EngineStatus {
    const apiKey = process.env.GEMINI_API_KEY;
    const isApiKeyConfigured = Boolean(apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY');
    const activeCampaigns = this.gameStateManager.listAllCampaigns();

    return {
      activeCampaignsCount: activeCampaigns.length,
      memoryStoreType: 'FilePersistentMemoryStore (Persistência modular JSON em disco no backend)',
      narratorModel: 'gemini-3.8-flash (Prioridade) / gemini-3.7-flash / gemini-3.1-flash-lite',
      isApiKeyConfigured,
    };
  }
}

// Instância singleton da Game Engine para a aplicação
export const gameEngine = new GameEngine();

