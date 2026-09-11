/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import {
  IPersistentMemoryStore,
  CampaignMemorySnapshot,
  ChatMessage,
} from './types';

/**
 * FilePersistentMemoryStore
 * 
 * Mecanismo de persistência local em disco no backend:
 * - Armazena os dados estruturados em arquivos JSON na pasta ./data/rpg_memory/
 * - Mantém cache em memória para leituras instantâneas e sem overhead de I/O
 * - Salva mensagens de chat separadamente das estruturas de memória
 * - Garante persistência determinística mesmo após reinicialização do servidor Node
 */
export class FilePersistentMemoryStore implements IPersistentMemoryStore {
  private dataDir: string;
  private isInitialized = false;

  // Cache em memória indexado por campaignId
  private snapshotCache: Map<string, CampaignMemorySnapshot> = new Map();
  private messagesCache: Map<string, ChatMessage[]> = new Map();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data', 'rpg_memory');
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      this.isInitialized = true;
    } catch (err) {
      console.error('[FilePersistentMemoryStore] Erro ao criar diretório de dados:', err);
    }
  }

  private getMemoryFilePath(campaignId: string): string {
    const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.dataDir, `memory_${safeId}.json`);
  }

  private getMessagesFilePath(campaignId: string): string {
    const safeId = campaignId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.dataDir, `chat_${safeId}.json`);
  }

  async getSnapshot(campaignId: string): Promise<CampaignMemorySnapshot | null> {
    await this.ensureInitialized();

    // 1. Verifica cache em memória
    if (this.snapshotCache.has(campaignId)) {
      return this.snapshotCache.get(campaignId)!;
    }

    // 2. Tenta carregar do arquivo em disco
    const filePath = this.getMemoryFilePath(campaignId);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const snapshot: CampaignMemorySnapshot = JSON.parse(data);
      this.snapshotCache.set(campaignId, snapshot);
      return snapshot;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      console.warn(`[FilePersistentMemoryStore] Aviso ao ler memória da campanha ${campaignId}:`, err);
      return null;
    }
  }

  async saveSnapshot(snapshot: CampaignMemorySnapshot): Promise<void> {
    await this.ensureInitialized();
    const campaignId = snapshot.campaign.campaignId;

    // Atualiza cache em memória
    snapshot.updatedAt = Date.now();
    this.snapshotCache.set(campaignId, snapshot);

    // Escreve no disco de forma assíncrona e segura
    const filePath = this.getMemoryFilePath(campaignId);
    try {
      const serialized = JSON.stringify(snapshot, null, 2);
      await fs.writeFile(filePath, serialized, 'utf-8');
    } catch (err) {
      console.error(`[FilePersistentMemoryStore] Falha ao persistir snapshot ${campaignId}:`, err);
    }
  }

  async clearSnapshot(campaignId: string): Promise<void> {
    await this.ensureInitialized();
    this.snapshotCache.delete(campaignId);

    const filePath = this.getMemoryFilePath(campaignId);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[FilePersistentMemoryStore] Erro ao deletar snapshot ${campaignId}:`, err);
      }
    }
  }

  async saveMessage(campaignId: string, message: ChatMessage): Promise<void> {
    await this.ensureInitialized();

    // Carrega mensagens para o cache se ainda não estiver carregado
    if (!this.messagesCache.has(campaignId)) {
      await this.getMessages(campaignId, 1000);
    }

    const messages = this.messagesCache.get(campaignId) || [];
    messages.push(message);
    this.messagesCache.set(campaignId, messages);

    // Persiste arquivo de chat no disco
    const filePath = this.getMessagesFilePath(campaignId);
    try {
      const serialized = JSON.stringify(messages, null, 2);
      await fs.writeFile(filePath, serialized, 'utf-8');
    } catch (err) {
      console.error(`[FilePersistentMemoryStore] Falha ao persistir mensagens de ${campaignId}:`, err);
    }
  }

  async getMessages(campaignId: string, limit: number = 50): Promise<ChatMessage[]> {
    await this.ensureInitialized();

    if (!this.messagesCache.has(campaignId)) {
      const filePath = this.getMessagesFilePath(campaignId);
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed: ChatMessage[] = JSON.parse(data);
        this.messagesCache.set(campaignId, parsed);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.warn(`[FilePersistentMemoryStore] Aviso ao carregar chat de ${campaignId}:`, err);
        }
        this.messagesCache.set(campaignId, []);
      }
    }

    const list = this.messagesCache.get(campaignId) || [];
    if (limit <= 0 || list.length <= limit) {
      return [...list];
    }
    return list.slice(list.length - limit);
  }

  async updateMessage(campaignId: string, messageId: string, updates: Partial<ChatMessage>): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.messagesCache.has(campaignId)) {
      await this.getMessages(campaignId, 1000);
    }
    const messages = this.messagesCache.get(campaignId) || [];
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      const mergedMetadata = { ...messages[index].metadata, ...updates.metadata };
      messages[index] = { ...messages[index], ...updates, metadata: mergedMetadata };
      this.messagesCache.set(campaignId, messages);
      const filePath = this.getMessagesFilePath(campaignId);
      try {
        const serialized = JSON.stringify(messages, null, 2);
        await fs.writeFile(filePath, serialized, 'utf-8');
        return true;
      } catch (err) {
        console.error(`[FilePersistentMemoryStore] Falha ao atualizar mensagem:`, err);
      }
    }
    return false;
  }

  async deleteMessage(campaignId: string, messageId: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.messagesCache.has(campaignId)) {
      await this.getMessages(campaignId, 1000);
    }
    const messages = this.messagesCache.get(campaignId) || [];
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages.splice(index, 1);
      this.messagesCache.set(campaignId, messages);
      const filePath = this.getMessagesFilePath(campaignId);
      try {
        const serialized = JSON.stringify(messages, null, 2);
        await fs.writeFile(filePath, serialized, 'utf-8');
        return true;
      } catch (err) {
        console.error(`[FilePersistentMemoryStore] Falha ao deletar mensagem:`, err);
      }
    }
    return false;
  }

  async clearMessages(campaignId: string): Promise<void> {
    await this.ensureInitialized();
    this.messagesCache.delete(campaignId);

    const filePath = this.getMessagesFilePath(campaignId);
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[FilePersistentMemoryStore] Erro ao deletar mensagens ${campaignId}:`, err);
      }
    }
  }
}
