/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { GameState, CampaignFoundation, WorldState } from './types';
import { PlayerCharacter } from '../characters/types';

export interface CreateCampaignParams {
  campaignId?: string;
  title?: string;
  genre?: string;
  premise?: string;
  tone?: string;
  rulesOfUniverse?: string;
  worldDetails?: {
    identityAndState?: string;
    geography?: string;
    everydayLife?: string;
    magicAndTechnology?: string;
    economyAndLogistics?: string;
    factionsAndPower?: string;
    dangersAndOpportunities?: string;
    currentEvents?: string;
  };
  startingLocation?: string;
  campaignFormat?: 'sandbox' | 'focused';
  playerName?: string;
  playerArchetype?: string;
  playerDescription?: string;
  playerBackstory?: string;
  charAge?: string;
  charPronouns?: string;
  charConcept?: string;
  charAppearance?: string;
  charFeatures?: string;
  charOrigin?: string;
  charOccupation?: string;
  charRoutine?: string;
  charRelationships?: string;
  charGoals?: string;
  charStats?: string;
  charEquipment?: string;
  experienceType?: string;
  customExperienceText?: string;
  mechanicalProfile?: string;
  customMechanicalText?: string;
  masterResponseLength?: string;
  masterPacing?: string;
  masterDescriptionLevel?: string;
  masterFocus?: string;
  masterTone?: string;
}

