/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IPersistentMemoryStore,
  CampaignMemorySnapshot,
  ChatMessage,
} from './types';

/**
 * InMemoryStore
 * Implementação puramente em memória de IPersistentMemoryStore para testes unitários.
 */
export class InMemoryStore implements IPersistentMemoryStore {
  private snapshots: Map<string, CampaignMemorySnapshot> = new Map();
  private messagesByCampaign: Map<string, ChatMessage[]> = new Map();

  async getSnapshot(campaignId: string): Promise<CampaignMemorySnapshot | null> {
    const s = this.snapshots.get(campaignId);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  async saveSnapshot(snapshot: CampaignMemorySnapshot): Promise<void> {
    this.snapshots.set(snapshot.campaign.campaignId, JSON.parse(JSON.stringify(snapshot)));
  }

  async clearSnapshot(campaignId: string): Promise<void> {
    this.snapshots.delete(campaignId);
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
    const list = this.messagesByCampaign.get(campaignId) || [];
    const index = list.findIndex((m) => m.id === messageId);
    if (index === -1) return false;
    list[index] = { ...list[index], ...updates };
    return true;
  }

  async replaceMessage(campaignId: string, messageId: string, newMessage: ChatMessage): Promise<ChatMessage> {
    const list = this.messagesByCampaign.get(campaignId) || [];
    const index = list.findIndex((m) => m.id === messageId);
    if (index === -1) {
      throw new Error(`Mensagem ${messageId} não encontrada para substituição na campanha ${campaignId}.`);
    }
    const newList = [...list];
    newList[index] = { ...newMessage };
    this.messagesByCampaign.set(campaignId, newList);
    return newList[index];
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
