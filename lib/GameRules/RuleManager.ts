import { IRuleMode } from './IRuleMode';
import { LockMode } from './LockMode';
import { ReplaceMode } from './ReplaceMode';
import { SoftLockMode } from './SoftLockMode';
import { Card, SlotState, GameMode } from '@/types';

export class RuleManager {
  private static modes: Record<GameMode, IRuleMode> = {
    LOCK_ON_FILL: new LockMode(),
    REPLACE_ALLOWED: new ReplaceMode(),
    SOFT_LOCK: new SoftLockMode(),
  };

  static getMode(mode: GameMode): IRuleMode {
    return this.modes[mode];
  }

  static rebuildDeck(pool: Card[], slots: SlotState, mode: GameMode): Card[] {
    const strategy = this.getMode(mode);
    const rebuiltDeck: Card[] = [];
    let currentPool = [...pool];

    while (currentPool.length > 0) {
      const { nextCard, remainingPool } = strategy.generateNextCard(currentPool, slots);
      currentPool = remainingPool;
      if (nextCard) {
        rebuiltDeck.push(nextCard);
      }
    }
    return rebuiltDeck;
  }
}
