import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class LockMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    // Flow-wise logic: find the first empty slot in the order
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return false;

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    let remainingPool = [...pool];
    let nextCard = null;
    
    while (remainingPool.length > 0) {
      const candidate = remainingPool.shift()!;
      if (this.canCategorySpawn(candidate.card_type, slots)) {
        nextCard = candidate;
        break;
      }
    }
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    if (slots[slotKey] === null) {
      dispatch({ type: 'PLACE_CARD', payload: { card } });
      const newSlots = { ...slots, [slotKey]: card };
      if (isFlowComplete(newSlots, correctCards)) {
        setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
      } else {
        const isFull = Object.values(newSlots).every(c => c !== null);
        if (isFull) {
          setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
        }
      }
    } else {
      dispatch({ type: 'DISCARD_CARD' });
    }
  }
}