export class GameStateManager {
  private activeStates: Map<string, GameState> = new Map();
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data', 'rpg_gamestate');
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (err) {
      console.error('[GameStateManager] Erro ao criar diretório de gamestate:', err);
    }
  }

  private getStateFilePath(campaignId: string): string {
    const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.dataDir, `gamestate_${safeId}.json`);
  }

  /**
   * Cria uma nova campanha inicial com fundação estruturada.
   */
  public createCampaign(params: CreateCampaignParams = {}): GameState {
    const campaignId = params.campaignId || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const format = params.campaignFormat || 'sandbox';
    const defaultMechProfile = format === 'focused' ? 'FOCUSED_REALISM' : 'SANDBOX_D20';

    const foundation: CampaignFoundation = {
      id: `found_${Date.now()}`,
      title: params.title || '',
      genre: params.genre || '',
      premise: params.premise || '',
      tone: params.tone || '',
      rulesOfUniverse: params.rulesOfUniverse || '',
      worldDetails: params.worldDetails,
      startingLocation: params.startingLocation || '',
      createdAt: Date.now(),
      campaignFormat: format,
      experienceType: params.experienceType,
      customExperienceText: params.customExperienceText,
      mechanicalProfile: params.mechanicalProfile || defaultMechProfile,
      customMechanicalText: params.customMechanicalText,
      masterResponseLength: params.masterResponseLength,
      masterPacing: params.masterPacing,
      masterDescriptionLevel: params.masterDescriptionLevel,
      masterFocus: params.masterFocus,
      masterTone: params.masterTone,
    };

    const worldState: WorldState = {
      currentLocation: foundation.startingLocation,
      timeOfDay: '',
      weather: '',
      tensionLevel: 'calm',
      statusSummary: '',
    };

    const player: PlayerCharacter = {
      id: `char_player_${Date.now()}`,
      name: params.playerName || '',
      role: 'player',
      archetype: params.playerArchetype || '',
      description: params.playerDescription || '',
      personality: '',
      backstory: params.playerBackstory || '',
      age: params.charAge,
      pronouns: params.charPronouns,
      concept: params.charConcept,
      appearance: params.charAppearance,
      features: params.charFeatures,
      origin: params.charOrigin,
      occupation: params.charOccupation,
      routine: params.charRoutine,
      relationshipsText: params.charRelationships,
      statsText: params.charStats,
      equipmentText: params.charEquipment,
      goals: params.charGoals ? [params.charGoals] : [],
      status: 'alive',
      attributes: {},
    };

    const initialGameState: GameState = {
      campaignId,
      turn: 0,
      foundation,
      worldState,
      player,
      npcs: [],
      inventory: {
        characterId: player.id,
        items: [],
        currency: {},
      },
      quests: [],
      recentEvents: [],
      knowledgeBase: [],
      relationships: [],
      factions: [],
      updatedAt: Date.now(),
    };

    this.activeStates.set(campaignId, initialGameState);
    this.persistToDisk(initialGameState);
    return initialGameState;
  }

  public getGameState(campaignId: string): GameState | null {
    if (!campaignId) return null;
    
    // 1. Tenta pegar do cache em memória
    if (this.activeStates.has(campaignId)) {
      return this.activeStates.get(campaignId)!;
    }

    // 2. Tenta carregar do disco
    const filePath = this.getStateFilePath(campaignId);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const state: GameState = JSON.parse(raw);
        this.activeStates.set(campaignId, state);
        return state;
      }
    } catch (err) {
      console.warn(`[GameStateManager] Falha ao ler gamestate do disco para ${campaignId}:`, err);
    }

    return null;
  }

  public saveGameState(state: GameState): void {
    state.updatedAt = Date.now();
    this.activeStates.set(state.campaignId, state);
    this.persistToDisk(state);
  }

  private persistToDisk(state: GameState): void {
    try {
      this.ensureDataDir();
      const filePath = this.getStateFilePath(state.campaignId);
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[GameStateManager] Falha ao persistir gamestate ${state.campaignId}:`, err);
    }
  }

  public advanceTurn(campaignId: string): number {
    const state = this.getGameState(campaignId);
    if (!state) return 0;
    state.turn += 1;
    state.updatedAt = Date.now();
    this.saveGameState(state);
    return state.turn;
  }

  public updateWorldState(campaignId: string, update: Partial<WorldState>): WorldState | null {
    const state = this.getGameState(campaignId);
    if (!state) return null;
    state.worldState = { ...state.worldState, ...update };
    state.updatedAt = Date.now();
    this.saveGameState(state);
    return state.worldState;
  }

  public updateCampaignFoundation(campaignId: string, update: Partial<CampaignFoundation>): CampaignFoundation | null {
    const state = this.getGameState(campaignId);
    if (!state) return null;
    state.foundation = { ...state.foundation, ...update };
    state.updatedAt = Date.now();
    this.saveGameState(state);
    return state.foundation;
  }

  public upsertNPC(campaignId: string, npcData: any): void {
    const state = this.getGameState(campaignId);
    if (!state) return;
    const index = state.npcs.findIndex((n) => n.id === npcData.id || n.name.toLowerCase() === npcData.name?.toLowerCase());
    if (index >= 0) {
      state.npcs[index] = { ...state.npcs[index], ...npcData };
    } else {
      state.npcs.push(npcData);
    }
    state.updatedAt = Date.now();
    this.saveGameState(state);
  }

  public upsertQuest(campaignId: string, questData: any): void {
    const state = this.getGameState(campaignId);
    if (!state) return;
    const index = state.quests.findIndex((q) => q.id === questData.id || q.title.toLowerCase() === questData.title?.toLowerCase());
    if (index >= 0) {
      state.quests[index] = { ...state.quests[index], ...questData };
    } else {
      state.quests.push(questData);
    }
    state.updatedAt = Date.now();
    this.saveGameState(state);
  }

  public deleteCampaign(campaignId: string): boolean {
    this.activeStates.delete(campaignId);
    try {
      const filePath = this.getStateFilePath(campaignId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // ignore
    }
    return true;
  }

  /**
   * Lista todas as campanhas salvas (do cache e dos arquivos em disco).
   */
  public listAllCampaigns(): Array<{
    id: string;
    title: string;
    location?: string;
    lastPlayed: number;
    turnCount: number;
    genre?: string;
    playerName?: string;
  }> {
    const campaignsMap = new Map<string, {
      id: string;
      title: string;
      location?: string;
      lastPlayed: number;
      turnCount: number;
      genre?: string;
      playerName?: string;
    }>();

    // 1. Coleta do cache ativo
    for (const [id, state] of this.activeStates.entries()) {
      campaignsMap.set(id, {
        id,
        title: state.foundation?.title || `Campanha #${id.slice(-4)}`,
        location: state.worldState?.currentLocation || 'Mundo Aberto',
        lastPlayed: state.updatedAt || Date.now(),
        turnCount: state.turn || 0,
        genre: state.foundation?.genre,
        playerName: state.player?.name,
      });
    }

    // 2. Coleta dos arquivos em disco
    try {
      this.ensureDataDir();
      if (fs.existsSync(this.dataDir)) {
        const files = fs.readdirSync(this.dataDir);
        for (const file of files) {
          if (file.startsWith('gamestate_') && file.endsWith('.json')) {
            const raw = fs.readFileSync(path.join(this.dataDir, file), 'utf-8');
            try {
              const state: GameState = JSON.parse(raw);
              if (state && state.campaignId) {
                const existing = campaignsMap.get(state.campaignId);
                const lastPlayed = Math.max(state.updatedAt || 0, existing?.lastPlayed || 0, Date.now());
                campaignsMap.set(state.campaignId, {
                  id: state.campaignId,
                  title: state.foundation?.title || `Campanha #${state.campaignId.slice(-4)}`,
                  location: state.worldState?.currentLocation || 'Mundo Aberto',
                  lastPlayed: state.updatedAt || lastPlayed,
                  turnCount: state.turn || 0,
                  genre: state.foundation?.genre,
                  playerName: state.player?.name,
                });
              }
            } catch {
              // Ignore corrupt JSON
            }
          }
        }
      }
    } catch (err) {
      console.warn('[GameStateManager] Falha ao listar campanhas do disco:', err);
    }

    return Array.from(campaignsMap.values()).sort((a, b) => b.lastPlayed - a.lastPlayed);
  }
}

