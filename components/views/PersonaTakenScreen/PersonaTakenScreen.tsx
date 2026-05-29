'use client';
// components/PersonaTakenScreen.tsx — Race-loss overlay
import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import styles from './PersonaTakenScreen.module.css';

export default function PersonaTakenScreen() {
  const { state, dispatch } = useGame();
  const { selectedPersona, personaTakenBy } = state;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-modal="true"
      role="alertdialog"
      aria-label="Persona claimed by another player"
    >
      <motion.div
        className={styles.card}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
      >
        <div className={styles.tag} aria-hidden="true">PERSONA TAKEN</div>

        <div className={styles.personaBadge} style={{ borderColor: selectedPersona?.color_code }}>
          <span
            className={styles.personaDot}
            style={{ background: selectedPersona?.color_code }}
            aria-hidden="true"
          />
          <span className={styles.personaName}>{selectedPersona?.name}</span>
        </div>

        <h1 className={styles.heading}>You were outpaced.</h1>

        {personaTakenBy && (
          <p className={styles.takenBy} aria-live="assertive">
            <span className={styles.takenByUser}>{personaTakenBy}</span> claimed it first.
          </p>
        )}

        <p className={styles.sub}>Choose a different persona and keep racing.</p>

        <div className={styles.actions}>
          <button
            id="taken-pick-another"
            className={styles.primaryBtn}
            onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'PERSONA_SELECT' })}
          >
            Pick Another Persona
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
