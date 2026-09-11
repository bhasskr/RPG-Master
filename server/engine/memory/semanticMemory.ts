import { GoogleGenAI } from '@google/genai';
import { CampaignMemorySnapshot, SemanticRecord, Knowledge, Event, NPC, Quest, Relationship } from './types';

export interface SemanticSearchResult {
  record: SemanticRecord;
  score: number;
}

export class SemanticMemoryManager {
  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: 4000,
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return this.aiClient;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const client = this.getClient();
    if (!client) {
      return [];
    }

    try {
      const response = await client.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text,
      });
      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      console.warn('[SemanticMemory] Erro ou timeout ao gerar embedding (fallback determinístico ativado):', error);
      return [];
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || !a.length || !b.length || a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async indexEntity(
    id: string,
    type: SemanticRecord['type'],
    text: string,
    snapshot: CampaignMemorySnapshot
  ): Promise<void> {
    if (!snapshot.semanticRecords) {
      snapshot.semanticRecords = [];
    }
    
    const existing = snapshot.semanticRecords.find(r => r.id === id && r.type === type);
    if (existing && existing.text === text) {
      return;
    }

    const embedding = await this.generateEmbedding(text);
    if (!embedding || embedding.length === 0) {
      return;
    }

    const newRecord: SemanticRecord = {
      id,
      type,
      text,
      embedding,
      updatedAt: Date.now()
    };

    if (existing) {
      Object.assign(existing, newRecord);
    } else {
      snapshot.semanticRecords.push(newRecord);
    }
  }

  async semanticSearch(
    query: string,
    snapshot: CampaignMemorySnapshot,
    limit: number = 10
  ): Promise<SemanticSearchResult[]> {
    if (!snapshot.semanticRecords || snapshot.semanticRecords.length === 0) {
      return [];
    }
    
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return [];
    }

    const results: SemanticSearchResult[] = [];
    for (const record of snapshot.semanticRecords) {
      const score = this.cosineSimilarity(queryEmbedding, record.embedding);
      if (score > 0.4) {
        results.push({ record, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  formatKnowledge(k: Knowledge): string {
    return `[${k.truthStatus.toUpperCase()}] ${k.isWorldTruth ? 'FATO DO MUNDO' : 'CONHECIMENTO'}: ${k.fact}`;
  }
  
  formatEvent(e: Event): string {
    return `EVENTO em ${e.location}: ${e.description} (Envolvidos: ${e.participants.join(', ')})`;
  }

  formatNPC(npc: NPC): string {
    return `NPC ${npc.name}: Status ${npc.status}, Local ${npc.location}. ${npc.personalityNotes} Segredos: ${npc.secrets.join('; ')}`;
  }
  
  formatQuest(q: Quest): string {
    return `QUEST: ${q.title} (${q.status}).`;
  }
  
  formatRelationship(r: Relationship): string {
     return `RELAÇÃO entre ${r.characterA} e ${r.characterB}: Confiança ${r.trust}, Hostilidade ${r.hostility}. Histórico: ${r.importantHistory.join('; ')}`;
  }
}
