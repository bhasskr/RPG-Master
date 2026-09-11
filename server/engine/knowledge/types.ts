/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type KnowledgeCategory = 'lore' | 'secret' | 'clue' | 'rumor' | 'world_rule';

export interface KnowledgeFact {
  id: string;
  category: KnowledgeCategory;
  topic: string;
  content: string;
  knownByCharacterIds: string[]; // which characters or player know this
  isDiscovered: boolean;
  discoveredAtTurn?: number;
  tags?: string[];
}

export interface LoreEntry {
  id: string;
  title: string;
  overview: string;
  details: string;
  isRevealedToPlayer: boolean;
}
