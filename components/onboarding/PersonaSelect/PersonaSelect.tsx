'use client';
import React, { useState, useEffect } from 'react';
import { useSubscription } from '@apollo/client/react';
import { useGame } from '@/store/gameStore';
import { WATCH_TEAMS } from '@/lib/GameRules/game-queries';
import { getCorrectCards, buildDeck, MOCK_CARDS as ALL_CARDS, MOCK_PERSONAS, MOCK_DOMAINS } from '@/data/mockData';
import { Persona } from '@/types';
import styles from './PersonaSelect.module.css';

export default function PersonaSelect() {
  const { state, dispatch } = useGame();
  const domain = state.selectedDomain;

  const { data, loading, error } = useSubscription<{ teams: any[] }>(WATCH_TEAMS);
  const activeTeams = data?.teams || [];

  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    // Auto bypass after 6 seconds if still loading
    const autoTimer = setTimeout(() => setIsBypassed(true), 3000);
    return () => clearTimeout(autoTimer);
  }, []);

  // Filter personas to only show those that have cards for the selected domain
  const availablePersonas = MOCK_PERSONAS
    .filter(p => !domain || getCorrectCards(p.id, domain.id).length > 0)
    .map(persona => {
      const claimingTeam = activeTeams.find((t: any) => t.color === persona.color_code);
      return {
        ...persona,
        status: (claimingTeam ? 'CLAIMED' : 'AVAILABLE') as 'CLAIMED' | 'AVAILABLE',
        claimed_by_leader: claimingTeam?.user?.name || null
      };
    });

  function pick(persona: Persona) {
    if (persona.status === 'CLAIMED') return;
    if (!domain) return;

    const correctCards = getCorrectCards(persona.id, domain.id);
    const deck = buildDeck(correctCards, ALL_CARDS, domain.id);

    dispatch({ type: 'SELECT_PERSONA', payload: { persona, correctCards, deck } });
  }

  if (loading && !data && !error && !isBypassed) {
    return (
      <div className={styles.container}>
        <div className={styles.eyebrow}>
          <span>Auth_Protocol_Alpha</span>
          <span className={styles.sep}>/</span>
          <span>Syncing Nodes</span>
        </div>
        <h1 className={styles.heading}>Synchronizing...</h1>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.eyebrow}>
        <span>{state.currentUser?.username}</span>
        <span className={styles.sep}>/</span>
        <span className={styles.domain}>{domain?.name}</span>
        <span className={styles.sep}>/</span>
        <span>02 · PERSONA</span>
      </div>
      <h1 className={styles.heading}>Choose Your Persona</h1>
      <p className={styles.sub}>
        {availablePersonas.length} Archetypes available for {domain?.name}.
      </p>

      <div className={styles.grid}>
        {availablePersonas.length === 0 ? (
          <div className={styles.empty}>
            <p>No archetypes found for this domain yet.</p>
            <button onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'DOMAIN_SELECT' })}>
              Change Domain
            </button>
          </div>
        ) : (
          availablePersonas.map(p => (
            <button
              key={p.id}
              id={`persona-${p.id}`}
              className={`${styles.personaCard} ${p.status === 'CLAIMED' ? styles.claimed : ''}`}
              style={{ backgroundColor: p.color_code }}
              onClick={() => pick(p)}
              disabled={p.status === 'CLAIMED'}
              aria-label={`${p.name} — ${p.status}`}
            >
              <div className={styles.assetContainer}>
                <img src={p.asset_path} alt="" className={styles.asset} />
              </div>
              <span className={styles.cardName}>{p.name}</span>
              {p.status === 'CLAIMED' && (
                <div className={styles.claimedOverlay}>
                  <span className={styles.claimedStamp}>CLAIMED</span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}