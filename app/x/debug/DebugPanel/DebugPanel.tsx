'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { GameMode } from '@/types';
import styles from './DebugPanel.module.css';

export default function DebugPanel() {
  const { state, dispatch } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const modes: GameMode[] = ['LOCK_ON_FILL', 'REPLACE_ALLOWED', 'SOFT_LOCK'];

  return (
    <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close debug menu' : 'Open debug menu'}
      >
        {isOpen ? '✕' : '⚙'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.content}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.section}>
              <div className={styles.title}>Rule Mode</div>
              {modes.map(m => (
                <label key={m} className={styles.label}>
                  <input
                    type="radio"
                    name="gameMode"
                    checked={state.gameMode === m}
                    onChange={() => dispatch({ type: 'SET_GAME_MODE', payload: m })}
                  />
                  {m}
                </label>
              ))}
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <div className={styles.title}>Visuals</div>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={state.showDeck}
                  onChange={() => dispatch({ type: 'TOGGLE_DECK_VISIBILITY' })}
                />
                Show Deck Block
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
