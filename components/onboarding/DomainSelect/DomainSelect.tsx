'use client';
import { useGame } from '@/store/gameStore';
import { MOCK_DOMAINS } from '@/data/mockData';
import { Domain } from '@/types';
import styles from './DomainSelect.module.css';

export default function DomainSelect() {
  const { state, dispatch } = useGame();

  function pick(d: Domain) {
    dispatch({ type: 'SELECT_DOMAIN', payload: d });
  }

  return (
    <div className={styles.container}>
      <div className={styles.eyebrow}>
        <span className={styles.player}>{state.currentUser?.username}</span>
        <span className={styles.sep}>/</span>
        <span>01 · DOMAIN</span>
      </div>
      <h1 className={styles.heading}>Select Domain</h1>
      <p className={styles.sub}>Choose your industry arena to begin.</p>
      <div className={styles.grid}>
        {MOCK_DOMAINS.map(d => {
          return (
            <button
              key={d.id}
              id={`domain-${d.id}`}
              className={styles.card}
              onClick={() => pick(d)}
              aria-label={`Select ${d.name} domain`}
            >
              <span className={styles.icon} aria-hidden="true">{d.icon}</span>
              <span className={styles.name}>{d.name}</span>
              <span className={styles.desc}>{d.description}</span>
              <span className={styles.badge} aria-hidden="true">SELECT →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

