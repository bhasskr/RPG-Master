/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerCharacter, NonPlayerCharacter } from '../characters/types';
import { Inventory } from '../inventory/types';
import { Quest } from '../quests/types';
import { GameEvent } from '../events/types';
import { KnowledgeFact } from '../knowledge/types';
import { Relationship, Faction } from '../relationships/types';

export interface CampaignFoundation {
  id: string;
  title: string;
  genre: string;
  premise: string;
  tone: string; // e.g. 'épico e sombrio', 'alta fantasia heróica', 'cyberpunk investigativo'
  rulesOfUniverse?: string;
  worldDetails?: {
    identityAndState?: string;
    geography?: string;
    everydayLife?: string;
    magicAndTechnology?: string;
    economyAndLogistics?: string;
    factionsAndPower?: string;
    dangersAndOpportunities?: string;
    currentEvents?: string;
  };
  startingLocation: string;
  createdAt: number;
  campaignFormat?: 'sandbox' | 'focused';
  experienceType?: string;
  customExperienceText?: string;
  mechanicalProfile?: string;
  customMechanicalText?: string;
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
  npcs: NonPlayerCharacter[];
  inventory: Inventory;
  quests: Quest[];
  recentEvents: GameEvent[];
  knowledgeBase: KnowledgeFact[];
  relationships: Relationship[];
  factions: Faction[];
  updatedAt: number;
}
