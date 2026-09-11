/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
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

export interface CharacterAttribute {
  name: string;
  value: number;
  modifier?: number;
}

export interface PlayerCharacter {
  id: string;
  name: string;
  role: 'player';
  archetype?: string;
  description?: string;
  personality?: string;
  backstory?: string;
  age?: string;
  pronouns?: string;
  concept?: string;
  appearance?: string;
  features?: string;
  origin?: string;
  occupation?: string;
  routine?: string;
  relationshipsText?: string;
  statsText?: string;
  equipmentText?: string;
  status: 'alive' | 'unconscious' | 'deceased' | 'unknown';
  goals?: string[];
  attributes?: Record<string, number>;
}

export interface Item {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  quantity: number;
  isEquipped?: boolean;
}

export interface Inventory {
  characterId: string;
  items: Item[];
  currency: {
    gold?: number;
    silver?: number;
    copper?: number;
    credits?: number;
    [key: string]: number | undefined;
  };
}

export interface QuestObjective {
  id: string;
  description: string;
  isCompleted: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'unassigned' | 'active' | 'completed' | 'failed' | 'abandoned';
  objectives: QuestObjective[];
}

export interface CampaignFoundation {
  id: string;
  title: string;
  genre: string;
  premise: string;
  tone: string;
  rulesOfUniverse?: string;
  startingLocation: string;
  createdAt: number;
  campaignFormat?: 'sandbox' | 'focused';
  mechanicalProfile?: string;
  customMechanicalText?: string;
  experienceType?: string;
  customExperienceText?: string;
  masterResponseLength?: string;
  masterPacing?: string;
  masterDescriptionLevel?: string;
  masterFocus?: string;
  masterTone?: string;
}

export interface WorldState {
  currentLocation: string;
  timeOfDay: string;
  weather: string;
  tensionLevel: 'calm' | 'moderate' | 'tense' | 'critical' | 'combat';
  statusSummary: string;
}

export interface GameState {
  campaignId: string;
  turn: number;
  foundation: CampaignFoundation;
  worldState: WorldState;
  player: PlayerCharacter;
  inventory: Inventory;
  quests: Quest[];
  updatedAt: number;
}

export interface ApiStatusData {
  activeCampaignsCount?: number;
  memoryStoreType?: string;
  narratorModel?: string;
  isApiKeyConfigured?: boolean;
  status?: string;
  engine?: string;
  environment?: string;
}

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Tipos estruturados diretos da Memory Layer
 */
export interface MemoryCampaign {
  campaignId: string;
  name: string;
  createdAt: number;
  currentDate: string;
  currentLocation: string;
}

export interface MemoryNPC {
  id: string;
  name: string;
  status: string;
  location: string;
  faction: string;
  personalityNotes: string;
  goals: string[];
  secrets: string[];
  inventory: string[];
  relationships: Record<string, string>;
}

export interface MemoryEvent {
  id: string;
  timestamp: number;
  location: string;
  participants: string[];
  description: string;
  consequences: string[];
}

export interface MemoryKnowledge {
  id: string;
  fact: string;
  truthStatus: string;
  knownBy: string[];
  suspectedBy: string[];
  source: string;
  reliability: number;
}

export interface MemoryRelationship {
  characterA: string;
  characterB: string;
  trust: number;
  hostility: number;
  familiarity: number;
  importantHistory: string[];
}

export interface MemoryInventoryItem {
  owner: string;
  item: string;
  quantity: number;
}

export interface MemoryQuest {
  id: string;
  title: string;
  status: string;
  participants: string[];
  objectives: Array<{ description: string; isCompleted: boolean }> | string[];
  consequences: string[];
}

export interface CampaignMemorySnapshot {
  campaign: MemoryCampaign;
  npcs: Record<string, MemoryNPC>;
  events: MemoryEvent[];
  knowledge: MemoryKnowledge[];
  relationships: MemoryRelationship[];
  inventory: MemoryInventoryItem[];
  quests: MemoryQuest[];
  updatedAt: number;
}

export interface MemoryOperationLog {
  id: string;
  timestamp: number;
  operation: string;
  functionName: string;
  entity: string;
  campaignId: string;
  status: 'success' | 'error';
  details?: string;
  error?: string;
}
