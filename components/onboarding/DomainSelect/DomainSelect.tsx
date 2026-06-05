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
        <span>Playing · </span>
        <span className={styles.player}>{state.currentUser?.username}</span>
      </div>
      <h1 className={styles.heading}>
        Select <span className={styles.accent}>Domain</span>
      </h1>
      <div className={styles.grid}>
        {MOCK_DOMAINS.map((d, index) => {
          const domainTag = `D-${(index + 1).toString().padStart(2, '0')}`;
          return (
            <button
              key={d.id}
              id={`domain-${d.id}`}
              className={styles.card}
              onClick={() => pick(d)}
              aria-label={`Select ${d.name} domain`}
            >
              {/* Top Row: Icon & Name */}
              <div className={styles.cardHeader}>
                <div className={styles.iconBox}>
                  <span className={styles.icon}>{d.icon}</span>
                </div>
                <h3 className={styles.name}>{d.name}</h3>
              </div>

              {/* Middle Section: Description */}
              <div className={styles.cardBody}>
                <p className={styles.desc}>{d.description}</p>
              </div>

              {/* Hover Accent Bar */}
              <div className={styles.accentBar} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

