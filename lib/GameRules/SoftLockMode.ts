import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class SoftLockMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return true; // If full, allow everything

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    if (pool.length === 0) return { nextCard: null, remainingPool: [] };
    const [first, ...remainingPool] = pool;
    
    const slotKey = CARD_TYPE_SLOT_MAP[first.card_type];
    const isFull = slots[slotKey] !== null;
    
    let nextCard = { ...first };
    if (isFull) {
      nextCard.isUpgraded = true;
    }
    
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    
    if (slots[slotKey] !== null) {
      // Slot is full, trigger confirm popup
      dispatch({ type: 'SHOW_CONFIRM_POPUP', payload: card });
    } else {
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
    }
  }
}
