/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IPersistentMemoryStore,
  CampaignMemorySnapshot,
  ChatMessage,
  ExpectedTurnState,
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

  async replaceTurnMessages(
    campaignId: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    expected?: ExpectedTurnState
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
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
    newList[userIndex] = { ...userMessage };

    const assistantIndex = assistantMessage.id ? newList.findIndex((m) => m.id === assistantMessage.id) : -1;
    if (assistantIndex !== -1) {
      newList[assistantIndex] = { ...assistantMessage };
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
