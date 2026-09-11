import { GameStateManager } from '../gameState/gameStateManager';
import { MemoryManager } from '../memory/memoryManager';
import { NarratorService } from '../narrator/narratorService';
import { getSystemInstructions } from '../narrator/systemInstructions';
import { ChatMessage } from '../memory/types';
import { detectAndProcessKnowledgeAcquisition } from '../memory/knowledgeAcquisition';
import { extractMemoryChanges } from '../memory/extractor/memoryExtractor';
import { MemoryValidator } from '../memory/extractor/memoryValidator';
import {
  MemoryExtractionResult,
  ValidatedMemoryChanges,
  TurnContext as ExtractionTurnContext,
} from '../memory/extractor/types';
import { GameState } from '../gameState/types';

export interface PendingMemoryExtractionRecord {
  campaignId: string;
  turnId: number;
  turnContext: ExtractionTurnContext;
  failedAt: number;
  error?: string;
}

export interface TurnContext {
  turnId: number;
  campaignId: string;
  playerAction: string;
  currentLocation: string;
  playerCharacter: string;
  presentNPCs: string[];
  conversationSubject: string;
  retrievedContext: any;
  toolCalls: any[];
  diceResults: any[];
  narrativeResponse: string;
  proposedMemoryChanges?: MemoryExtractionResult;
  validatedMemoryChanges?: ValidatedMemoryChanges;
}

export interface ProcessTurnOutput {
  narrativeResponse: string;
  turnId: number;
  contextSummary: string;
  toolCalls: any[];
  diceResults: any[];
  memoryChanges?: MemoryExtractionResult;
  validationResults?: ValidatedMemoryChanges;
  gameState: GameState;
  pendingMemoryExtraction?: boolean;
}

export class TurnProcessor {
  private pendingExtractions: Map<string, Map<number, PendingMemoryExtractionRecord>> = new Map();
  private processedExtractions: Map<string, Set<number>> = new Map();

  constructor(
    public memoryManager: MemoryManager,
    public gameStateManager: GameStateManager,
    public narratorService: NarratorService
  ) {}

  public markPendingMemoryExtraction(
    campaignId: string,
    turnId: number,
    context: ExtractionTurnContext,
    error?: any
  ): void {
    if (!this.pendingExtractions.has(campaignId)) {
      this.pendingExtractions.set(campaignId, new Map());
    }
    this.pendingExtractions.get(campaignId)!.set(turnId, {
      campaignId,
      turnId,
      turnContext: context,
      failedAt: Date.now(),
      error: error ? String(error.message || error) : undefined,
    });
    console.log(`[TurnProcessor] Turno ${turnId} marcado como pendingMemoryExtraction para campanha ${campaignId}`);
  }

  public clearPendingMemoryExtraction(campaignId: string, turnId: number): void {
    const campaignPending = this.pendingExtractions.get(campaignId);
    if (campaignPending) {
      campaignPending.delete(turnId);
    }
  }

  public isTurnPendingExtraction(campaignId: string, turnId: number): boolean {
    const campaignPending = this.pendingExtractions.get(campaignId);
    return Boolean(campaignPending?.has(turnId));
  }

  public getPendingExtractions(campaignId: string): PendingMemoryExtractionRecord[] {
    const campaignPending = this.pendingExtractions.get(campaignId);
    if (!campaignPending) return [];
    return Array.from(campaignPending.values());
  }

