'use client';
// components/FABRail.tsx — UXISM right 25% rail: Recenter + Explore FABs only
import { useState } from 'react';
import styles from './FABRail.module.css';

export default function FABRail() {
  const [recentered, setRecentered] = useState(false);

  function handleRecenter() {
    setRecentered(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setRecentered(false), 800);
  }

  return (
    <aside className={styles.rail} aria-label="Quick action buttons">
      {/* FAB 1 — Recenter */}
      <button
        id="fab-recenter"
        className={`${styles.fab} ${recentered ? styles.fabActive : ''}`}
        onClick={handleRecenter}
        aria-label="Scroll to top"
        title="Recenter"
      >
        <span className={styles.icon} aria-hidden="true">⌖</span>
      </button>

      {/* FAB 2 — Explore / toggle hint */}
      <button
        id="fab-explore"
        className={styles.fab}
        onClick={() => {}}
        aria-label="Explore personas"
        title="Explore"
      >
        <span className={styles.icon} aria-hidden="true">+</span>
      </button>
    </aside>
  );
}
