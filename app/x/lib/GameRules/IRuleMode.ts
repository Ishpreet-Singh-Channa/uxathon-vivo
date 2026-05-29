import { Card, CardType, SlotState } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';

export interface IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean;
  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] };
  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>): void;
}
