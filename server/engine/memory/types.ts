/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  turn: number;
  metadata?: {
    actionType?: 'dialogue' | 'action' | 'investigation' | 'system';
    location?: string;
    hasMutations?: boolean;
    diceRolls?: any[];
    executedTools?: any[];
  };
}

/**
 * 1. Campaign: Metadados estruturados da campanha
 */
export interface Campaign {
  campaignId: string;
  name: string;
  createdAt: number;
  currentDate: string;
  currentLocation: string;
}

/**
 * 2. NPC: Registro persistente de personagens não-jogadores
 */
export interface NPC {
  id: string;
  name: string;
  status: string; // 'alive' | 'dead' | 'missing' | 'unconscious' | string
  location: string;
  faction: string;
  personalityNotes: string;
  goals: string[];
  secrets: string[];
  inventory: string[];
  relationships: Record<string, string>;
}

/**
 * 3. Event: Fatos e acontecimentos cronológicos ocorridos no mundo
 */
export interface Event {
  id: string;
  timestamp: number;
  location: string;
  participants: string[];
  description: string;
  consequences: string[];
}

export type TruthStatus =
  | 'true'
  | 'false'
  | 'partial'
  | 'rumor'
  | 'suspicion'
  | 'belief'
  | 'hypothesis'
  | 'myth'
  | string;

export type EpistemicStatus = 
  | 'WORLD_TRUTH' 
  | 'DIRECT_OBSERVATION' 
  | 'REPORTED_INFORMATION' 
  | 'RUMOR' 
  | 'SUSPICION' 
  | 'INFERENCE' 
  | 'BELIEF' 
  | 'FALSE_BELIEF' 
  | 'DISPUTED' 
  | 'UNKNOWN';

/**
 * 4. Knowledge: Fatos, segredos, lore, crenças, suspeitas e boatos
 */
export interface Knowledge {
  id: string;
  fact: string;
  truthStatus: TruthStatus; // 'true' | 'false' | 'partial' | 'rumor' | 'suspicion' | 'belief' | 'hypothesis'
  knownBy: string[];
  suspectedBy: string[];
  source: string;
  reliability: number; // 1 to 10
  isWorldTruth?: boolean; // Verdade objetiva canônica do mundo
  isPublicKnowledge?: boolean; // Conhecimento público / geral
  
  // Novos campos epistemológicos
  epistemicStatus?: EpistemicStatus;
  knowledgeType?: string;
  confidence?: number;
  observedBy?: string[];
  believedBy?: string[];
  disputedBy?: string[];
  evidence?: string[];
  relatedKnowledge?: string[];
  acquiredAt?: number;
  lastUpdatedAt?: number;
  informationChain?: string[];
}

/**
 * Agrupamento isolado e estruturado de conhecimento por personagem
 */
export interface CharacterKnowledgeBundle {
  characterName: string;
  characterId?: string;
  knownFacts: Knowledge[]; // Fatos autorizados que o personagem sabe
  rumors: Knowledge[]; // Rumores e boatos conhecidos pelo personagem
  suspicions: Knowledge[]; // Suspeitas formuladas ou sustentadas pelo personagem
  beliefs: Knowledge[]; // Crenças, convicções ou hipóteses pessoais
  witnessedEvents: Event[]; // Eventos que o personagem presenciou
  sources: string[]; // Fontes conhecidas pelo personagem
}

/**
 * 5. Relationship: Conexões interpessoais estruturadas entre entidades
 */
export interface Relationship {
  characterA: string;
  characterB: string;
  trust: number; // -100 to 100
  hostility: number; // -100 to 100
  familiarity: number; // 0 to 10
  importantHistory: string[];
}

/**
 * 6. Inventory: Itens possuídos por personagens ou armazenados em locais
 */
export interface InventoryItem {
  owner: string; // characterId, characterName ou containerId
  item: string;
  quantity: number;
}

/**
 * 7. Quest: Missões, contratos, objetivos e investigações em andamento
 */
export interface QuestObjective {
  id?: string;
  description: string;
  isCompleted: boolean;
}

export interface Quest {
  id: string;
  title: string;
  status: string; // 'active' | 'completed' | 'failed' | 'abandoned' | string
  participants: string[];
  objectives: QuestObjective[] | string[];
  consequences: string[];
}

export interface SemanticRecord {
  id: string; // The same id as the canonical record (e.g. event.id, knowledge.id)
  type: 'event' | 'knowledge' | 'quest' | 'npc' | 'relationship';
  text: string; // The text representation that was embedded
  embedding: number[];
  updatedAt: number;
}

/**
 * Estrutura completa de persistência isolada por campanha
 */
export interface CampaignMemorySnapshot {
  campaign: Campaign;
  npcs: Record<string, NPC>;
  events: Event[];
  knowledge: Knowledge[];
  relationships: Relationship[];
  inventory: InventoryItem[];
  quests: Quest[];
  semanticRecords?: SemanticRecord[];
  updatedAt: number;
}

/**
 * Parâmetros para consulta determinística de contexto relevante por turno
 */
export interface RelevantContextParams {
  campaignId: string;
  currentLocation?: string;
  presentNPCs?: string[];
  playerCharacter?: string;
  conversationSubject?: string;
  recentEventsCount?: number;
  targetCharacter?: string;
}

/**
 * Retorno estruturado do contexto relevante selecionado deterministicamente
 */
export interface RelevantContextOutput {
  campaign: Campaign | null;
  location: string;
  presentNPCs: NPC[];
  relationships: Relationship[];
  relevantQuests: Quest[];
  relevantKnowledge: Knowledge[];
  relevantEvents: Event[];
  inventories: InventoryItem[];
  formattedSummary: string;
}

export interface ExpectedTurnState {
  userMessageId: string;
  userContent: string;
  userTurn?: number;
  assistantMessageId?: string | null;
  assistantContent?: string | null;
  assistantTurn?: number;
}

/**
 * Interface do Store persistente para a Memory Layer
 */
export interface IPersistentMemoryStore {
  // Snapshot / Snapshot storage
  getSnapshot(campaignId: string): Promise<CampaignMemorySnapshot | null>;
  saveSnapshot(snapshot: CampaignMemorySnapshot): Promise<void>;
  clearSnapshot(campaignId: string): Promise<void>;

  // Mensagens do chat (armazenadas separadamente da memória estruturada)
  saveMessage(campaignId: string, message: ChatMessage): Promise<void>;
  getMessages(campaignId: string, limit?: number): Promise<ChatMessage[]>;
  updateMessage(campaignId: string, messageId: string, updates: Partial<ChatMessage>): Promise<boolean>;
  replaceMessage(campaignId: string, messageId: string, newMessage: ChatMessage): Promise<ChatMessage>;
  replaceTurnMessages(
    campaignId: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    expected?: ExpectedTurnState
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>;
  deleteMessage(campaignId: string, messageId: string): Promise<boolean>;
  clearMessages(campaignId: string): Promise<void>;
}

/**
 * Log de auditoria das operações executadas na Memory Layer
 */
export interface MemoryOperationLog {
  id: string;
  timestamp: number;
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'QUERY_CONTEXT' | string;
  functionName: string;
  entity: string;
  campaignId: string;
  status: 'success' | 'error';
  details?: string;
  error?: string;
}
