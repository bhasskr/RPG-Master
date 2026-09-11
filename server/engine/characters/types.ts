/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CharacterAttribute {
  name: string;
  value: number;
  modifier?: number;
}

export interface CharacterSkill {
  name: string;
  level: number;
  description?: string;
}

export interface Character {
  id: string;
  name: string;
  role: 'player' | 'npc' | 'companion' | 'antagonist';
  archetype?: string;
  description?: string;
  personality?: string;
  status: 'alive' | 'unconscious' | 'deceased' | 'unknown';
  locationId?: string;
  attributes?: Record<string, number>;
  skills?: CharacterSkill[];
  tags?: string[];
}

export interface PlayerCharacter extends Character {
  role: 'player';
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
  goals?: string[];
}

export interface NonPlayerCharacter extends Character {
  role: 'npc' | 'companion' | 'antagonist';
  disposition?: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
  secrets?: string[];
}
