/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestStatus = 'unassigned' | 'active' | 'completed' | 'failed' | 'abandoned';

export interface QuestObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  optional?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  giverNpcId?: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewardsDescription?: string;
  startedAtTurn?: number;
  completedAtTurn?: number;
}
