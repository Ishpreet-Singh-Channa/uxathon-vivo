'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_PERSONAS, MOCK_DOMAINS, MOCK_CARDS, MOCK_USERS } from '@/data/mockData';
import styles from './BigScreenLeaderboard.module.css';
import { Persona, User } from '@/types';

type LivePersona = Persona & {
  domain_id: string;
  claimed_by_user?: User | null;
  active_competitors: number;
};

export default function BigScreenLeaderboard() {
  const [personas, setPersonas] = useState<LivePersona[]>([]);

  // Initialize personas with domain mapping and initial competitors
  useEffect(() => {
    const initialized: LivePersona[] = MOCK_PERSONAS.map(p => {
      const card = MOCK_CARDS.find(c => c.persona_id === p.id);
      return {
        ...p,
        domain_id: card ? card.domain_id : MOCK_DOMAINS[0].id,
        status: 'AVAILABLE',
        claimed_by_user: null,
        active_competitors: Math.floor(Math.random() * 6), // 0 to 5 competitors initially
      };
    });
    setPersonas(initialized);
  }, []);

  // Simulate real-time claims and competitor fluctuations
  useEffect(() => {
    if (personas.length === 0) return;

    // Interval for claims
    const claimInterval = setInterval(() => {
      setPersonas(current => {
        const available = current.filter(p => p.status === 'AVAILABLE');
        if (available.length === 0) {
          clearInterval(claimInterval);
          return current;
        }

        const randomPersona = available[Math.floor(Math.random() * available.length)];
        const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

        return current.map(p => {
          if (p.id === randomPersona.id) {
            return {
              ...p,
              status: 'CLAIMED',
              claimed_by_user: randomUser,
              claimed_at: new Date().toISOString(),
              active_competitors: 0 // Nobody competing anymore since it's claimed
            };
          }
          return p;
        });
      });
    }, 6000); // Claim one every 6 seconds

    // Interval for competitor fluctuations
    const fluctuateInterval = setInterval(() => {
      setPersonas(current => {
        return current.map(p => {
          if (p.status === 'CLAIMED') return p;
          // Randomly change competitors by -1, 0, or +1
          const change = Math.floor(Math.random() * 3) - 1;
          const currentCount = p.active_competitors || 0;
          const newCount = Math.max(0, Math.min(15, currentCount + change));
          return { ...p, active_competitors: newCount };
        });
      });
    }, 1500); // Fluctuate every 1.5 seconds

    return () => {
      clearInterval(claimInterval);
      clearInterval(fluctuateInterval);
    };
  }, [personas.length]);

  const totalPlayers = personas.reduce((sum, p) => sum + (p.active_competitors || 0), 0) || 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>GLOBAL ASSIGNMENT LINK</h1>
          <div className={styles.liveIndicator}>
            <div className={styles.pulse} />
            REAL-TIME TELEMETRY
          </div>
        </div>
        <div className={styles.statsPanel}>
          <div className={styles.statLabel}>ACTIVE PLAYERS</div>
          <div className={styles.statValue}>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={totalPlayers}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={styles.totalNumber}
              >
                {String(totalPlayers)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {MOCK_DOMAINS.map((domain, index) => {
          const domainPersonas = personas.filter(p => p.domain_id === domain.id);

          return (
            <motion.div 
              key={domain.id} 
              className={styles.domainColumn}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className={styles.domainHeader}>
                <span className={styles.domainIcon}>{domain.icon}</span>
                <h2 className={styles.domainName}>{domain.name}</h2>
              </div>
              
              <div className={styles.personaList}>
                <AnimatePresence>
                  {domainPersonas.map((p, pIndex) => {
                    const isClaimed = p.status !== 'AVAILABLE';
                    
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: pIndex * 0.05 }}
                        className={`${styles.personaRow} ${isClaimed ? styles.personaRowClaimed : ''}`}
                      >
                        <span className={styles.infoLabel}>{p.name}</span>
                        <span className={`${styles.infoIcon} ${isClaimed ? styles.iconClaimed : ''}`}>
                          +
                        </span>
                        <span className={styles.infoBody}>
                          {isClaimed 
                            ? `CLAIMED: ${p.claimed_by_user?.username}` 
                            : p.active_competitors > 0 
                              ? `${p.active_competitors} COMPETING` 
                              : 'AVAILABLE'}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
