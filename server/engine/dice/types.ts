/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DifficultyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export type RollOutcome =
  | 'CRITICAL_FAILURE'
  | 'FAILURE'
  | 'SUCCESS_WITH_COST'
  | 'FULL_SUCCESS'
  | 'CRITICAL_SUCCESS';

export interface RollD20Result {
  roll: number;
  sides: 20;
  timestamp: number;
}

export interface RollCheckParams {
  skill?: string;
  difficulty?: DifficultyLevel | number | string;
  modifier?: number;
  actor?: string;
  contextDescription?: string;
}

export interface RollCheckResult {
  roll: number;
  modifier: number;
  total: number;
  difficulty: number;
  difficultyLevel: DifficultyLevel | 'CUSTOM';
  outcome: RollOutcome;
  success: boolean;
  skill?: string;
  actor?: string;
  timestamp: number;
  sides: 20;
}
