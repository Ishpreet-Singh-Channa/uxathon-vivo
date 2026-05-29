'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { SLOT_ORDER, SLOT_LABELS, SlotKey } from '@/types';
import { MOCK_PERSONAS } from '@/data/mockData';
import FlowMiniCard from '@/components/game/FlowMiniCard/FlowMiniCard';
import styles from './FlowSlots.module.css';

function FlowArrow({ active }: { active: boolean }) {
  return (
    <div className={styles.arrowWrap} style={{ opacity: active ? 1 : 0.15 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m13 7 5 5-5 5" />
      </svg>
    </div>
  );
}

export default function FlowSlots() {
  const { state } = useGame();
  const { slots } = state;

  return (
    <section className={styles.section} aria-label="Flow sequence">
      <div className={styles.scrollRow}>
        {SLOT_ORDER.map((slotKey: SlotKey, idx) => {
          const card = slots[slotKey];
          const filled = card !== null;
          const persona = card ? MOCK_PERSONAS.find(p => p.id === card.persona_id) : null;
          
          // Arrow is active if current and previous (if any) are filled
          const prevSlotKey = idx > 0 ? SLOT_ORDER[idx - 1] : null;
          const prevFilled = prevSlotKey ? slots[prevSlotKey] !== null : true;
          
          return (
            <div key={slotKey} className={styles.slotGroup}>
              {idx > 0 && <FlowArrow active={prevFilled && filled} />}
              
              {filled ? (
                <div className={styles.slot}>
                  <div className={styles.miniCardScale}>
                    <FlowMiniCard 
                      card={card} 
                      persona={persona || undefined} 
                      index={idx} 
                      label={SLOT_LABELS[slotKey]} 
                    />
                  </div>
                </div>
              ) : (
                <div className={`${styles.slot} ${styles.slotEmpty}`}>
                  <span className={styles.stepNum}>{String(idx + 1).padStart(2, '0')}</span>
                  <span className={styles.slotLabel}>{SLOT_LABELS[slotKey]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

