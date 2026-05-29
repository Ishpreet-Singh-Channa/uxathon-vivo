'use client';
import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { SLOT_ORDER } from '@/types';
import { MOCK_PERSONAS } from '@/data/mockData';
import styles from './HandFan.module.css';

import FlowMiniCard from '@/components/game/FlowMiniCard/FlowMiniCard';
import { SLOT_LABELS } from '@/types';

export default function HandFan() {
  const { state } = useGame();
  const { slots } = state;

  // Filter slots to get an array of filled cards in order
  const filledSlots = SLOT_ORDER
    .map(key => ({ key, card: slots[key] }))
    .filter(item => item.card !== null);

  if (filledSlots.length === 0) return null;

  const totalCards = filledSlots.length;
  // Reduced spread angle to keep cards within screen bounds
  const spreadAngle = 70; 
  const angleStep = totalCards > 1 ? spreadAngle / (totalCards - 1) : 0;
  const startAngle = -(spreadAngle / 2);

  return (
    <div className={styles.container}>
      <div className={styles.fanArea}>
        {filledSlots.map((item, idx) => {
          const { key, card } = item;
          const persona = MOCK_PERSONAS.find(p => p.id === card!.persona_id);
          const rotation = startAngle + (idx * angleStep);
          
          return (
            <Fragment key={card!.id}>
              <motion.div
                className={styles.cardWrapper}
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  rotate: rotation,
                  zIndex: idx + 10,
                }}
                style={{
                  transformOrigin: '50% 200%', 
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <div className={styles.cardScale}>
                  <FlowMiniCard
                    card={card!}
                    persona={persona}
                    index={SLOT_ORDER.indexOf(key)}
                    label={SLOT_LABELS[key]}
                  />
                </div>
              </motion.div>

              {/* Progress Arrow between cards */}
              {idx < totalCards - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3, rotate: startAngle + (idx * angleStep) + (angleStep / 2) }}
                  className="absolute bottom-10 h-10 w-4 flex items-center justify-center pointer-events-none"
                  style={{
                    transformOrigin: '50% 400%', // Position it in the arc
                  }}
                >
                   <span className="text-white text-[10px]">→</span>
                </motion.div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
