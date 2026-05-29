'use client';
// components/UserSelect.tsx — Step 0: Choose a mocked user
import { useGame } from '@/store/gameStore';
import { MOCK_USERS } from '@/data/mockData';
import { User } from '@/types';
import styles from './UserSelect.module.css';

export default function UserSelect() {
  const { dispatch } = useGame();

  function pick(u: User) {
    dispatch({ type: 'SET_USER', payload: u });
  }

  return (
    <div className={styles.container}>
      <div className={styles.eyebrow} aria-label="step indicator">00 / IDENTIFY</div>
      <h1 className={styles.heading}>Who are you?</h1>
      <p className={styles.sub}>Select a player to continue.</p>
      <ul className={styles.list} role="list">
        {MOCK_USERS.map(u => (
          <li key={u.id}>
            <button
              id={`user-${u.id}`}
              className={styles.row}
              onClick={() => pick(u)}
              aria-label={`Select player ${u.username}`}
            >
              <span className={styles.avatar} aria-hidden="true">
                {u.username[0]}
              </span>
              <span className={styles.username}>{u.username}</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
