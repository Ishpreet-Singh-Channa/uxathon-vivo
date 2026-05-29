'use client';
import { Persona } from '@/types';
import styles from './PersonaMiniCard.module.css';

interface Props {
  persona: Persona;
}

export default function PersonaMiniCard({ persona }: Props) {
  return (
    <div 
      className={styles.miniCard}
      style={{ '--accent': persona.color_code } as React.CSSProperties}
    >
      <div className={styles.pill}>PERSONA</div>
      
      <div className={styles.iconWrapper}>
        <img src={persona.asset_path} alt="" className={styles.icon} />
      </div>

      <div className={styles.content}>
        <div className={styles.name}>{persona.name}</div>
        <div className={styles.status}>Locked by you</div>
      </div>
    </div>
  );
}
