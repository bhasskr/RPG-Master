/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AffinityTier = 'nemesis' | 'hostile' | 'distrustful' | 'neutral' | 'friendly' | 'trusted' | 'devoted';

export interface Relationship {
  id: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  affinityScore: number; // e.g. -100 to +100
  tier: AffinityTier;
  notes?: string;
  sharedHistory?: string[];
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  reputationWithPlayer: number; // -100 to +100
  headquarters?: string;
  knownMembers?: string[];
}
