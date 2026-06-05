'use client';
import { useGame } from '@/store/gameStore';
import styles from './TopBar.module.css';
import { ArrowLeft } from "lucide-react";

export default function TopBar() {
  const { state, dispatch } = useGame();
  const { selectedDomain, selectedPersona, opponentCount, currentUser, slots } = state;
  const filled = Object.values(slots).filter(Boolean).length;

  return (
    <header className={styles.bar} role="banner">
      <button
        id="back-to-persona"
        className={styles.back}
        onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'PERSONA_SELECT' })}
        aria-label="Back to persona selection"
      >
        <ArrowLeft size={14} />
      </button>

      <div className={styles.breadcrumb}>
        <span className={styles.domain}>{selectedDomain?.name}</span>
        <span className={styles.sep} aria-hidden="true">/</span>
        <span className={styles.persona} style={{ color: selectedPersona?.color_code ?? '#fff' }}>
          {selectedPersona?.name}
        </span>
      </div>
  

      <div className={styles.right}>
        <span className={styles.oppLabel} aria-live="polite">
          {opponentCount > 0 ? `${opponentCount} rival${opponentCount > 1 ? 's' : ''}` : 'Solo'}
        </span>
        <span className={styles.userChip}>{currentUser?.username}</span>
      </div>
    </header>
  );
}

