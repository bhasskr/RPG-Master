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

function cloneGameState<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
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

  private persistStateAtomic(workingCopy: GameState): void {
    this.ensureDataDir();
    const filePath = this.getStateFilePath(workingCopy.campaignId);
    const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const serialized = JSON.stringify(workingCopy, null, 2);

    try {
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {
        // ignora se tempPath não existe
      }
      console.error(`[GameStateManager] Falha ao persistir gamestate ${workingCopy.campaignId}:`, err);
      throw err;
    }
  }

  /**
   * Cria uma nova campanha inicial com fundação estruturada.
   * Persiste no disco primeiro; somente após o sucesso registra no cache em memória.
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

    const workingCopy = cloneGameState(initialGameState);
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(campaignId, cloneGameState(workingCopy));
    return cloneGameState(workingCopy);
  }

  public getGameState(campaignId: string): GameState | null {
    if (!campaignId) return null;
    
    // 1. Tenta pegar do cache em memória (retorna clone isolado)
    if (this.activeStates.has(campaignId)) {
      return cloneGameState(this.activeStates.get(campaignId)!);
    }

    // 2. Tenta carregar do disco
    const filePath = this.getStateFilePath(campaignId);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const state: GameState = JSON.parse(raw);
        this.activeStates.set(campaignId, cloneGameState(state));
        return cloneGameState(state);
      }
    } catch (err) {
      console.warn(`[GameStateManager] Falha ao ler gamestate do disco para ${campaignId}:`, err);
    }

    return null;
  }

  public saveGameState(state: GameState): void {
    const workingCopy = cloneGameState(state);
    workingCopy.updatedAt = Date.now();
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(workingCopy.campaignId, cloneGameState(workingCopy));
  }

  public advanceTurn(campaignId: string): number {
    const current = this.getGameState(campaignId);
    if (!current) return 0;
    const workingCopy = cloneGameState(current);
    workingCopy.turn += 1;
    workingCopy.updatedAt = Date.now();
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(campaignId, cloneGameState(workingCopy));
    return workingCopy.turn;
  }

  public updateWorldState(campaignId: string, update: Partial<WorldState>): WorldState | null {
    const current = this.getGameState(campaignId);
    if (!current) return null;
    const workingCopy = cloneGameState(current);
    workingCopy.worldState = { ...workingCopy.worldState, ...cloneGameState(update) };
    workingCopy.updatedAt = Date.now();
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(campaignId, cloneGameState(workingCopy));
    return cloneGameState(workingCopy.worldState);
  }

  public updateCampaignFoundation(campaignId: string, update: Partial<CampaignFoundation>): CampaignFoundation | null {
    const current = this.getGameState(campaignId);
    if (!current) return null;
    const workingCopy = cloneGameState(current);
    workingCopy.foundation = { ...workingCopy.foundation, ...cloneGameState(update) };
    workingCopy.updatedAt = Date.now();
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(campaignId, cloneGameState(workingCopy));
    return cloneGameState(workingCopy.foundation);
  }

  public upsertNPC(campaignId: string, npcData: any): void {
    const current = this.getGameState(campaignId);
    if (!current) return;
    const workingCopy = cloneGameState(current);
    const clonedNpc = cloneGameState(npcData);
    const index = workingCopy.npcs.findIndex((n) => n.id === clonedNpc.id || (clonedNpc.name && n.name?.toLowerCase() === clonedNpc.name?.toLowerCase()));
    if (index >= 0) {
      workingCopy.npcs[index] = { ...workingCopy.npcs[index], ...clonedNpc };
    } else {
      workingCopy.npcs.push(clonedNpc);
    }
    workingCopy.updatedAt = Date.now();
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(campaignId, cloneGameState(workingCopy));
  }

  public upsertQuest(campaignId: string, questData: any): void {
    const current = this.getGameState(campaignId);
    if (!current) return;
    const workingCopy = cloneGameState(current);
    const clonedQuest = cloneGameState(questData);
    const index = workingCopy.quests.findIndex((q) => q.id === clonedQuest.id || (clonedQuest.title && q.title?.toLowerCase() === clonedQuest.title?.toLowerCase()));
    if (index >= 0) {
      workingCopy.quests[index] = { ...workingCopy.quests[index], ...clonedQuest };
    } else {
      workingCopy.quests.push(clonedQuest);
    }
    workingCopy.updatedAt = Date.now();
    this.persistStateAtomic(workingCopy);
    this.activeStates.set(campaignId, cloneGameState(workingCopy));
  }

  public deleteCampaign(campaignId: string): boolean {
    const filePath = this.getStateFilePath(campaignId);
    try {
      fs.unlinkSync(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // ENOENT: o arquivo já não existe no disco, estado já removido
      } else {
        console.error(`[GameStateManager] Erro ao deletar gamestate ${campaignId}:`, err);
        throw err;
      }
    }
    this.activeStates.delete(campaignId);
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

