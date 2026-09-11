/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NPC, Event, Knowledge, Relationship, InventoryItem, Quest, CampaignMemorySnapshot, TruthStatus } from '../types';
import { WorldState } from '../../gameState/types';

export type EventCategory =
  | 'death'
  | 'discovery'
  | 'political_change'
  | 'combat'
  | 'betrayal'
  | 'agreement'
  | 'location_discovery'
  | 'world_change'
  | 'objective_outcome'
  | 'other';

export interface ExtractedEvent {
  id?: string;
  location: string;
  participants: string[];
  description: string;
  consequences: string[];
  category?: EventCategory;
}

export interface ExtractedKnowledgeChange {
  id?: string;
  fact: string;
  truthStatus: TruthStatus;
  knownBy: string[];
  suspectedBy?: string[];
  source?: string;
  reliability?: number;
  isWorldTruth?: boolean;
  isPublicKnowledge?: boolean;
  action?: 'create' | 'update' | 'add_known_by';

  // Novos campos epistemológicos
  epistemicStatus?: string;
  knowledgeType?: string;
  confidence?: number;
  observedBy?: string[];
  believedBy?: string[];
  disputedBy?: string[];
  informationChain?: string[];
}

export interface ExtractedRelationshipChange {
  characterA: string;
  characterB: string;
  trustChange?: number;
  hostilityChange?: number;
  familiarityChange?: number;
  trust?: number;
  hostility?: number;
  familiarity?: number;
  reason?: string;
  importantHistory?: string[];
}

export interface ExtractedInventoryChange {
  owner: string;
  item: string;
  action: 'acquired' | 'lost' | 'consumed' | 'broken' | 'stolen' | 'quantity_changed';
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
}

export interface ExtractedQuestChange {
  questId?: string;
  title: string;
  action: 'created' | 'objective_completed' | 'objective_failed' | 'status_changed' | 'abandoned';
  status?: 'active' | 'completed' | 'failed' | 'abandoned' | string;
  objectiveDescription?: string;
  participants?: string[];
  consequences?: string[];
}

export interface ExtractedNPCChange {
  npcIdOrName: string;
  statusChange?: 'alive' | 'dead' | 'unconscious' | 'injured' | string;
  locationChange?: string;
  factionChange?: string;
  goalChange?: string[];
  itemChange?: string[];
  notes?: string;
}

export interface ExtractedWorldChange {
  locationOrRegion: string;
  changeType:
    | 'destroyed'
    | 'governance'
    | 'border'
    | 'war'
    | 'closed'
    | 'faction_defeated'
    | 'disaster'
    | 'economic_political'
    | string;
  description: string;
  isPermanent: boolean;
}

export interface MemoryConflict {
  type:
    | 'KNOWLEDGE_CONFLICT'
    | 'NPC_STATE_CONFLICT'
    | 'INVENTORY_CONFLICT'
    | 'QUEST_CONFLICT'
    | 'EPISTEMIC_VIOLATION'
    | string;
  existing: string;
  proposed: string;
  reason: string;
}

/**
 * Retorno JSON estruturado estrito gerado pelo Memory Extractor
 */
export interface MemoryExtractionResult {
  events: ExtractedEvent[];
  knowledgeChanges: ExtractedKnowledgeChange[];
  relationshipChanges: ExtractedRelationshipChange[];
  inventoryChanges: ExtractedInventoryChange[];
  questChanges: ExtractedQuestChange[];
  npcChanges: ExtractedNPCChange[];
  worldChanges: ExtractedWorldChange[];
  conflicts?: MemoryConflict[];
}

export interface TurnToolExecution {
  name: string;
  args: Record<string, any>;
  result: any;
}

export interface TurnDiceRoll {
  roll: number;
  sides: number;
  outcome?: string;
  total?: number;
  skill?: string;
  actor?: string;
  difficulty?: string | number;
}

/**
 * Contexto completo do turno submetido ao Memory Extractor
 */
export interface TurnContext {
  campaignId: string;
  turn: number;
  previousState?: {
    snapshot?: CampaignMemorySnapshot | null;
    npcs?: NPC[];
    worldState?: WorldState;
    inventory?: InventoryItem[];
    quests?: Quest[];
    relationships?: Relationship[];
    knowledge?: Knowledge[];
    events?: Event[];
  };
  playerAction: string;
  toolsCalled?: TurnToolExecution[];
  diceRolls?: TurnDiceRoll[];
  finalNarrative: string;
  involvedNpcs?: string[];
  currentLocation?: string;
  recentEvents?: Event[];
}

export interface ValidatedMemoryChanges {
  validEvents: Event[];
  validKnowledge: Knowledge[];
  validRelationships: Relationship[];
  validInventoryChanges: Array<{ owner: string; item: string; quantity: number; mode: 'set' | 'add' }>;
  validQuests: Quest[];
  validNPCUpdates: Array<{ id: string; updates: Partial<NPC> }>;
  rejectedChanges: Array<{ item: any; reason: string }>;
  conflicts: MemoryConflict[];
}
