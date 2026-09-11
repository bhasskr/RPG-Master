/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'artifact' | 'mundane';
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'quest' | 'tool' | 'treasure' | 'misc';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  quantity: number;
  weight?: number;
  value?: number;
  properties?: Record<string, string | number | boolean>;
  isEquipped?: boolean;
}

export interface Inventory {
  characterId: string;
  items: Item[];
  maxWeightCapacity?: number;
  currency: {
    gold?: number;
    silver?: number;
    copper?: number;
    credits?: number;
    [key: string]: number | undefined;
  };
}