  public async retryPendingExtraction(
    campaignId: string,
    turnId: number,
    extractorFn?: (ctx: ExtractionTurnContext) => Promise<MemoryExtractionResult>
  ): Promise<{
    success: boolean;
    turnId: number;
    memoryChanges?: MemoryExtractionResult;
    validationResults?: ValidatedMemoryChanges;
    error?: string;
    alreadyProcessed?: boolean;
  }> {
    const campaignPending = this.pendingExtractions.get(campaignId);
    const pendingRecord = campaignPending?.get(turnId);

    // Se o turno já foi processado ou não está pendente, retorne sem re-executar (idempotência)
    if (!pendingRecord) {
      const processedSet = this.processedExtractions.get(campaignId);
      if (processedSet?.has(turnId)) {
        return {
          success: true,
          turnId,
          alreadyProcessed: true,
        };
      }
      return {
        success: false,
        turnId,
        error: `Nenhuma extração pendente encontrada para o turno ${turnId}`,
      };
    }

    try {
      const extract = extractorFn || extractMemoryChanges;
      console.log(`[TurnProcessor] Executando retry de extração de memória para o turno ${turnId}...`);

      // 1. Executa novamente APENAS a extração daquele turno (sem inventar nada, sem histórico completo)
      const memoryChanges = await extract(pendingRecord.turnContext);

      // 2. Passa normalmente pelo MemoryValidator antes de persistir
      const validationResults = await MemoryValidator.validateAndApply(
        campaignId,
        memoryChanges,
        this.memoryManager,
        turnId
      );

      // 3. Marca como processado para garantir idempotência em tentativas subsequentes
      if (!this.processedExtractions.has(campaignId)) {
        this.processedExtractions.set(campaignId, new Set());
      }
      this.processedExtractions.get(campaignId)!.add(turnId);

      // 4. Remove o estado pendente SOMENTE após o sucesso da validação e persistência
      this.clearPendingMemoryExtraction(campaignId, turnId);
      console.log(`[TurnProcessor] Retry do turno ${turnId} concluído com sucesso e removido de pendente.`);

      return {
        success: true,
        turnId,
        memoryChanges,
        validationResults,
      };
    } catch (err: any) {
      console.error(`[TurnProcessor] Falha no retry de extração do turno ${turnId}:`, err);
      // Mantém o estado pendente para tentativas futuras
      return {
        success: false,
        turnId,
        error: String(err?.message || err),
      };
    }
  }

  public async retryAllPendingExtractions(
    campaignId: string,
    extractorFn?: (ctx: ExtractionTurnContext) => Promise<MemoryExtractionResult>
  ): Promise<Array<{ success: boolean; turnId: number; error?: string }>> {
    const pending = this.getPendingExtractions(campaignId);
    const results: Array<{ success: boolean; turnId: number; error?: string }> = [];

    for (const record of pending) {
      const res = await this.retryPendingExtraction(campaignId, record.turnId, extractorFn);
      results.push({
        success: res.success,
        turnId: record.turnId,
        error: res.error,
      });
    }

    return results;
  }

