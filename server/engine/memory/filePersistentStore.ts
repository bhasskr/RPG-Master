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
  ExpectedTurnState,
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
function cloneSnapshot(snapshot: CampaignMemorySnapshot): CampaignMemorySnapshot {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot);
  }
  return JSON.parse(JSON.stringify(snapshot));
}

export class FilePersistentMemoryStore implements IPersistentMemoryStore {
  private dataDir: string;
  private isInitialized = false;

  // Cache em memória indexado por campaignId
  private snapshotCache: Map<string, CampaignMemorySnapshot> = new Map();
  private messagesCache: Map<string, ChatMessage[]> = new Map();

  // Fila de escrita para coordenar operações no mesmo arquivo de mensagens
  private writeQueues: Map<string, Promise<any>> = new Map();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), 'data', 'rpg_memory');
  }

  private async executeWithCampaignWriteLock<T>(campaignId: string, task: () => Promise<T>): Promise<T> {
    const currentQueue = this.writeQueues.get(campaignId) || Promise.resolve();
    
    const nextPromise = currentQueue
      .catch(() => {})
      .then(async () => {
        return await task();
      });

    this.writeQueues.set(campaignId, nextPromise);
    return await nextPromise;
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

    // 1. Verifica cache em memória (retorna cópia destacada profunda para isolamento total)
    if (this.snapshotCache.has(campaignId)) {
      return cloneSnapshot(this.snapshotCache.get(campaignId)!);
    }

    // 2. Tenta carregar do arquivo em disco
    const filePath = this.getMemoryFilePath(campaignId);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const snapshot: CampaignMemorySnapshot = JSON.parse(data);
      this.snapshotCache.set(campaignId, cloneSnapshot(snapshot));
      return cloneSnapshot(snapshot);
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

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      // 1. Constrói cópia de trabalho isolada e carimba data de atualização
      const workingCopy = cloneSnapshot(snapshot);
      workingCopy.updatedAt = Date.now();

      // 2. Caminhos do arquivo temporário e final
      const filePath = this.getMemoryFilePath(campaignId);
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(workingCopy, null, 2);

      try {
        // 3. Escreve no arquivo temporário
        await fs.writeFile(tempPath, serialized, 'utf-8');
        // 4. Renomeia atomicamente
        await fs.rename(tempPath, filePath);
      } catch (err) {
        // Limpeza segura do temporário se gerado
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignora se o temporário não existia
        }
        console.error(`[FilePersistentMemoryStore] Falha ao persistir snapshot ${campaignId}:`, err);
        // O cache NÃO é alterado em falha. A última versão confirmada permanece intacta.
        throw err;
      }

      // 5. Atualização do cache somente após confirmação da persistência em disco
      this.snapshotCache.set(campaignId, cloneSnapshot(workingCopy));
    });
  }

  async clearSnapshot(campaignId: string): Promise<void> {
    await this.ensureInitialized();

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      const filePath = this.getMemoryFilePath(campaignId);
      try {
        await fs.unlink(filePath);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          // ENOENT pode ser tratado como estado já removido
        } else {
          // Qualquer outro erro de unlink deve ser propagado e o cache anterior deve continuar disponível
          console.error(`[FilePersistentMemoryStore] Erro ao deletar snapshot ${campaignId}:`, err);
          throw err;
        }
      }

      // Somente depois de confirmada a remoção no disco, remove do cache
      this.snapshotCache.delete(campaignId);
    });
  }

  private async loadMessagesFromDisk(campaignId: string): Promise<ChatMessage[]> {
    const filePath = this.getMessagesFilePath(campaignId);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed: ChatMessage[] = JSON.parse(data);
      this.messagesCache.set(campaignId, parsed);
      return parsed;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[FilePersistentMemoryStore] Aviso ao carregar chat de ${campaignId}:`, err);
      }
      this.messagesCache.set(campaignId, []);
      return [];
    }
  }

  async saveMessage(campaignId: string, message: ChatMessage): Promise<void> {
    await this.ensureInitialized();

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      if (!this.messagesCache.has(campaignId)) {
        await this.loadMessagesFromDisk(campaignId);
      }

      const currentMessages = this.messagesCache.get(campaignId) || [];
      const updatedMessages = [...currentMessages, message];

      const filePath = this.getMessagesFilePath(campaignId);
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(updatedMessages, null, 2);

      try {
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignore cleanup error
        }
        console.error(`[FilePersistentMemoryStore] Falha ao persistir mensagem de ${campaignId}:`, err);
        throw err;
      }

      this.messagesCache.set(campaignId, updatedMessages);
    });
  }

  async getMessages(campaignId: string, limit: number = 50): Promise<ChatMessage[]> {
    await this.ensureInitialized();

    if (!this.messagesCache.has(campaignId)) {
      await this.loadMessagesFromDisk(campaignId);
    }

    const list = this.messagesCache.get(campaignId) || [];
    if (limit <= 0 || list.length <= limit) {
      return [...list];
    }
    return list.slice(list.length - limit);
  }

  async updateMessage(campaignId: string, messageId: string, updates: Partial<ChatMessage>): Promise<boolean> {
    await this.ensureInitialized();

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      if (!this.messagesCache.has(campaignId)) {
        await this.loadMessagesFromDisk(campaignId);
      }

      const currentMessages = this.messagesCache.get(campaignId) || [];
      const index = currentMessages.findIndex((m) => m.id === messageId);
      if (index === -1) return false;

      const mergedMetadata = { ...currentMessages[index].metadata, ...updates.metadata };
      const updatedMessages = [...currentMessages];
      updatedMessages[index] = {
        ...currentMessages[index],
        ...updates,
        metadata: mergedMetadata,
      };

      const filePath = this.getMessagesFilePath(campaignId);
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(updatedMessages, null, 2);

      try {
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignore cleanup error
        }
        console.error(`[FilePersistentMemoryStore] Falha ao atualizar mensagem de ${campaignId}:`, err);
        throw err;
      }

      this.messagesCache.set(campaignId, updatedMessages);
      return true;
    });
  }

  async replaceMessage(campaignId: string, messageId: string, newMessage: ChatMessage): Promise<ChatMessage> {
    await this.ensureInitialized();

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      if (!this.messagesCache.has(campaignId)) {
        await this.loadMessagesFromDisk(campaignId);
      }

      const currentMessages = this.messagesCache.get(campaignId) || [];
      const index = currentMessages.findIndex((m) => m.id === messageId);
      if (index === -1) {
        throw new Error(`Mensagem ${messageId} não encontrada para substituição na campanha ${campaignId}.`);
      }

      // Cria cópia sem mutar o array em cache antes da confirmação em disco
      const updatedMessages = [...currentMessages];
      updatedMessages[index] = { ...newMessage };

      const filePath = this.getMessagesFilePath(campaignId);
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(updatedMessages, null, 2);

      try {
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignore cleanup error
        }
        console.error(`[FilePersistentMemoryStore] Falha ao persistir substituição de mensagem em ${campaignId}:`, err);
        // O cache NÃO foi alterado!
        throw err;
      }

      // Somente após gravação confirmada no disco, atualiza o cache
      this.messagesCache.set(campaignId, updatedMessages);
      return updatedMessages[index];
    });
  }

  async replaceTurnMessages(
    campaignId: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    expected?: ExpectedTurnState
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    await this.ensureInitialized();

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      if (!this.messagesCache.has(campaignId)) {
        await this.loadMessagesFromDisk(campaignId);
      }

      const currentMessages = this.messagesCache.get(campaignId) || [];

      // Se foi fornecido o estado esperado, valida estritamente antes de aplicar qualquer alteração
      if (expected) {
        const userIndex = currentMessages.findIndex((m) => m.id === expected.userMessageId);
        if (userIndex === -1) {
          throw new Error(`Conflito detectado: mensagem do jogador ${expected.userMessageId} não encontrada.`);
        }
        if (currentMessages[userIndex].content !== expected.userContent) {
          throw new Error('Conflito detectado: o conteúdo da ação do jogador foi alterado durante a geração.');
        }
        if (expected.userTurn !== undefined && currentMessages[userIndex].turn !== expected.userTurn) {
          throw new Error('Conflito detectado: o turno da mensagem do jogador foi alterado.');
        }

        if (expected.assistantMessageId) {
          const assistantIndex = currentMessages.findIndex((m) => m.id === expected.assistantMessageId);
          if (assistantIndex === -1) {
            throw new Error(`Conflito detectado: resposta do narrador ${expected.assistantMessageId} não encontrada.`);
          }
          if (currentMessages[assistantIndex].content !== expected.assistantContent) {
            throw new Error('Conflito detectado: a resposta do narrador foi alterada durante a geração.');
          }
          if (expected.assistantTurn !== undefined && currentMessages[assistantIndex].turn !== expected.assistantTurn) {
            throw new Error('Conflito detectado: o turno da resposta do narrador foi alterado.');
          }
          if (currentMessages[assistantIndex].metadata?.hasMutations) {
            throw new Error('Conflito detectado: o estado foi consolidado durante a geração e não pode mais ser editado.');
          }
          if (assistantIndex !== currentMessages.length - 1) {
            throw new Error('Conflito detectado: novas mensagens foram inseridas no histórico após a resposta.');
          }
        } else {
          if (userIndex !== currentMessages.length - 1) {
            throw new Error('Conflito detectado: novas mensagens foram inseridas no histórico após a ação do usuário.');
          }
        }
      }

      const userIndex = currentMessages.findIndex((m) => m.id === userMessage.id);
      if (userIndex === -1) {
        throw new Error(`Mensagem ${userMessage.id} não encontrada para substituição na campanha ${campaignId}.`);
      }

      // Cria cópia sem mutar o array em cache antes da confirmação em disco
      const updatedMessages = [...currentMessages];
      updatedMessages[userIndex] = { ...userMessage };

      const assistantIndex = assistantMessage.id ? updatedMessages.findIndex((m) => m.id === assistantMessage.id) : -1;
      if (assistantIndex !== -1) {
        updatedMessages[assistantIndex] = { ...assistantMessage };
      } else {
        updatedMessages.splice(userIndex + 1, 0, { ...assistantMessage });
      }

      const filePath = this.getMessagesFilePath(campaignId);
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(updatedMessages, null, 2);

      try {
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignore cleanup error
        }
        console.error(`[FilePersistentMemoryStore] Falha ao persistir substituição de par de mensagens em ${campaignId}:`, err);
        // O cache NÃO foi alterado!
        throw err;
      }

      // Somente após gravação confirmada no disco, atualiza o cache
      this.messagesCache.set(campaignId, updatedMessages);

      const finalUser = updatedMessages[userIndex];
      const finalAssistant = assistantIndex !== -1 ? updatedMessages[assistantIndex] : updatedMessages[userIndex + 1];

      return {
        userMessage: finalUser,
        assistantMessage: finalAssistant,
      };
    });
  }

  async deleteMessage(campaignId: string, messageId: string): Promise<boolean> {
    await this.ensureInitialized();

    return this.executeWithCampaignWriteLock(campaignId, async () => {
      if (!this.messagesCache.has(campaignId)) {
        await this.loadMessagesFromDisk(campaignId);
      }

      const currentMessages = this.messagesCache.get(campaignId) || [];
      const index = currentMessages.findIndex((m) => m.id === messageId);
      if (index === -1) return false;

      const updatedMessages = currentMessages.filter((m) => m.id !== messageId);

      const filePath = this.getMessagesFilePath(campaignId);
      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const serialized = JSON.stringify(updatedMessages, null, 2);

      try {
        await fs.writeFile(tempPath, serialized, 'utf-8');
        await fs.rename(tempPath, filePath);
      } catch (err) {
        try {
          await fs.unlink(tempPath);
        } catch {
          // ignore cleanup error
        }
        console.error(`[FilePersistentMemoryStore] Falha ao deletar mensagem de ${campaignId}:`, err);
        throw err;
      }

      this.messagesCache.set(campaignId, updatedMessages);
      return true;
    });
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
