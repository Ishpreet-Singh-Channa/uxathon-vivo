'use client';
import { useGame } from '@/store/gameStore';
import TopBar from '@/components/core/TopBar/TopBar';
import FlowSlots from '@/components/game/FlowSlots/FlowSlots';
import SwipeDeck from '@/components/game/SwipeDeck/SwipeDeck';
import WinScreen from '@/components/views/WinScreen/WinScreen';
import PersonaTakenScreen from '@/components/views/PersonaTakenScreen/PersonaTakenScreen';
import DebugPanel from '@/debug/DebugPanel/DebugPanel';
import ConfirmPopup from '@/components/core/ConfirmPopup/ConfirmPopup';
import TryAgainPopup from '@/components/core/TryAgainPopup/TryAgainPopup';
import { useEffect } from 'react';
import { useSubscription } from '@apollo/client/react';
import { WATCH_TEAMS } from '@/lib/GameRules/game-queries';
import styles from './GameBoard.module.css';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  return (
    <main className={styles.board} aria-label="Game board">
      <TopBar />

      <div className={styles.content}>
        {/* ── Middle: 5 flow slots ── */}
        <div className={styles.flowWrapper}>
          <FlowSlots />
        </div>

        {/* ── Bottom: swipe deck ── */}
        <div className={styles.deckWrapper}>
          <SwipeDeck />
        </div>
      </div>

      {/* Overlays */}
      {state.gamePhase === 'WON' && <WinScreen userId={state.currentUser?.id}/>}
      {state.gamePhase === 'PERSONA_TAKEN' && <PersonaTakenScreen />}

      <DebugPanel />
      <ConfirmPopup />
      <TryAgainPopup />
    </main>
  );
}