  async processTurn(campaignId: string, playerActionText: string): Promise<ProcessTurnOutput> {
    console.log('[TurnProcessor] TURN_START');

    // 1. Initial Context Setup
    let gameState = campaignId ? this.gameStateManager.getGameState(campaignId) : null;
    if (!gameState) {
      gameState = this.gameStateManager.createCampaign();
      campaignId = gameState.campaignId;
    }

    const currentTurn = this.gameStateManager.advanceTurn(campaignId);

    // 2. Determine Location, Player, NPCs, Subject
    const currentLocation = gameState.worldState.currentLocation || 'Unknown';
    const playerCharacter = gameState.player.name || 'Jogador';
    const presentNPCs = gameState.npcs.map(n => n.name);
    const conversationSubject = playerActionText;

    const turnContext: TurnContext = {
      turnId: currentTurn,
      campaignId,
      playerAction: playerActionText,
      currentLocation,
      playerCharacter,
      presentNPCs,
      conversationSubject,
      retrievedContext: null,
      toolCalls: [],
      diceResults: [],
      narrativeResponse: '',
    };

    // 3. Record Player Message
    await this.memoryManager.recordMessage(
      campaignId,
      'user',
      playerActionText,
      currentTurn,
      { location: currentLocation }
    );

    // 4. Retrieve Deterministic + Semantic Context with Epistemic Filtering
    console.log('[TurnProcessor] CONTEXT_RETRIEVAL');
    console.log('[TurnProcessor] SEMANTIC_RETRIEVAL');
    console.log('[TurnProcessor] EPISTEMIC_FILTER');
    
    let relevantContext;
    try {
      relevantContext = await this.memoryManager.getRelevantContext({
        campaignId,
        currentLocation,
        presentNPCs,
        conversationSubject,
        playerCharacter,
        targetCharacter: presentNPCs.find(npc => conversationSubject.toLowerCase().includes(npc.toLowerCase())) || playerCharacter,
      });
    } catch (err) {
      console.error('[TurnProcessor] Semantic retrieval failed, fallback to deterministic should be inside getRelevantContext', err);
      // Fallback is handled inside memoryManager.getRelevantContext
      throw err; 
    }
    
    turnContext.retrievedContext = relevantContext;

    // 5. Build System Instructions and Call Gemini
    console.log('[TurnProcessor] GEMINI_REQUEST');
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

    if (narratorResponse.executedTools?.length) {
      console.log('[TurnProcessor] TOOL_CALL');
      console.log('[TurnProcessor] TOOL_RESULT');
    }
    if (narratorResponse.diceRolls?.length) {
      console.log('[TurnProcessor] DICE_ROLL');
    }

    turnContext.toolCalls = narratorResponse.executedTools || [];
    turnContext.diceResults = narratorResponse.diceRolls || [];
    turnContext.narrativeResponse = narratorResponse.text;

    console.log('[TurnProcessor] NARRATIVE_RESPONSE');
    
    await this.memoryManager.recordMessage(
      campaignId,
      'assistant',
      narratorResponse.text,
      currentTurn,
      { location: currentLocation }
    );

    // 6. Memory Extraction (ONLY new happenings)
    console.log('[TurnProcessor] MEMORY_EXTRACTION');
    const turnSnapshot = await this.memoryManager.getSnapshot(campaignId);
    let memoryChanges: MemoryExtractionResult | undefined;
    let validatedMemoryChanges: ValidatedMemoryChanges | undefined;
    let isPendingExtraction = false;

    const extractionTurnContext: ExtractionTurnContext = {
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
      toolsCalled: turnContext.toolCalls,
      diceRolls: turnContext.diceResults,
      finalNarrative: narratorResponse.text,
      involvedNpcs: presentNPCs,
      currentLocation,
      recentEvents: turnSnapshot?.events?.slice(-5) || [],
    };

    try {
      memoryChanges = await extractMemoryChanges(extractionTurnContext);
      turnContext.proposedMemoryChanges = memoryChanges;

      // 7. Memory Validation & Persistence
      console.log('[TurnProcessor] MEMORY_VALIDATION');
      console.log('[TurnProcessor] MEMORY_PERSISTENCE');
      validatedMemoryChanges = await MemoryValidator.validateAndApply(
        campaignId,
        memoryChanges,
        this.memoryManager,
        currentTurn
      );
      turnContext.validatedMemoryChanges = validatedMemoryChanges;

      if (!this.processedExtractions.has(campaignId)) {
        this.processedExtractions.set(campaignId, new Set());
      }
      this.processedExtractions.get(campaignId)!.add(currentTurn);
      this.clearPendingMemoryExtraction(campaignId, currentTurn);
      
    } catch (extractErr) {
      console.error('[TurnProcessor] Extraction/Validation failed, marking turn as pendingMemoryExtraction:', extractErr);
      this.markPendingMemoryExtraction(campaignId, currentTurn, extractionTurnContext, extractErr);
      isPendingExtraction = true;
      // Fails gracefully - narrative is delivered to player
    }

    // Update lightweight world state
    this.gameStateManager.updateWorldState(campaignId, {
      statusSummary: `Turno ${currentTurn} concluído.`,
    });

    console.log('[TurnProcessor] TURN_COMPLETE');

    return {
      narrativeResponse: turnContext.narrativeResponse,
      turnId: turnContext.turnId,
      contextSummary: relevantContext.formattedSummary,
      toolCalls: turnContext.toolCalls,
      diceResults: turnContext.diceResults,
      memoryChanges,
      validationResults: validatedMemoryChanges,
      gameState: this.gameStateManager.getGameState(campaignId)!,
      pendingMemoryExtraction: isPendingExtraction,
    };
  }
}
