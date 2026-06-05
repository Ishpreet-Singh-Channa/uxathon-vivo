'use client';
import { motion } from 'framer-motion';
import { Card, Persona } from '@/types';
import styles from './FlowMiniCard.module.css';

interface Props {
  card: Card;
  persona?: Persona;
  index: number;
  label: string;
}

export default function FlowMiniCard({ card, persona, index, label }: Props) {
  const color = persona?.color_code ?? '#2e2e2e';
  
  return (
    <div 
      className={styles.miniCard}
      style={{ backgroundColor: color, borderColor: color } as React.CSSProperties}
    >
      <div className={styles.topRow}>
        <span className={styles.stepNum}>{String(index + 1).padStart(2, '0')}</span>
        {persona && (
          <img src={persona.asset_path} alt="" className={styles.personaIcon} />
        )}
      </div>
      
      <div className={styles.label}>{label}</div>
      
      <div className={styles.contentWrapper}>
        <p className={styles.content}>{card.heading || card.bodyText || ''}</p>
      </div>
    </div>
  );
}
