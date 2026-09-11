/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CampaignFoundation, WorldState } from '../gameState/types';
import { PlayerCharacter, NonPlayerCharacter } from '../characters/types';
import { ChatMessage, RelevantContextOutput } from '../memory/types';
import { Quest } from '../quests/types';
import { Item } from '../inventory/types';
import type { MemoryManager } from '../memory/memoryManager';
import type { GameStateManager } from '../gameState/gameStateManager';

export interface ToolExecutionResult {
  success: boolean;
  action?: 'created' | 'updated' | 'read' | 'rejected' | 'not_found' | 'error';
  data?: any;
  message?: string;
  error?: string;
  tool?: string;
}

export interface NarratorPromptContext {
  campaignId?: string;
  memoryManager?: MemoryManager;
  gameStateManager?: GameStateManager;
  systemInstructions: string;
  campaignFoundation: CampaignFoundation;
  worldState: WorldState;
  player: PlayerCharacter;
  activeNpcs?: NonPlayerCharacter[];
  activeQuests?: Quest[];
  keyInventoryItems?: Item[];
  relevantContextOutput?: RelevantContextOutput;
  relevantContextSummary?: string;
  recentMessages: ChatMessage[];
  currentUserInput: string;
  turnExecutionCache?: Map<string, ToolExecutionResult>;
  preferBestAvailableNarrator?: boolean;
}

export interface ExecutedToolRecord {
  name: string;
  args: Record<string, any>;
  result: any;
}

export interface NarratorResponse {
  text: string;
  suggestedActions?: string[];
  worldStateUpdate?: Partial<WorldState>;
  modelUsed?: string;
  executedTools?: ExecutedToolRecord[];
  diceRolls?: Array<{
    roll: number;
    sides: number;
    outcome?: string;
    total?: number;
    skill?: string;
    actor?: string;
    difficulty?: string | number;
  }>;
}
