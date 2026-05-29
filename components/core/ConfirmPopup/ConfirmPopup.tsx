'use client';
import { useGame } from '@/store/gameStore';
import { isFlowComplete } from '@/data/mockData';
import { CARD_TYPE_SLOT_MAP, CardType } from '@/types';
import styles from './ConfirmPopup.module.css';

export default function ConfirmPopup() {
  const { state, dispatch } = useGame();
  if (!state.confirmCard) return null;

  const handleConfirm = () => {
    dispatch({ type: 'PLACE_CARD_FORCE', payload: { card: state.confirmCard! } });
    
    // Check if flow complete
    const slotKey = CARD_TYPE_SLOT_MAP[state.confirmCard!.card_type as CardType];
    const newSlots = { ...state.slots, [slotKey]: state.confirmCard };
    if (isFlowComplete(newSlots, state.correctCards)) {
      setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
    } else {
      const isFull = Object.values(newSlots).every(c => c !== null);
      if (isFull) {
        setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
      }
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'CANCEL_CONFIRM' });
    dispatch({ type: 'DISCARD_CARD' }); // discards the top card because they cancelled replacement
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Replace existing card?</h3>
        <p className={styles.desc}>
          You are about to replace your current {state.confirmCard.card_type} with a RARE upgraded version.
        </p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={handleCancel}>Cancel</button>
          <button className={styles.btnConfirm} onClick={handleConfirm}>Replace</button>
        </div>
      </div>
    </div>
  );
}
