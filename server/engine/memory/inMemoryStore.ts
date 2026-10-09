/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IPersistentMemoryStore,
  CampaignMemorySnapshot,
  ChatMessage,
  ExpectedTurnState,
  ExtractionSource,
  ExtractionCommit,
} from './types';
import { assertRevisable, extractionStatus, revisesNarrative } from './extractionRevision';

function cloneSnapshot<T>(target: T): T {
  if (target === undefined || target === null || typeof target !== 'object') {
    return target;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(target);
  }
  return JSON.parse(JSON.stringify(target));
}

/**
 * InMemoryStore
 * Implementação puramente em memória de IPersistentMemoryStore para testes unitários.
 */
export class InMemoryStore implements IPersistentMemoryStore {
  private snapshots: Map<string, CampaignMemorySnapshot> = new Map();
  private messagesByCampaign: Map<string, ChatMessage[]> = new Map();
  private writeQueues: Map<string, Promise<any>> = new Map();

  private async executeWithCampaignLock<T>(campaignId: string, task: () => Promise<T>): Promise<T> {
    const currentQueue = this.writeQueues.get(campaignId) || Promise.resolve();

    let releaseQueue: () => void = () => {};
    const taskPromise = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });

    const nextPromise = currentQueue
      .catch(() => {})
      .then(async () => {
        try {
          return await task();
        } finally {
          releaseQueue();
        }
      });

    this.writeQueues.set(campaignId, taskPromise);

    taskPromise.finally(() => {
      if (this.writeQueues.get(campaignId) === taskPromise) {
        this.writeQueues.delete(campaignId);
      }
    });

    return await nextPromise;
  }

  private createDefaultSnapshot(campaignId: string): CampaignMemorySnapshot {
    return {
      campaign: {
        campaignId,
        name: '',
        createdAt: Date.now(),
        currentDate: '',
        currentLocation: '',
      },
      npcs: {},
      events: [],
      knowledge: [],
      relationships: [],
      inventory: [],
      quests: [],
      semanticRecords: [],
      updatedAt: Date.now(),
    };
  }

  async getSnapshot(campaignId: string): Promise<CampaignMemorySnapshot | null> {
    const s = this.snapshots.get(campaignId);
    return s ? cloneSnapshot(s) : null;
  }

  async saveSnapshot(snapshot: CampaignMemorySnapshot): Promise<void> {
    const campaignId = snapshot.campaign.campaignId;
    return this.executeWithCampaignLock(campaignId, async () => {
      const workingCopy = cloneSnapshot(snapshot);
      workingCopy.updatedAt = Date.now();
      this.snapshots.set(campaignId, cloneSnapshot(workingCopy));
    });
  }

  async mutateSnapshot<TResult = CampaignMemorySnapshot>(
    campaignId: string,
    mutator: (snapshot: CampaignMemorySnapshot) => Promise<TResult> | TResult
  ): Promise<TResult> {
    return this.executeWithCampaignLock(campaignId, async () => {
      const existing = this.snapshots.get(campaignId) || this.createDefaultSnapshot(campaignId);
      const workingCopy = cloneSnapshot(existing);

      const result = await mutator(workingCopy);

      workingCopy.updatedAt = Date.now();
      this.snapshots.set(campaignId, cloneSnapshot(workingCopy));

      if (result === undefined || (result as any) === workingCopy) {
        return cloneSnapshot(workingCopy) as unknown as TResult;
      }
      if (typeof result === 'object' && result !== null) {
        return cloneSnapshot(result);
      }
      return result;
    });
  }

  async clearSnapshot(campaignId: string): Promise<void> {
    return this.executeWithCampaignLock(campaignId, async () => {
      this.snapshots.delete(campaignId);
    });
  }

  async commitExtraction<T>(
    campaignId: string, source: ExtractionSource,
    apply: (snapshot: CampaignMemorySnapshot) => Promise<{ value: T; hasMutations: boolean }>
  ): Promise<ExtractionCommit<T>> {
    return this.executeWithCampaignLock(campaignId, async () => {
      const latest = this.snapshots.get(campaignId) || null;
      const message = (this.messagesByCampaign.get(campaignId) || []).find((m) => m.id === source.messageId);
      const status = extractionStatus(message, latest, source);
      if (status) return { status };
      const working = cloneSnapshot(latest || this.createDefaultSnapshot(campaignId));
      const result = await apply(working);
      working.extractionReceipts = { ...working.extractionReceipts,
        [source.messageId]: { revision: source.revision, turn: source.turn, hasMutations: result.hasMutations } };
      working.updatedAt = Date.now();
      this.snapshots.set(campaignId, cloneSnapshot(working));
      return { status: 'applied', value: cloneSnapshot(result.value) };
    });
  }

  async saveMessage(campaignId: string, message: ChatMessage): Promise<void> {
    if (!this.messagesByCampaign.has(campaignId)) {
      this.messagesByCampaign.set(campaignId, []);
    }
    this.messagesByCampaign.get(campaignId)!.push(message);
  }

  async getMessages(campaignId: string, limit: number = 30): Promise<ChatMessage[]> {
    const list = this.messagesByCampaign.get(campaignId) || [];
    if (limit <= 0 || list.length <= limit) {
      return [...list];
    }
    return list.slice(list.length - limit);
  }

  async updateMessage(campaignId: string, messageId: string, updates: Partial<ChatMessage>): Promise<boolean> {
    return this.executeWithCampaignLock(campaignId, async () => {
    const list = this.messagesByCampaign.get(campaignId) || [];
    const index = list.findIndex((m) => m.id === messageId);
    if (index === -1) return false;
    const changed = revisesNarrative(list[index], updates);
    if (changed) assertRevisable(list[index], this.snapshots.get(campaignId) || null);
    list[index] = { ...list[index], ...updates,
      metadata: { ...list[index].metadata, ...updates.metadata },
      revision: (list[index].revision ?? 0) + (changed ? 1 : 0) };
    return true;
    });
  }

  async replaceMessage(campaignId: string, messageId: string, newMessage: ChatMessage, expectedRevision?: number): Promise<ChatMessage> {
    return this.executeWithCampaignLock(campaignId, async () => {
    const list = this.messagesByCampaign.get(campaignId) || [];
    const index = list.findIndex((m) => m.id === messageId);
    if (index === -1) {
      throw new Error(`Mensagem ${messageId} não encontrada para substituição na campanha ${campaignId}.`);
    }
    const newList = [...list];
    assertRevisable(list[index], this.snapshots.get(campaignId) || null, expectedRevision);
    newList[index] = { ...newMessage, revision: (list[index].revision ?? 0) + 1 };
    this.messagesByCampaign.set(campaignId, newList);
    return newList[index];
    });
  }

  async replaceTurnMessages(
    campaignId: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    expected?: ExpectedTurnState
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    return this.executeWithCampaignLock(campaignId, async () => {
    const list = this.messagesByCampaign.get(campaignId) || [];

    if (expected) {
      const userIndex = list.findIndex((m) => m.id === expected.userMessageId);
      if (userIndex === -1) {
        throw new Error(`Conflito detectado: mensagem do jogador ${expected.userMessageId} não encontrada.`);
      }
      if (list[userIndex].content !== expected.userContent) {
        throw new Error('Conflito detectado: o conteúdo da ação do jogador foi alterado durante a geração.');
      }
      if (expected.userTurn !== undefined && list[userIndex].turn !== expected.userTurn) {
        throw new Error('Conflito detectado: o turno da mensagem do jogador foi alterado.');
      }

      if (expected.assistantMessageId) {
        const assistantIndex = list.findIndex((m) => m.id === expected.assistantMessageId);
        if (assistantIndex === -1) {
          throw new Error(`Conflito detectado: resposta do narrador ${expected.assistantMessageId} não encontrada.`);
        }
        if (list[assistantIndex].content !== expected.assistantContent) {
          throw new Error('Conflito detectado: a resposta do narrador foi alterada durante a geração.');
        }
        if (expected.assistantTurn !== undefined && list[assistantIndex].turn !== expected.assistantTurn) {
          throw new Error('Conflito detectado: o turno da resposta do narrador foi alterado.');
        }
        if (list[assistantIndex].metadata?.hasMutations) {
          throw new Error('Conflito detectado: o estado foi consolidado durante a geração e não pode mais ser editado.');
        }
        if (assistantIndex !== list.length - 1) {
          throw new Error('Conflito detectado: novas mensagens foram inseridas no histórico após a resposta.');
        }
      } else {
        if (userIndex !== list.length - 1) {
          throw new Error('Conflito detectado: novas mensagens foram inseridas no histórico após a ação do usuário.');
        }
      }
    }

    const userIndex = list.findIndex((m) => m.id === userMessage.id);
    if (userIndex === -1) {
      throw new Error(`Mensagem ${userMessage.id} não encontrada para substituição na campanha ${campaignId}.`);
    }

    const newList = [...list];
    newList[userIndex] = { ...userMessage, revision: (list[userIndex].revision ?? 0) + 1 };

    const assistantIndex = assistantMessage.id ? newList.findIndex((m) => m.id === assistantMessage.id) : -1;
    if (assistantIndex !== -1) {
      assertRevisable(list[assistantIndex], this.snapshots.get(campaignId) || null, expected?.assistantRevision);
      newList[assistantIndex] = { ...assistantMessage, revision: (list[assistantIndex].revision ?? 0) + 1 };
    } else {
      newList.splice(userIndex + 1, 0, { ...assistantMessage });
    }

    this.messagesByCampaign.set(campaignId, newList);
    const finalUser = newList[userIndex];
    const finalAssistant = assistantIndex !== -1 ? newList[assistantIndex] : newList[userIndex + 1];

    return {
      userMessage: finalUser,
      assistantMessage: finalAssistant,
    };
    });
  }

  async deleteMessage(campaignId: string, messageId: string): Promise<boolean> {
    const list = this.messagesByCampaign.get(campaignId) || [];
    const initialLen = list.length;
    const filtered = list.filter((m) => m.id !== messageId);
    this.messagesByCampaign.set(campaignId, filtered);
    return filtered.length < initialLen;
  }

  async clearMessages(campaignId: string): Promise<void> {
    this.messagesByCampaign.delete(campaignId);
  }
}
