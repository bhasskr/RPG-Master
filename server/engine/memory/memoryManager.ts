/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Campaign,
  NPC,
  Event,
  Knowledge,
  Relationship,
  RelationshipUpdates,
  InventoryItem,
  Quest,
  CampaignMemorySnapshot,
  RelevantContextParams,
  RelevantContextOutput,
  IPersistentMemoryStore,
  ChatMessage,
  MessageRole,
  MemoryOperationLog,
  CharacterKnowledgeBundle,
  ExpectedTurnState,
} from './types';
import { FilePersistentMemoryStore } from './filePersistentStore';
import { SemanticMemoryManager } from './semanticMemory';

export class MemoryManager {
  private store: IPersistentMemoryStore;
  private logs: MemoryOperationLog[] = [];
  private readonly maxLogs = 250;
  private semanticManager: SemanticMemoryManager;

  constructor(customStore?: IPersistentMemoryStore) {
    this.store = customStore || new FilePersistentMemoryStore();
    this.semanticManager = new SemanticMemoryManager();
  }

  public setStore(store: IPersistentMemoryStore) {
    this.store = store;
  }

  public getStore(): IPersistentMemoryStore {
    return this.store;
  }

  /**
   * Registra log de auditoria de operações da Memory Layer
   */
  public recordLog(logData: {
    operation: string;
    functionName: string;
    entity: string;
    campaignId: string;
    status: 'success' | 'error';
    details?: string;
    error?: string;
  }): void {
    const log: MemoryOperationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...logData,
    };
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.length = this.maxLogs;
    }
  }

  /**
   * Retorna os logs de desenvolvimento recentes
   */
  public getLogs(campaignId?: string, limit: number = 60): MemoryOperationLog[] {
    let list = this.logs;
    if (campaignId && campaignId !== '*') {
      list = list.filter((l) => l.campaignId === campaignId || l.campaignId === '*');
    }
    return list.slice(0, limit);
  }

  /**
   * Limpa os logs de operações
   */
  public clearLogs(): void {
    this.logs = [];
  }

  /**
   * Obtém o snapshot completo da campanha
   */
  public async getSnapshot(campaignId: string): Promise<CampaignMemorySnapshot | null> {
    return this.store.getSnapshot(campaignId);
  }

  /**
   * Garante que um snapshot estruturado exista para a campanha
   */
  public async getOrCreateSnapshot(campaignId: string): Promise<CampaignMemorySnapshot> {
    const existing = await this.store.getSnapshot(campaignId);
    if (existing) {
      return existing;
    }
    return await this.store.mutateSnapshot(campaignId, (snapshot) => {
      return snapshot;
    });
  }

  // =================================================================
  // 1. CAMPAIGN METHODS
  // =================================================================

  async createCampaign(data: Partial<Campaign> & { campaignId?: string } = {}): Promise<Campaign> {
    const campaignId = data.campaignId || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const campaign = await this.store.mutateSnapshot(campaignId, (snapshot) => {
        if (!snapshot.campaign.name && !snapshot.campaign.currentLocation && Object.keys(snapshot.npcs).length === 0) {
          snapshot.campaign = {
            campaignId,
            name: data.name || '',
            createdAt: data.createdAt || Date.now(),
            currentDate: data.currentDate || '',
            currentLocation: data.currentLocation || '',
          };
        } else {
          snapshot.campaign = {
            ...snapshot.campaign,
            ...data,
            campaignId,
          };
        }
        return snapshot.campaign;
      });

      this.recordLog({
        operation: 'CREATE',
        functionName: 'createCampaign',
        entity: `Campaign: ${campaign.name || campaignId}`,
        campaignId,
        status: 'success',
        details: `Criada/atualizada campanha "${campaign.name}" em "${campaign.currentLocation || 'sem local'}"`,
      });

      return campaign;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'CREATE',
        functionName: 'createCampaign',
        entity: `Campaign: ${campaignId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      const campaign = snapshot ? snapshot.campaign : null;

      this.recordLog({
        operation: 'READ',
        functionName: 'getCampaign',
        entity: `Campaign: ${campaignId}`,
        campaignId,
        status: 'success',
        details: campaign ? `Encontrada: "${campaign.name}"` : 'Registro não encontrado',
      });

      return campaign;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getCampaign',
        entity: `Campaign: ${campaignId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const campaign = await this.store.mutateSnapshot(campaignId, (snapshot) => {
        snapshot.campaign = {
          ...snapshot.campaign,
          ...updates,
          campaignId,
        };
        return snapshot.campaign;
      });

      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateCampaign',
        entity: `Campaign: ${campaign?.name || campaignId}`,
        campaignId,
        status: 'success',
        details: `Campos atualizados: ${Object.keys(updates).join(', ')}`,
      });

      return campaign;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateCampaign',
        entity: `Campaign: ${campaignId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // 2. NPC METHODS
  // =================================================================

  async createNPC(campaignId: string, npcData: Partial<NPC> & { name: string }): Promise<NPC> {
    const id = npcData.id || `npc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const npc = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const newNpc: NPC = {
          id,
          name: npcData.name || '',
          status: npcData.status || 'alive',
          location: npcData.location || '',
          faction: npcData.faction || '',
          personalityNotes: npcData.personalityNotes || '',
          goals: npcData.goals || [],
          secrets: npcData.secrets || [],
          inventory: npcData.inventory || [],
          relationships: npcData.relationships || {},
        };

        snapshot.npcs[id] = newNpc;
        await this.semanticManager.indexEntity(id, 'npc', this.semanticManager.formatNPC(newNpc), snapshot);
        return newNpc;
      });

      this.recordLog({
        operation: 'CREATE',
        functionName: 'createNPC',
        entity: `NPC: ${npc.name || id}`,
        campaignId,
        status: 'success',
        details: `Status: ${npc.status}, Local: ${npc.location || 'nenhum'}, Facção: ${npc.faction || 'nenhuma'}`,
      });

      return npc;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'CREATE',
        functionName: 'createNPC',
        entity: `NPC: ${npcData.name || id}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async getNPC(campaignId: string, npcId: string): Promise<NPC | null> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      if (!snapshot) return null;

      let npc = snapshot.npcs[npcId] || null;
      if (!npc) {
        const target = npcId.toLowerCase().trim();
        npc =
          Object.values(snapshot.npcs).find(
            (n) =>
              n.id.toLowerCase() === target ||
              n.name.toLowerCase() === target ||
              n.name.toLowerCase().includes(target)
          ) || null;
      }

      this.recordLog({
        operation: 'READ',
        functionName: 'getNPC',
        entity: `NPC: ${npc?.name || npcId}`,
        campaignId,
        status: 'success',
        details: npc ? `Status: ${npc.status}` : 'NPC não encontrado',
      });

      return npc;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getNPC',
        entity: `NPC: ${npcId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async updateNPC(campaignId: string, npcId: string, updates: Partial<NPC>): Promise<NPC | null> {
    try {
      let wasExisting = false;
      const updated = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        let targetKey = npcId;
        let existing = snapshot.npcs[npcId];

        if (!existing) {
          const target = npcId.toLowerCase().trim();
          const found = Object.entries(snapshot.npcs).find(
            ([k, n]) =>
              k.toLowerCase() === target ||
              n.id.toLowerCase() === target ||
              n.name.toLowerCase() === target ||
              n.name.toLowerCase().includes(target)
          );
          if (found) {
            targetKey = found[0];
            existing = found[1];
          }
        }

        let finalNpc: NPC;
        if (existing) {
          wasExisting = true;
          // Anti-retcon: NPC morto permanece morto a menos que haja ressurreição explícita
          if (existing.status === 'dead' && updates.status && updates.status !== 'dead') {
            const hasResurrectionCause = updates.personalityNotes?.toLowerCase().includes('ressurrei') || updates.personalityNotes?.toLowerCase().includes('revive');
            if (!hasResurrectionCause) {
              updates.status = 'dead';
            }
          }

          finalNpc = {
            ...existing,
            ...updates,
            id: existing.id,
          };
          snapshot.npcs[targetKey] = finalNpc;
        } else {
          wasExisting = false;
          const newId = npcId.startsWith('npc_') ? npcId : `npc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          finalNpc = {
            id: newId,
            name: updates.name || npcId,
            status: updates.status || 'alive',
            location: updates.location || '',
            faction: updates.faction || '',
            personalityNotes: updates.personalityNotes || '',
            goals: updates.goals || [],
            secrets: updates.secrets || [],
            inventory: updates.inventory || [],
            relationships: updates.relationships || {},
          };
          snapshot.npcs[newId] = finalNpc;
        }

        await this.semanticManager.indexEntity(finalNpc.id, 'npc', this.semanticManager.formatNPC(finalNpc), snapshot);
        return finalNpc;
      });

      this.recordLog({
        operation: wasExisting ? 'UPDATE' : 'CREATE',
        functionName: 'updateNPC',
        entity: `NPC: ${updated.name || npcId}`,
        campaignId,
        status: 'success',
        details: `Atualizados: ${Object.keys(updates).join(', ')}`,
      });

      return updated;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateNPC',
        entity: `NPC: ${npcId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async getAllNPCs(campaignId: string): Promise<NPC[]> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      const npcs = snapshot ? Object.values(snapshot.npcs) : [];

      this.recordLog({
        operation: 'READ',
        functionName: 'getAllNPCs',
        entity: `NPCs (${npcs.length})`,
        campaignId,
        status: 'success',
        details: `Retornados ${npcs.length} NPCs cadastrados`,
      });

      return npcs;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getAllNPCs',
        entity: 'NPCs',
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // 3. EVENT METHODS
  // =================================================================

  async createEvent(
    campaignId: string,
    eventData: Partial<Event> & { description: string; location?: string; participants?: string[] }
  ): Promise<Event> {
    const id = eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const event = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const newEvent: Event = {
          id,
          timestamp: eventData.timestamp || Date.now(),
          location: eventData.location || '',
          participants: eventData.participants || [],
          description: eventData.description || '',
          consequences: eventData.consequences || [],
        };

        snapshot.events.push(newEvent);
        await this.semanticManager.indexEntity(id, 'event', this.semanticManager.formatEvent(newEvent), snapshot);
        return newEvent;
      });

      this.recordLog({
        operation: 'CREATE',
        functionName: 'createEvent',
        entity: `Event: ${id}`,
        campaignId,
        status: 'success',
        details: `Local: "${event.location}", Participantes: ${event.participants.join(', ') || 'nenhum'}`,
      });

      return event;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'CREATE',
        functionName: 'createEvent',
        entity: `Event: ${id}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async getRelevantEvents(
    campaignId: string,
    query?: { location?: string; participant?: string; limit?: number }
  ): Promise<Event[]> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      if (!snapshot) return [];

      let events = [...snapshot.events];

      if (query?.location) {
        const loc = query.location.toLowerCase();
        events = events.filter((e) => e.location.toLowerCase().includes(loc));
      }

      if (query?.participant) {
        const part = query.participant.toLowerCase();
        events = events.filter((e) =>
          e.participants.some((p) => p.toLowerCase().includes(part))
        );
      }

      events.sort((a, b) => b.timestamp - a.timestamp);
      const limit = query?.limit || 10;
      const result = events.slice(0, limit);

      this.recordLog({
        operation: 'READ',
        functionName: 'getRelevantEvents',
        entity: `Events (${result.length})`,
        campaignId,
        status: 'success',
        details: `Filtro local="${query?.location || ''}", part="${query?.participant || ''}"`,
      });

      return result;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getRelevantEvents',
        entity: 'Events',
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // 4. KNOWLEDGE METHODS (ISOLAMENTO EPISTEMOLÓGICO)
  // =================================================================

  public matchesCharacter(candidate: string, target: string, npcs: Record<string, NPC> = {}): boolean {
    if (!candidate || !target) return false;
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const c = norm(candidate);
    const t = norm(target);
    if (c === t) return true;

    // 1. Verificar se um é o ID e o outro é o Nome do NPC registrado
    for (const npc of Object.values(npcs)) {
      const npcName = norm(npc.name);
      const npcId = norm(npc.id);
      if ((c === npcName || c === npcId) && (t === npcName || t === npcId)) {
        return true;
      }

      // Se um é o nome completo "Eldrin, o Alquimista" e o outro é o primeiro nome "Eldrin"
      const nameParts = npcName.split(/[,–—\s]+/);
      const firstName = nameParts[0];
      if (firstName && firstName.length > 2) {
        if ((c === npcName || c === firstName || c === npcId) && (t === npcName || t === firstName || t === npcId)) {
          return true;
        }
      }
    }

    // 2. Correspondência direta por primeiro nome e título (ex: "Eldrin, o Alquimista" e "Eldrin")
    const cFirst = c.split(/[,–—\s]+/)[0];
    const tFirst = t.split(/[,–—\s]+/)[0];
    if (cFirst && tFirst && cFirst === tFirst && cFirst.length > 2) {
      if (c === cFirst || t === tFirst) {
        return true;
      }
    }

    return false;
  }

  async createKnowledge(campaignId: string, knowledgeData: Partial<Knowledge> & { fact: string }): Promise<Knowledge> {
    const id = knowledgeData.id || `know_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const knowledge = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const truthStatus = knowledgeData.truthStatus || 'true';
        const knownBy = knowledgeData.knownBy || [];
        const suspectedBy = knowledgeData.suspectedBy || [];

        // Fatos universais só são World Truth se explicitamente marcados ou se verdadeiros e de domínio geral
        const isWorldTruth =
          knowledgeData.isWorldTruth !== undefined
            ? knowledgeData.isWorldTruth
            : (truthStatus === 'true' && (knownBy.length === 0 || knowledgeData.isPublicKnowledge === true));
            
        const epistemicStatus = knowledgeData.epistemicStatus || (isWorldTruth ? 'WORLD_TRUTH' : 'UNKNOWN');

        // --- DEDUPLICAÇÃO (UPSERT) ---
        const normalizedNewFact = (knowledgeData.fact || '').toLowerCase().trim();
        
        const existingIdx = snapshot.knowledge.findIndex(k => {
            if (knowledgeData.id && k.id === knowledgeData.id) return true;
            const normalizedExisting = k.fact.toLowerCase().trim();
            
            const sameFact = normalizedExisting === normalizedNewFact;
            const sameBaseTruth = k.truthStatus === truthStatus;
            const isCompatibleEpistemic = (k.epistemicStatus === epistemicStatus) || 
                                          (k.isWorldTruth === isWorldTruth);

            return sameFact && sameBaseTruth && isCompatibleEpistemic;
        });

        if (existingIdx !== -1) {
            const existing = snapshot.knowledge[existingIdx];
            const mergeArrays = (arr1: string[] = [], arr2: string[] = []) => Array.from(new Set([...arr1, ...arr2]));

            const updated: Knowledge = {
                ...existing,
                isWorldTruth: knowledgeData.isWorldTruth !== undefined ? knowledgeData.isWorldTruth : existing.isWorldTruth,
                isPublicKnowledge: knowledgeData.isPublicKnowledge !== undefined ? knowledgeData.isPublicKnowledge : existing.isPublicKnowledge,
                knownBy: mergeArrays(existing.knownBy, knowledgeData.knownBy),
                suspectedBy: mergeArrays(existing.suspectedBy, knowledgeData.suspectedBy),
                observedBy: mergeArrays(existing.observedBy, knowledgeData.observedBy),
                believedBy: mergeArrays(existing.believedBy, knowledgeData.believedBy),
                disputedBy: mergeArrays(existing.disputedBy, knowledgeData.disputedBy),
                informationChain: knowledgeData.informationChain && knowledgeData.informationChain.length > 0 
                    ? knowledgeData.informationChain 
                    : existing.informationChain,
                source: knowledgeData.source || existing.source,
                reliability: knowledgeData.reliability !== undefined ? knowledgeData.reliability : existing.reliability,
                confidence: knowledgeData.confidence !== undefined ? knowledgeData.confidence : existing.confidence,
                lastUpdatedAt: Date.now()
            };

            snapshot.knowledge[existingIdx] = updated;
            await this.semanticManager.indexEntity(updated.id, 'knowledge', this.semanticManager.formatKnowledge(updated), snapshot);
            return updated;
        }
        // --- FIM DA DEDUPLICAÇÃO ---

        const newKnowledge: Knowledge = {
          id,
          fact: knowledgeData.fact || '',
          truthStatus,
          knownBy,
          suspectedBy,
          source: knowledgeData.source || '',
          reliability: knowledgeData.reliability !== undefined ? knowledgeData.reliability : 10,
          isWorldTruth,
          isPublicKnowledge: knowledgeData.isPublicKnowledge || false,
          epistemicStatus,
          knowledgeType: knowledgeData.knowledgeType,
          confidence: knowledgeData.confidence !== undefined ? knowledgeData.confidence : 10,
          observedBy: knowledgeData.observedBy || [],
          believedBy: knowledgeData.believedBy || [],
          disputedBy: knowledgeData.disputedBy || [],
          evidence: knowledgeData.evidence || [],
          relatedKnowledge: knowledgeData.relatedKnowledge || [],
          acquiredAt: Date.now(),
          lastUpdatedAt: Date.now(),
          informationChain: knowledgeData.informationChain || [],
        };

        snapshot.knowledge.push(newKnowledge);
        await this.semanticManager.indexEntity(id, 'knowledge', this.semanticManager.formatKnowledge(newKnowledge), snapshot);
        return newKnowledge;
      });

      this.recordLog({
        operation: 'CREATE',
        functionName: 'createKnowledge',
        entity: `Knowledge: ${knowledgeData.id || 'new'}`,
        campaignId,
        status: 'success',
        details: `[${knowledge.truthStatus.toUpperCase()}] Fato: "${knowledge.fact.slice(0, 45)}..." | Conhecido por: [${knowledge.knownBy.join(', ')}] | Suspeitado por: [${knowledge.suspectedBy.join(', ')}]`,
      });

      return knowledge;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'CREATE',
        functionName: 'createKnowledge',
        entity: `Knowledge: ${knowledgeData.id || 'new'}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async updateKnowledge(campaignId: string, knowledgeId: string, updates: Partial<Knowledge>): Promise<Knowledge | null> {
    try {
      const updated = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const index = snapshot.knowledge.findIndex((k) => k.id === knowledgeId);
        if (index === -1) {
          return null;
        }

        const existing = snapshot.knowledge[index];
        const updatedKnownBy = updates.knownBy
          ? Array.from(new Set([...(existing.knownBy || []), ...updates.knownBy]))
          : existing.knownBy;
        const updatedSuspectedBy = updates.suspectedBy
          ? Array.from(new Set([...(existing.suspectedBy || []), ...updates.suspectedBy]))
          : existing.suspectedBy;
        const updatedObservedBy = updates.observedBy
          ? Array.from(new Set([...(existing.observedBy || []), ...updates.observedBy]))
          : existing.observedBy;
        const updatedBelievedBy = updates.believedBy
          ? Array.from(new Set([...(existing.believedBy || []), ...updates.believedBy]))
          : existing.believedBy;
        const updatedDisputedBy = updates.disputedBy
          ? Array.from(new Set([...(existing.disputedBy || []), ...updates.disputedBy]))
          : existing.disputedBy;

        const result: Knowledge = {
          ...existing,
          ...updates,
          knownBy: updatedKnownBy,
          suspectedBy: updatedSuspectedBy,
          observedBy: updatedObservedBy,
          believedBy: updatedBelievedBy,
          disputedBy: updatedDisputedBy,
          lastUpdatedAt: Date.now()
        };

        snapshot.knowledge[index] = result;
        await this.semanticManager.indexEntity(result.id, 'knowledge', this.semanticManager.formatKnowledge(result), snapshot);
        return result;
      });

      if (!updated) {
        this.recordLog({
          operation: 'UPDATE',
          functionName: 'updateKnowledge',
          entity: `Knowledge: ${knowledgeId}`,
          campaignId,
          status: 'error',
          error: 'Conhecimento não encontrado para atualização',
        });
        return null;
      }

      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateKnowledge',
        entity: `Knowledge: ${knowledgeId}`,
        campaignId,
        status: 'success',
        details: `Atualizado fato: "${updated.fact.slice(0, 45)}..." | Conhecido por: [${updated.knownBy.join(', ')}]`,
      });

      return updated;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateKnowledge',
        entity: `Knowledge: ${knowledgeId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  /**
   * Retorna ESTRITAMENTE os conhecimentos autorizados para um personagem específico.
   * Não retorna conhecimento de outros NPCs, nem fatos globais privados.
   */
  async getKnowledgeForCharacter(campaignId: string, characterIdOrName: string): Promise<Knowledge[]> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      if (!snapshot) return [];

      const npcs = snapshot.npcs || {};
      const results = snapshot.knowledge.filter((k) => {
        const isKnown = k.knownBy && k.knownBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
        const isSuspected = k.suspectedBy && k.suspectedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
        const isObserved = k.observedBy && k.observedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
        const isBelieved = k.believedBy && k.believedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
        const isDisputed = k.disputedBy && k.disputedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
        return isKnown || isSuspected || isObserved || isBelieved || isDisputed;
      });

      this.recordLog({
        operation: 'READ',
        functionName: 'getKnowledgeForCharacter',
        entity: `Knowledge for: ${characterIdOrName}`,
        campaignId,
        status: 'success',
        details: `Retornados ${results.length} registros estritamente autorizados para "${characterIdOrName}"`,
      });

      return results;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getKnowledgeForCharacter',
        entity: `Knowledge for: ${characterIdOrName}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  /**
   * Monta o bundle isolado e categorizado de conhecimento para um personagem:
   * fatos autorizados, crenças, suspeitas, rumores, fontes e eventos testemunhados.
   */
  async getCharacterKnowledgeBundle(campaignId: string, characterIdOrName: string): Promise<CharacterKnowledgeBundle> {
    const snapshot = await this.store.getSnapshot(campaignId);
    const npcs = snapshot?.npcs || {};

    let canonicalName = characterIdOrName;
    let canonicalId: string | undefined = undefined;

    for (const npc of Object.values(npcs)) {
      if (this.matchesCharacter(npc.name, characterIdOrName, npcs) || this.matchesCharacter(npc.id, characterIdOrName, npcs)) {
        canonicalName = npc.name;
        canonicalId = npc.id;
        break;
      }
    }

    if (!snapshot) {
      return {
        characterName: canonicalName,
        characterId: canonicalId,
        knownFacts: [],
        rumors: [],
        suspicions: [],
        beliefs: [],
        witnessedEvents: [],
        sources: [],
      };
    }

    const allKnowledge = snapshot.knowledge || [];
    const allEvents = snapshot.events || [];

    const characterKnowledge = allKnowledge.filter((k) => {
      const isKnown = k.knownBy && k.knownBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
      const isSuspected = k.suspectedBy && k.suspectedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
      const isObserved = k.observedBy && k.observedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
      const isBelieved = k.believedBy && k.believedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
      const isDisputed = k.disputedBy && k.disputedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs));
      return isKnown || isSuspected || isObserved || isBelieved || isDisputed;
    });

    const knownFacts = characterKnowledge.filter(
      (k) =>
        (k.truthStatus === 'true' || k.truthStatus === 'partial' || k.truthStatus === 'unverified' || k.truthStatus === 'claim' || !k.truthStatus) &&
        k.truthStatus !== 'rumor' &&
        k.truthStatus !== 'suspicion' &&
        k.truthStatus !== 'belief' &&
        k.epistemicStatus !== 'BELIEF' &&
        k.epistemicStatus !== 'FALSE_BELIEF' &&
        k.epistemicStatus !== 'SUSPICION' &&
        ((k.knownBy && k.knownBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs))) ||
         (k.observedBy && k.observedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs))))
    );

    const rumors = characterKnowledge.filter(
      (k) =>
        k.truthStatus === 'rumor' ||
        k.epistemicStatus === 'RUMOR' ||
        (k.source && (k.source.toLowerCase().includes('rumor') || k.source.toLowerCase().includes('boato') || k.source.toLowerCase().includes('taverna')))
    );

    const suspicions = characterKnowledge.filter(
      (k) =>
        k.truthStatus === 'suspicion' ||
        k.epistemicStatus === 'SUSPICION' ||
        (k.suspectedBy && k.suspectedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs)))
    );

    const beliefs = characterKnowledge.filter(
      (k) => k.truthStatus === 'belief' || k.truthStatus === 'hypothesis' || k.epistemicStatus === 'BELIEF' || k.epistemicStatus === 'FALSE_BELIEF' ||
        (k.believedBy && k.believedBy.some((name) => this.matchesCharacter(name, characterIdOrName, npcs)))
    );

    const witnessedEvents = allEvents.filter(
      (e) => e.participants && e.participants.some((p) => this.matchesCharacter(p, characterIdOrName, npcs))
    );

    const sources = Array.from(new Set(characterKnowledge.map((k) => k.source).filter(Boolean)));

    return {
      characterName: canonicalName,
      characterId: canonicalId,
      knownFacts,
      rumors,
      suspicions,
      beliefs,
      witnessedEvents,
      sources,
    };
  }

  // =================================================================
  // 5. RELATIONSHIP METHODS
  // =================================================================

  async getRelationship(campaignId: string, characterA: string, characterB: string): Promise<Relationship | null> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      if (!snapshot) return null;

      const charA = characterA.toLowerCase();
      const charB = characterB.toLowerCase();

      const rel = snapshot.relationships.find(
        (r) =>
          (r.characterA.toLowerCase() === charA && r.characterB.toLowerCase() === charB) ||
          (r.characterA.toLowerCase() === charB && r.characterB.toLowerCase() === charA)
      );

      this.recordLog({
        operation: 'READ',
        functionName: 'getRelationship',
        entity: `Relationship: ${characterA} <-> ${characterB}`,
        campaignId,
        status: 'success',
        details: rel ? `Confiança: ${rel.trust}, Hostilidade: ${rel.hostility}` : 'Relação não cadastrada',
      });

      return rel || null;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getRelationship',
        entity: `Relationship: ${characterA} <-> ${characterB}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async updateRelationship(
    campaignId: string,
    characterA: string,
    characterB: string,
    updates: RelationshipUpdates
  ): Promise<Relationship> {
    try {
      let isUpdate = false;
      const result = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const charA = characterA.toLowerCase();
        const charB = characterB.toLowerCase();

        const index = snapshot.relationships.findIndex(
          (r) =>
            (r.characterA.toLowerCase() === charA && r.characterB.toLowerCase() === charB) ||
            (r.characterA.toLowerCase() === charB && r.characterB.toLowerCase() === charA)
        );

        let finalRel: Relationship;

        if (index >= 0) {
          isUpdate = true;
          const existing = snapshot.relationships[index];
          const calcTrust = updates.trustChange !== undefined
            ? existing.trust + updates.trustChange
            : (updates.trust !== undefined ? updates.trust : existing.trust);
          const calcHostility = updates.hostilityChange !== undefined
            ? existing.hostility + updates.hostilityChange
            : (updates.hostility !== undefined ? updates.hostility : existing.hostility);
          const calcFamiliarity = updates.familiarityChange !== undefined
            ? existing.familiarity + updates.familiarityChange
            : (updates.familiarity !== undefined ? updates.familiarity : existing.familiarity);

          const mergedHistory = updates.importantHistory
            ? Array.from(new Set([...(existing.importantHistory || []), ...updates.importantHistory]))
            : existing.importantHistory;

          finalRel = {
            ...existing,
            ...updates,
            characterA: existing.characterA,
            characterB: existing.characterB,
            trust: Math.max(-100, Math.min(100, calcTrust)),
            hostility: Math.max(-100, Math.min(100, calcHostility)),
            familiarity: Math.max(0, Math.min(10, calcFamiliarity)),
            importantHistory: mergedHistory,
          };
          delete (finalRel as any).trustChange;
          delete (finalRel as any).hostilityChange;
          delete (finalRel as any).familiarityChange;

          snapshot.relationships[index] = finalRel;
        } else {
          isUpdate = false;
          const initTrust = (updates.trust !== undefined ? updates.trust : 0) + (updates.trustChange || 0);
          const initHostility = (updates.hostility !== undefined ? updates.hostility : 0) + (updates.hostilityChange || 0);
          const initFamiliarity = (updates.familiarity !== undefined ? updates.familiarity : 0) + (updates.familiarityChange || 0);

          finalRel = {
            characterA,
            characterB,
            trust: Math.max(-100, Math.min(100, initTrust)),
            hostility: Math.max(-100, Math.min(100, initHostility)),
            familiarity: Math.max(0, Math.min(10, initFamiliarity)),
            importantHistory: updates.importantHistory || [],
          };
          delete (finalRel as any).trustChange;
          delete (finalRel as any).hostilityChange;
          delete (finalRel as any).familiarityChange;

          snapshot.relationships.push(finalRel);
        }

        await this.semanticManager.indexEntity(
          `rel_${finalRel.characterA}_${finalRel.characterB}`,
          'relationship',
          this.semanticManager.formatRelationship(finalRel),
          snapshot
        );

        return finalRel;
      });

      this.recordLog({
        operation: isUpdate ? 'UPDATE' : 'CREATE',
        functionName: 'updateRelationship',
        entity: `Relationship: ${characterA} <-> ${characterB}`,
        campaignId,
        status: 'success',
        details: `Confiança: ${result.trust}, Hostilidade: ${result.hostility}, Familiaridade: ${result.familiarity}`,
      });

      return result;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateRelationship',
        entity: `Relationship: ${characterA} <-> ${characterB}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // 6. INVENTORY METHODS
  // =================================================================

  async getInventory(campaignId: string, owner: string): Promise<InventoryItem[]> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      if (!snapshot) return [];

      const ownerLower = owner.toLowerCase();
      const items = snapshot.inventory.filter((i) => i.owner.toLowerCase() === ownerLower);

      this.recordLog({
        operation: 'READ',
        functionName: 'getInventory',
        entity: `Inventory: ${owner}`,
        campaignId,
        status: 'success',
        details: `Possui ${items.length} itens distintos`,
      });

      return items;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getInventory',
        entity: `Inventory: ${owner}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async updateInventory(
    campaignId: string,
    owner: string,
    item: string,
    quantity: number,
    mode: 'set' | 'add' = 'set'
  ): Promise<InventoryItem[]> {
    try {
      const currentItems = await this.store.mutateSnapshot(campaignId, (snapshot) => {
        const ownerLower = owner.toLowerCase();
        const itemLower = item.toLowerCase();

        const index = snapshot.inventory.findIndex(
          (i) => i.owner.toLowerCase() === ownerLower && i.item.toLowerCase() === itemLower
        );

        if (index >= 0) {
          if (mode === 'add') {
            snapshot.inventory[index].quantity += quantity;
          } else {
            snapshot.inventory[index].quantity = quantity;
          }

          if (snapshot.inventory[index].quantity <= 0) {
            snapshot.inventory.splice(index, 1);
          }
        } else if (quantity > 0) {
          snapshot.inventory.push({
            owner,
            item,
            quantity,
          });
        }

        return snapshot.inventory.filter((i) => i.owner.toLowerCase() === ownerLower);
      });

      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateInventory',
        entity: `Inventory: ${owner} (${item})`,
        campaignId,
        status: 'success',
        details: `Operação ${mode}: ${item} alterado por ${quantity}`,
      });

      return currentItems;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateInventory',
        entity: `Inventory: ${owner}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // 7. QUEST METHODS
  // =================================================================

  async getQuest(campaignId: string, questId: string): Promise<Quest | null> {
    try {
      const snapshot = await this.store.getSnapshot(campaignId);
      if (!snapshot) return null;

      const target = questId.toLowerCase().trim();
      const quest =
        snapshot.quests.find(
          (q) => q.id.toLowerCase() === target || q.title.toLowerCase() === target || q.title.toLowerCase().includes(target)
        ) || null;

      this.recordLog({
        operation: 'READ',
        functionName: 'getQuest',
        entity: `Quest: ${quest?.title || questId}`,
        campaignId,
        status: 'success',
        details: quest ? `Status: ${quest.status}` : 'Quest não encontrada',
      });

      return quest;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'READ',
        functionName: 'getQuest',
        entity: `Quest: ${questId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async createQuest(campaignId: string, questData: Partial<Quest> & { title: string }): Promise<Quest> {
    const id = questData.id || `quest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const quest = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const newQuest: Quest = {
          id,
          title: questData.title || '',
          status: questData.status || 'active',
          participants: questData.participants || [],
          objectives: questData.objectives || [],
          consequences: questData.consequences || [],
        };

        snapshot.quests.push(newQuest);
        await this.semanticManager.indexEntity(id, 'quest', this.semanticManager.formatQuest(newQuest), snapshot);
        return newQuest;
      });

      this.recordLog({
        operation: 'CREATE',
        functionName: 'createQuest',
        entity: `Quest: ${quest.title || id}`,
        campaignId,
        status: 'success',
        details: `Status: ${quest.status}, Objetivos: ${quest.objectives.length}`,
      });

      return quest;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'CREATE',
        functionName: 'createQuest',
        entity: `Quest: ${id}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async updateQuest(campaignId: string, questId: string, updates: Partial<Quest>): Promise<Quest | null> {
    try {
      let isCreate = false;
      const updated = await this.store.mutateSnapshot(campaignId, async (snapshot) => {
        const target = questId.toLowerCase().trim();
        let index = snapshot.quests.findIndex(
          (q) => q.id.toLowerCase() === target || q.title.toLowerCase() === target || q.title.toLowerCase().includes(target)
        );

        if (index < 0) {
          isCreate = true;
          const newQuest: Quest = {
            id: questId.startsWith('quest_') ? questId : `quest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: updates.title || questId,
            status: updates.status || 'active',
            participants: updates.participants || [],
            objectives: updates.objectives || [],
            consequences: updates.consequences || [],
          };
          snapshot.quests.push(newQuest);
          await this.semanticManager.indexEntity(newQuest.id, 'quest', this.semanticManager.formatQuest(newQuest), snapshot);
          return newQuest;
        }

        isCreate = false;
        const existing = snapshot.quests[index];
        
        // Anti-retcon: Quest concluída não volta ao estado ativo/pendente acidentalmente
        if (existing.status === 'completed' && updates.status && updates.status !== 'completed') {
          const canReopen = updates.consequences && updates.consequences.some(c => c.toLowerCase().includes('reabrir') || c.toLowerCase().includes('reaberta'));
          if (!canReopen) {
            updates.status = 'completed';
          }
        }

        const finalQuest: Quest = {
          ...existing,
          ...updates,
          id: existing.id,
        };

        snapshot.quests[index] = finalQuest;
        await this.semanticManager.indexEntity(finalQuest.id, 'quest', this.semanticManager.formatQuest(finalQuest), snapshot);
        return finalQuest;
      });

      this.recordLog({
        operation: isCreate ? 'CREATE' : 'UPDATE',
        functionName: 'updateQuest',
        entity: `Quest: ${updated.title || questId}`,
        campaignId,
        status: 'success',
        details: isCreate ? `Criada nova quest ao atualizar: ${updated.title}` : `Campos: ${Object.keys(updates).join(', ')}`,
      });

      return updated;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'updateQuest',
        entity: `Quest: ${questId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // GET RELEVANT CONTEXT (DETERMINÍSTICO E ISOLADO DO HISTÓRICO DE CHAT)
  // =================================================================

  /**
   * Filtra deterministicamente apenas os fatos, entidades, relações e eventos relevantes
   * para o turno atual da campanha, sem depender de vetores ou RAG opaco.
   */
  async getRelevantContext(params: RelevantContextParams): Promise<RelevantContextOutput> {
    const {
      campaignId,
      currentLocation = '',
      presentNPCs: npcsPresent = [],
      conversationSubject = '',
      playerCharacter = 'player',
      recentEventsCount = 5,
      targetCharacter, // The specific character this context is being built for
    } = params;

    try {
      const snapshot = await this.store.getSnapshot(campaignId);

      if (!snapshot) {
        this.recordLog({
          operation: 'QUERY_CONTEXT',
          functionName: 'getRelevantContext',
          entity: `Context: ${campaignId}`,
          campaignId,
          status: 'success',
          details: 'Snapshot vazio para a campanha atual',
        });

        return {
          campaign: null,
          location: currentLocation,
          presentNPCs: [],
          relationships: [],
          relevantQuests: [],
          relevantKnowledge: [],
          relevantEvents: [],
          inventories: [],
          formattedSummary: '',
        };
      }

      const locLower = currentLocation.toLowerCase().trim();
      const topicLower = conversationSubject.toLowerCase().trim();
      const presentLowerList = npcsPresent.map((n) => n.toLowerCase().trim());
      const targetLower = (targetCharacter || playerCharacter).toLowerCase().trim();
      const playerLower = playerCharacter.toLowerCase().trim();

      // 1. Filtragem determinística de NPCs presentes
      const presentNPCs = Object.values(snapshot.npcs).filter((npc) => {
        const npcNameLower = npc.name.toLowerCase();
        const npcIdLower = npc.id.toLowerCase();
        const npcLocLower = npc.location.toLowerCase();

        if (presentLowerList.length > 0) {
          return presentLowerList.some(
            (p) => npcNameLower.includes(p) || npcIdLower === p || this.matchesCharacter(npc.name, p, snapshot.npcs)
          );
        }

        const isInCurrentLocation = locLower !== '' && npcLocLower !== '' && (npcLocLower === locLower || locLower.includes(npcLocLower));
        return isInCurrentLocation || npcNameLower.includes(targetLower) || npcIdLower === targetLower;
      });

      // Nomes e IDs de todos os personagens no escopo imediato
      const activeCharacterNames = new Set<string>([
        targetLower,
        playerLower,
        ...presentNPCs.map((n) => n.name.toLowerCase()),
        ...presentNPCs.map((n) => n.id.toLowerCase()),
      ]);

      // 2. Relacionamentos entre os envolvidos
      const relationships = snapshot.relationships.filter((r) => {
        const a = r.characterA.toLowerCase();
        const b = r.characterB.toLowerCase();
        return (a === targetLower || b === targetLower) && (activeCharacterNames.has(a) || activeCharacterNames.has(b));
      });

      // 3. Quests ativas envolvendo a localização, target, player ou tópico
      const relevantQuests = snapshot.quests.filter((q) => {
        if (q.status !== 'active' && q.status !== 'in_progress') return false;
        const participantsLower = q.participants.map((p) => p.toLowerCase());
        const involvesTarget = participantsLower.some((p) => p.includes(targetLower) || targetLower.includes(p));
        const involvesPlayer = participantsLower.some((p) => p.includes(playerLower) || playerLower.includes(p));
        const involvesTopic = topicLower.length > 3 && q.title.toLowerCase().includes(topicLower);
        return involvesTarget || involvesPlayer || involvesTopic;
      });

      // 4. EPISTEMOLOGICAL FILTER - PRIORIDADE MÁXIMA
      // NUNCA distribua conhecimento automaticamente. A informação só é incluída se a targetCharacter puder saber.
      const allowedKnowledgeIds = new Set<string>();
      
      // Conhecimento público: apenas fatos expressamente marcados como de domínio público geral
      const publicKnowledge = snapshot.knowledge.filter(
        (k) => k.isPublicKnowledge === true
      );

      // World Truths canônicas: verdades absolutas do mundo (acessíveis apenas ao Narrador se forem secretas)
      const worldTruthKnowledge = snapshot.knowledge.filter(
        (k) => k.isWorldTruth === true || k.epistemicStatus === 'WORLD_TRUTH'
      );

      if (targetLower === 'narrator') {
        for (const k of snapshot.knowledge) {
          allowedKnowledgeIds.add(k.id);
        }
      } else {
        for (const k of publicKnowledge) {
          allowedKnowledgeIds.add(k.id);
        }
      }

      const relevantKnowledge = snapshot.knowledge.filter((k) => {
        if (allowedKnowledgeIds.has(k.id)) return true;
        
        const knownByLower = k.knownBy ? k.knownBy.map(x => x.toLowerCase()) : [];
        const suspectedByLower = k.suspectedBy ? k.suspectedBy.map(x => x.toLowerCase()) : [];
        const observedByLower = k.observedBy ? k.observedBy.map(x => x.toLowerCase()) : [];
        const believedByLower = k.believedBy ? k.believedBy.map(x => x.toLowerCase()) : [];
        const disputedByLower = k.disputedBy ? k.disputedBy.map(x => x.toLowerCase()) : [];
        
        // Target character conhece ou suspeita legitimamente do fato
        const checkLegit = (arr: string[]) => arr.includes(targetLower) || arr.some(n => this.matchesCharacter(targetLower, n, snapshot.npcs));
        const canLegitimatelyKnow = checkLegit(knownByLower) || checkLegit(suspectedByLower) || checkLegit(observedByLower) || checkLegit(believedByLower) || checkLegit(disputedByLower);

        if (canLegitimatelyKnow) {
          allowedKnowledgeIds.add(k.id);
          return true;
        }
        
        return false;
      });

      // Bundles isolados para a summary, APENAS para a targetCharacter, para não vazar!
      const targetNPCs = presentNPCs.filter(npc => npc.name.toLowerCase() === targetLower || npc.id.toLowerCase() === targetLower);
      const targetBundles: CharacterKnowledgeBundle[] = [];
      
      // Se a target character é um dos NPCs, pegamos o bundle dela para formar o summary.
      // Se a target character for player ou narrator, listamos o conhecimento formatado de outra forma.
      for (const npc of targetNPCs) {
        const bundle = await this.getCharacterKnowledgeBundle(campaignId, npc.id || npc.name);
        targetBundles.push(bundle);
      }

      // 6. Eventos recentes autorizados (apenas se presenciados pela targetCharacter ou em loc público conhecido)
      const relevantEvents = snapshot.events
        .filter((e) => {
          const matchesLoc = locLower !== '' && e.location.toLowerCase().includes(locLower);
          const matchesTarget = e.participants.some((p) => this.matchesCharacter(p, targetLower, snapshot.npcs));
          
          if (targetLower === 'narrator') return true;
          
          return matchesLoc || matchesTarget;
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, recentEventsCount);

      // 7. Inventários: Apenas o inventário da targetCharacter e de quem ela possa ver (se for aberto)
      const inventories = snapshot.inventory.filter((inv) => {
        if (targetLower === 'narrator') return true;
        return this.matchesCharacter(inv.owner, targetLower, snapshot.npcs);
      });

      // 8. SEMANTIC SEARCH & EPISTEMOLOGICAL FILTER
      const queryText = `${topicLower} ${currentLocation} ${npcsPresent.join(' ')}`.trim();
      let semanticFilteredCount = 0;
      let semanticDuplicateCount = 0;
      let semanticCandidatesCount = 0;

      if (queryText.length > 3) {
        const semanticCandidates = await this.semanticManager.semanticSearch(queryText, snapshot, 15);
        semanticCandidatesCount = semanticCandidates.length;

        for (const candidate of semanticCandidates) {
          if (candidate.record.type === 'knowledge') {
            const k = snapshot.knowledge.find(x => x.id === candidate.record.id);
            if (!k) continue;

            if (allowedKnowledgeIds.has(k.id)) {
              semanticDuplicateCount++;
              continue;
            }

            const isPublic = k.isPublicKnowledge === true;
            const knownByLower = k.knownBy ? k.knownBy.map(x => x.toLowerCase()) : [];
            const suspectedByLower = k.suspectedBy ? k.suspectedBy.map(x => x.toLowerCase()) : [];
            const observedByLower = k.observedBy ? k.observedBy.map(x => x.toLowerCase()) : [];
            const believedByLower = k.believedBy ? k.believedBy.map(x => x.toLowerCase()) : [];
            const disputedByLower = k.disputedBy ? k.disputedBy.map(x => x.toLowerCase()) : [];
            
            const checkLegit = (arr: string[]) => arr.includes(targetLower) || arr.some(n => this.matchesCharacter(targetLower, n, snapshot.npcs));

            const canLegitimatelyKnow = isPublic || targetLower === 'narrator' || 
              checkLegit(knownByLower) || checkLegit(suspectedByLower) || checkLegit(observedByLower) || checkLegit(believedByLower) || checkLegit(disputedByLower);

            if (canLegitimatelyKnow) {
              allowedKnowledgeIds.add(k.id);
              relevantKnowledge.push(k);
            } else {
              semanticFilteredCount++;
            }
          }
          else if (candidate.record.type === 'event') {
            const e = snapshot.events.find(x => x.id === candidate.record.id);
            if (!e) continue;
            if (relevantEvents.some(x => x.id === e.id)) {
                semanticDuplicateCount++;
                continue;
            }
            
            const matchesTarget = e.participants.some((p) => this.matchesCharacter(p, targetLower, snapshot.npcs));
            if (targetLower === 'narrator' || matchesTarget) {
              relevantEvents.push(e);
            } else {
              semanticFilteredCount++;
            }
          }
          else if (candidate.record.type === 'quest') {
            const q = snapshot.quests.find(x => x.id === candidate.record.id);
            if (!q) continue;
            if (relevantQuests.some(x => x.id === q.id)) {
                semanticDuplicateCount++;
                continue;
            }
            const participantsLower = q.participants.map((p) => p.toLowerCase());
            const involvesTarget = participantsLower.some((p) => p.includes(targetLower) || targetLower.includes(p));
            if (targetLower === 'narrator' || involvesTarget) {
              relevantQuests.push(q);
            } else {
              semanticFilteredCount++;
            }
          }
        }
      }

      // 9. Formatação estruturada de blocos com isolamento epistemológico estrito
      const sections: string[] = [];

      if (snapshot.campaign.name) {
        sections.push(
          `[CAMPANHA]: ${snapshot.campaign.name} | Data: ${snapshot.campaign.currentDate || 'Indefinida'} | Local: ${snapshot.campaign.currentLocation || currentLocation || 'Indefinido'}`
        );
      }

      // Header informando a perspectiva do contexto
      sections.push(`[TARGET CONTEXT]: Contexto cognitivo filtrado estritamente para a perspectiva de: ${targetCharacter || playerCharacter}`);

      if (targetLower === 'narrator') {
        if (worldTruthKnowledge.length > 0) {
          const wtLines = worldTruthKnowledge
            .map((k) => `- [WORLD TRUTH / CANON]: "${k.fact}"`)
            .join('\n');
          sections.push(`[WORLD FACTS (FATOS GERAIS DO MUNDO)]:\n${wtLines}`);
        }
        if (publicKnowledge.length > 0) {
          const pubLines = publicKnowledge
            .map((k) => `- [CONHECIMENTO PÚBLICO]: "${k.fact}"`)
            .join('\n');
          sections.push(`[CONHECIMENTO PÚBLICO / NOTÓRIO]:\n${pubLines}`);
        }
      } else {
        if (publicKnowledge.length > 0) {
          const pubLines = publicKnowledge
            .map((k) => `- [WORLD TRUTH]: "${k.fact}"`)
            .join('\n');
          sections.push(`[WORLD FACTS (FATOS GERAIS DO MUNDO)]:\n${pubLines}`);
        }
      }

      // Conhecimento específico da target character
      const personalKnowledge = relevantKnowledge.filter(
        k => !publicKnowledge.some(pk => pk.id === k.id) && (targetLower !== 'narrator' || !worldTruthKnowledge.some(wt => wt.id === k.id))
      );
      if (personalKnowledge.length > 0) {
        const pkLines = personalKnowledge
          .map(k => {
             let prefix = `[${(k.epistemicStatus || k.truthStatus).toUpperCase()}]`;
             const observedLower = k.observedBy ? k.observedBy.map(x=>x.toLowerCase()) : [];
             const believedLower = k.believedBy ? k.believedBy.map(x=>x.toLowerCase()) : [];
             const suspectedLower = k.suspectedBy ? k.suspectedBy.map(x=>x.toLowerCase()) : [];
             const knownLower = k.knownBy ? k.knownBy.map(x=>x.toLowerCase()) : [];
             const disputedLower = k.disputedBy ? k.disputedBy.map(x=>x.toLowerCase()) : [];

             if (disputedLower.includes(targetLower)) prefix = '[INFORMAÇÃO CONTESTADA]';
             else if (k.epistemicStatus === 'FALSE_BELIEF' && believedLower.includes(targetLower)) prefix = '[FALSA CRENÇA (Acredita firmemente, mas é falso)]';
             else if (k.epistemicStatus === 'BELIEF' && believedLower.includes(targetLower)) prefix = '[CRENÇA PESSOAL]';
             else if (observedLower.includes(targetLower)) prefix = '[OBSERVAÇÃO DIRETA (Testemunhou)]';
             else if (suspectedLower.includes(targetLower)) prefix = '[SUSPEITA]';
             else if (k.epistemicStatus === 'REPORTED_INFORMATION' && knownLower.includes(targetLower)) {
                const chain = k.informationChain && k.informationChain.length > 0 ? ` recebida de ${k.informationChain.join(' -> ')}` : '';
                prefix = `[INFORMAÇÃO REPORTADA${chain}]`;
             }
             else if (k.epistemicStatus === 'RUMOR' || k.truthStatus === 'rumor') prefix = '[RUMOR]';

             const confidenceStr = k.confidence !== undefined ? `Conf: ${k.confidence}/10` : `Conf: ${k.reliability}/10`;
             return `- ${prefix}: "${k.fact}" (Fonte: ${k.source || 'Própria'}, ${confidenceStr})`;
          }).join('\n');
        sections.push(`[CHARACTER KNOWLEDGE (O que ${targetCharacter || playerCharacter} sabe/acredita/suspeita)]:\n${pkLines}`);
      }

      if (presentNPCs.length > 0) {
        const npcLines = presentNPCs
          .map((n) => {
            const factionStr = n.faction ? ` | Facção: ${n.faction}` : '';
            const goalsStr = n.goals && n.goals.length > 0 ? ` | Objetivos: ${n.goals.join('; ')}` : '';
            return `- ${n.name} (Status: ${n.status}, Local: ${n.location}${factionStr}${goalsStr})`;
          })
          .join('\n');
        sections.push(`[NPCs PRESENTES NO LOCAL]:\n${npcLines}`);
      }

      if (targetLower === 'narrator') {
        const offScreenNPCs = Object.values(snapshot.npcs).filter((n) => !presentNPCs.some((pn) => pn.id === n.id));
        if (offScreenNPCs.length > 0) {
          const offLines = offScreenNPCs
            .map((n) => {
              const factionStr = n.faction ? ` | Facção: ${n.faction}` : '';
              const goalsStr = n.goals && n.goals.length > 0 ? ` | Objetivos autônomos: ${n.goals.join('; ')}` : '';
              return `- ${n.name} [Local: ${n.location}, Status: ${n.status}${factionStr}${goalsStr}]`;
            })
            .join('\n');
          sections.push(`[ESTADO DE NPCs FORA DA CENA (PROGRESSÃO AUTÔNOMA E FACÇÕES)]:\n${offLines}`);
        }
      }

      if (relationships.length > 0) {
        const relLines = relationships
          .map((r) => {
            const other = r.characterA.toLowerCase() === targetLower ? r.characterB : r.characterA;
            const history = r.importantHistory && r.importantHistory.length > 0 ? ` | Histórico Relevante: ${r.importantHistory.join('; ')}` : '';
            return `- Relação entre ${r.characterA} e ${r.characterB} (visão de ${other}): Confiança ${r.trust}/100, Hostilidade ${r.hostility}/100, Familiaridade ${r.familiarity}/10${history}`;
          })
          .join('\n');
        sections.push(`[RELAÇÕES INTERPESSOAIS E HISTÓRICO SOCIAL]:\n${relLines}`);
      }

      if (relevantQuests.length > 0) {
        const questLines = relevantQuests.map((q) => `- ${q.title} (${q.status})`).join('\n');
        sections.push(`[OBJETIVOS / QUESTS EM ANDAMENTO]:\n${questLines}`);
      }

      const completedQuests = snapshot.quests.filter((q) => q.status === 'completed');
      if (completedQuests.length > 0) {
        const compLines = completedQuests.map((q) => `- ${q.title} (CONCLUÍDA - Fato consolidado, não reabrir)`).join('\n');
        sections.push(`[QUESTS CONCLUÍDAS NO PASSADO]:\n${compLines}`);
      }

      if (relevantEvents.length > 0) {
        const evtLines = relevantEvents.map((e) => `- ${e.description} (${e.location})`).join('\n');
        sections.push(`[EVENTOS RECENTES PRESENCIADOS]:\n${evtLines}`);
      }

      if (inventories.length > 0) {
        const invLines = inventories.map((i) => `- ${i.item} (x${i.quantity})`).join('\n');
        sections.push(`[INVENTÁRIO PESSOAL]:\n${invLines}`);
      }

      const output: RelevantContextOutput = {
        campaign: snapshot.campaign,
        location: currentLocation || snapshot.campaign.currentLocation,
        presentNPCs,
        relationships,
        relevantQuests,
        relevantKnowledge,
        relevantEvents,
        inventories,
        formattedSummary: sections.join('\n\n'),
      };

      this.recordLog({
        operation: 'QUERY_CONTEXT',
        functionName: 'getRelevantContext',
        entity: `Context for ${targetLower}`,
        campaignId,
        status: 'success',
        details: `Semântico: ${semanticCandidatesCount} cand, ${semanticFilteredCount} rev (epist), ${semanticDuplicateCount} dup. K=${relevantKnowledge.length}, WT=${worldTruthKnowledge.length}`,
      });

      return output;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'QUERY_CONTEXT',
        functionName: 'getRelevantContext',
        entity: `Context: ${currentLocation || 'local atual'}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  // =================================================================
  // CHAT MESSAGES MANAGEMENT (SEPARADO DA MEMÓRIA ESTRUTURADA)
  // =================================================================

  async recordMessage(
    campaignId: string,
    role: MessageRole,
    content: string,
    turn: number,
    metadata?: ChatMessage['metadata']
  ): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role,
      content,
      timestamp: Date.now(),
      turn,
      metadata,
    };
    await this.store.saveMessage(campaignId, message);
    return message;
  }

  async updateMessage(campaignId: string, messageId: string, updates: Partial<ChatMessage>): Promise<boolean> {
    return this.store.updateMessage(campaignId, messageId, updates);
  }

  async replaceMessage(
    campaignId: string,
    messageId: string,
    newMessage: ChatMessage
  ): Promise<ChatMessage> {
    try {
      const replaced = await this.store.replaceMessage(campaignId, messageId, newMessage);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'replaceMessage',
        entity: `Message: ${messageId}`,
        campaignId,
        status: 'success',
        details: `Mensagem ${messageId} substituída com sucesso no turno ${newMessage.turn}`,
      });
      return replaced;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'replaceMessage',
        entity: `Message: ${messageId}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async replaceTurnMessages(
    campaignId: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    expected?: ExpectedTurnState
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    try {
      const result = await this.store.replaceTurnMessages(campaignId, userMessage, assistantMessage, expected);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'replaceTurnMessages',
        entity: `Messages: ${userMessage.id}, ${assistantMessage.id}`,
        campaignId,
        status: 'success',
        details: `Par de mensagens (User: ${userMessage.id}, Assistant: ${assistantMessage.id}) substituído com sucesso no turno ${userMessage.turn}`,
      });
      return result;
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      this.recordLog({
        operation: 'UPDATE',
        functionName: 'replaceTurnMessages',
        entity: `Messages: ${userMessage.id}, ${assistantMessage.id}`,
        campaignId,
        status: 'error',
        error: errMsg,
      });
      throw err;
    }
  }

  async deleteMessage(campaignId: string, messageId: string): Promise<boolean> {
    return this.store.deleteMessage(campaignId, messageId);
  }

  async getRecentMessages(campaignId: string, limit: number = 20): Promise<ChatMessage[]> {
    return this.store.getMessages(campaignId, limit);
  }

  async clearCampaignData(campaignId: string): Promise<void> {
    await this.store.clearMessages(campaignId);
    await this.store.clearSnapshot(campaignId);
    this.recordLog({
      operation: 'DELETE',
      functionName: 'clearCampaignData',
      entity: `Campaign: ${campaignId}`,
      campaignId,
      status: 'success',
      details: 'Limpeza completa de mensagens e dados persistentes da campanha',
    });
  }
}
