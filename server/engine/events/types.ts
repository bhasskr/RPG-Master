/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventSignificance = 'minor' | 'notable' | 'major' | 'climactic';

export interface GameEvent {
  id: string;
  turn: number;
  timestamp: number;
  title: string;
  summary: string;
  significance: EventSignificance;
  involvedCharacterIds: string[];
  location?: string;
  consequences?: string[];
}

export interface EventLog {
  events: GameEvent[];
  lastTurnLogged: number;
}
