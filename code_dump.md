# Codebase Context Dump

app/games/persona-flow/page.tsx:
"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMultiplayer } from "@/lib/multiplayer/useMultiplayer";
import { GameShell } from "../_components/GameShell";

// Import your X app dependencies
import { GameProvider, useGame } from "@/store/gameStore";
import UserSelect from "@/components/onboarding/UserSelect/UserSelect";
import DomainSelect from "@/components/onboarding/DomainSelect/DomainSelect";
import PersonaSelect from "@/components/onboarding/PersonaSelect/PersonaSelect";
import GameBoard from "@/components/game/GameBoard/GameBoard";
import Leaderboard from "@/components/views/Leaderboard/Leaderboard";
import FABRail from "@/components/core/FABRail/FABRail";

type PersonaFlowPageProps = {
  isMultiplayer?: boolean
  room?: any
  roomId?: string
  roomCode?: string
  gameState?: any
  updateGameState?: (state: any) => Promise<void>
  players?: any[]
  userId?: string | null
  isHost?: boolean
}

// 1. The Bridge Logic (Expects the mode to be passed down)
// function PersonaFlowBridge({ isMultiplayer }: { isMultiplayer: boolean }) {
 
function PersonaFlowBridge({
  isMultiplayer,
  room,
  roomCode,
  gameState,
  updateGameState,
  players = [],
  userId,
}: PersonaFlowPageProps) { 
  // const { userId, room, gameState, updateGameState, activeRoomCode } = useMultiplayer();
  const isMultiplayerActive = !!isMultiplayer && !!roomCode;

  const { state, dispatch } = useGame();

  const currentRoomClaims = React.useMemo(() => {
      return Array.isArray(room?.room_persona_claims)
        ? room.room_persona_claims
        : [];
    }, [room?.room_persona_claims]);
  
  const myExistingClaim = currentRoomClaims.find(
    (claim: any) => claim.user_id === userId
  );




  // useEffect(() => {
  //   if (!isMultiplayerActive || !room || !userId) return;

  //   const existingClaim = room.room_persona_claims?.find(
  //     (claim: any) => claim.user_id === userId
  //   );

  //   if (!existingClaim) return;

  //   // Do not keep an already-assigned player inside the card game.
  //   if (
  //     state.gamePhase !== 'USER_SELECT' &&
  //     state.gamePhase !== 'DOMAIN_SELECT'
  //   ) {
  //     dispatch({ type: 'GO_TO_PHASE', payload: 'DOMAIN_SELECT' });
  //   }
  // }, [
  //   isMultiplayerActive,
  //   room,
  //   room?.room_persona_claims,
  //   userId,
  //   state.gamePhase,
  //   dispatch,
  // ]);

  useEffect(() => {
    if (!isMultiplayerActive || !room || !state.selectedPersona || !userId) return;

    const shouldWatchForOutpaced =
      state.gamePhase === 'PLAYING' || state.gamePhase === 'WON';

    if (!shouldWatchForOutpaced) return;

    // const claim = room.room_persona_claims?.find(
    //   (c: any) => c.persona_id === state.selectedPersona?.id
    // );
    const claim = currentRoomClaims.find(
      (claim: any) =>
        claim.room_id === room.id &&
        claim.persona_id === state.selectedPersona?.id
    );
// logs----------------------
      console.log('[Persona Outpaced Check]', {
      currentRoomId: room.id,
      currentRoomCode: room.code,
      selectedPersonaId: state.selectedPersona?.id,
      userId,
      claimsInCurrentRoom: currentRoomClaims.map((claim: any) => ({
        roomId: claim.room_id,
        userId: claim.user_id,
        personaId: claim.persona_id,
        name: claim.user?.name,
      })),
      matchedClaim: claim,
    });
// logs----------------------
    if (claim && claim.user_id !== userId) {
      dispatch({
        type: 'PERSONA_TAKEN_BY',
        payload: claim.user?.name || 'Another player',
      });
    }
  }, [
    isMultiplayerActive,
    room?.id,
    room?.code,
    currentRoomClaims,
    state.selectedPersona?.id,
    state.gamePhase,
    userId,
    dispatch,
  ]);
  

  // Sync User Data Automatically in Multiplayer
  useEffect(() => {
    if (isMultiplayerActive && room && state.gamePhase === 'USER_SELECT') {
      const me = room.room_players.find(p => p.user.id === userId);
      if (me) {
        dispatch({
          type: 'SET_USER',
          payload: {
            id: me.user.id,
            username: me.user.name || 'Network Node',
            teamName: 'UXISM Squad'
          }
        });
        dispatch({ type: 'GO_TO_PHASE', payload: 'DOMAIN_SELECT' });
      }
    }
  }, [isMultiplayerActive, room, state.gamePhase, userId, dispatch]);

  // Broadcast Local Wins to the Multiplayer Matrix
  // useEffect(() => {
  //   if (isMultiplayerActive && state.gamePhase === 'WON' && state.personaClaimed) {
  //     const syncClaim = async () => {
  //       const currentClaims = gameState?.claims || {};
  //       const currentLogs = gameState?.logs || [];

  //       if (currentClaims[state.selectedPersona!.id] === userId) return;

  //       await updateGameState({
  //         ...gameState,
  //         claims: {
  //           ...currentClaims,
  //           [state.selectedPersona!.id]: userId
  //         },
  //         logs: [
  //           `Node ${state.currentUser?.username} secured persona: ${state.selectedPersona!.name}`,
  //           ...currentLogs
  //         ].slice(0, 20)
  //       });
  //     };
  //     syncClaim();
  //   }
  // }, [
  //   isMultiplayerActive,
  //   state.gamePhase,
  //   state.personaClaimed,
  //   state.selectedPersona,
  //   state.currentUser,
  //   gameState,
  //   updateGameState,
  //   userId,
  // ]);
  



  // ---------------------------------------------------------------------------------------
  // useEffect(() => {
  //   if (
  //     !isMultiplayerActive ||
  //     state.gamePhase !== 'WON' ||
  //     !state.personaClaimed ||
  //     !state.selectedPersona
  //   ) {
  //     return;
  //   }

  //   const syncClaim = async () => {
  //     const currentClaims = gameState?.claims || {};
  //     const currentLogs = gameState?.logs || [];

  //     if (currentClaims[state.selectedPersona!.id] === userId) return;

  //     await updateGameState({
  //       ...gameState,
  //       claims: {
  //         ...currentClaims,
  //         [state.selectedPersona!.id]: userId,
  //       },
  //       logs: [
  //         `Node ${state.currentUser?.username} secured persona: ${state.selectedPersona!.name}`,
  //         ...currentLogs,
  //       ].slice(0, 20),
  //     });
  //   };

  //   syncClaim();
  // }, [
  //   isMultiplayerActive,
  //   state.gamePhase,
  //   state.personaClaimed,
  //   state.selectedPersona,
  //   state.currentUser,
  //   gameState,
  //   updateGameState,
  //   userId,
  // ]);
  // ---------------------------------------------------------------------------------------



  // Listen for Rival Claims and Update Local State

  // useEffect(() => {
  //   if (isMultiplayerActive && gameState?.claims && state.selectedPersona) {
  //     const claimedBy = gameState.claims[state.selectedPersona.id];

  //     if (claimedBy && claimedBy !== userId) {
  //       const rivalPlayer = room?.room_players.find(p => p.user.id === claimedBy);
  //       dispatch({ 
  //         type: 'PERSONA_TAKEN_BY', 
  //         payload: rivalPlayer?.user.name || 'Rival Node' 
  //       });
  //     }
  //   }
  // }, [gameState?.claims, state.selectedPersona, userId, room, dispatch]);

  if (isMultiplayerActive && myExistingClaim) {
    return (
      <div className="min-h-[420px] border border-[#2e2e2e] bg-[#171717]/70 p-6 text-center flex flex-col items-center justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#DEF767]">
          Persona Already Assigned
        </p>

        <h2 className="mt-3 font-sans text-3xl uppercase tracking-[0.04em] text-white">
          {myExistingClaim.persona_name}
        </h2>

        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
          Domain: {myExistingClaim.domain_name}
        </p>

        <p className="mt-5 max-w-[34ch] text-[13px] leading-6 text-[#929292]">
          You have already secured a persona in this room. You cannot play the card game again unless you drop your persona from My Team.
        </p>

        <a
          href="/myteam"
          className="mt-6 border border-[rgba(222,247,103,0.5)] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]"
        >
          Go to My Team
        </a>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full min-h-[600px] bg-[#181818] overflow-hidden rounded-xl border border-[#2e2e2e]">
      {/* {state.gamePhase === 'USER_SELECT' && <UserSelect />} */}
      {state.gamePhase === 'DOMAIN_SELECT' && <DomainSelect />}
      {state.gamePhase === 'PERSONA_SELECT' && <PersonaSelect room={room}/>}
      {state.gamePhase === 'LEADERBOARD' && <Leaderboard />}
      {(state.gamePhase === 'PLAYING' ||
        state.gamePhase === 'WON' ||
        state.gamePhase === 'PERSONA_TAKEN') && <GameBoard />}
      <FABRail />
    </div>
  );
}

// 2. The Inner Wrapper (Safe to use useSearchParams here)
function PersonaFlowPageInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  // const isMultiplayer = mode !== "singleplayer";
  const isMultiplayer =
      typeof props.isMultiplayer === 'boolean'
        ? props.isMultiplayer
        : mode !== "singleplayer";
  return (
    <GameShell
      meta={`UXATHON / ENVIRONMENT / PERSONA FLOW / [${isMultiplayer ? "MULTIPLAYER" : "SINGLEPLAYER"}]`}
      title="Context Persona Flow"
      description="Navigate the matrix. Align archetypes to operational realities before your rivals."
    >
      <GameProvider key={props.roomId || props.roomCode || 'singleplayer'}>
        <PersonaFlowBridge 
        {...props} 
        isMultiplayer={isMultiplayer} />
      </GameProvider>
    </GameShell>
  );
}

// 3. The Default Export (Provides the Suspense Boundary to prevent Next.js build crash)
export default function PersonaFlowPage(props: PersonaFlowPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#181818] flex items-center justify-center font-mono text-[11px] uppercase tracking-widest text-[#5b5b5b]">
          Loading Matrix...
        </div>
      }
    >
      <PersonaFlowPageInner />
    </Suspense>
  );
}
components/onboarding/PersonaSelect/PersonaSelect.tsx:
'use client';
import { useState, useEffect } from 'react';
import { useGame } from '@/store/gameStore';
import { getCorrectCards, buildDeck, MOCK_CARDS as ALL_CARDS, MOCK_PERSONAS, MOCK_DOMAINS } from '@/data/mockData';
import { Persona } from '@/types';
import styles from './PersonaSelect.module.css';

import { useMultiplayer } from '@/lib/multiplayer/useMultiplayer';

type PersonaSelectProps = {
  room?: any;
};


export default function PersonaSelect({ room }: PersonaSelectProps) {
  const { state, dispatch } = useGame();
  const domain = state.selectedDomain;

    const [isBypassed, setIsBypassed] = useState(false);


  // const { data, loading, error } = useSubscription<{ teams: any[] }>(WATCH_TEAMS);
  // const activeTeams = data?.teams || [];

  // const { room } = useMultiplayer();
  const roomClaims = room?.room_persona_claims || [];

   console.log('[PersonaSelect Room Scope]', {
      roomId: room?.id,
      roomCode: room?.code,
      claimsCount: roomClaims.length,
      claims: roomClaims.map((claim: any) => ({
        userId: claim.user_id,
        personaId: claim.persona_id,
        personaName: claim.persona_name,
        domainName: claim.domain_name,
      })),
    });
  // const [isBypassed, setIsBypassed] = useState(false);
  const availablePersonas = MOCK_PERSONAS
      .filter((persona) => !domain || getCorrectCards(persona.id, domain.id).length > 0)
      .map((persona) => {
        const claim = roomClaims.find(
          (claim: any) => claim.persona_id === persona.id
        );

        return {
          ...persona,
          status: (claim ? 'CLAIMED' : 'AVAILABLE') as 'CLAIMED' | 'AVAILABLE',
          claimed_by_leader: claim?.user?.name || null,
        };
      });

    function pick(persona: Persona) {
      if (persona.status === 'CLAIMED') return;
      if (!domain) return;

      const correctCards = getCorrectCards(persona.id, domain.id);
      const deck = buildDeck(correctCards, ALL_CARDS, domain.id);

      dispatch({ type: 'SELECT_PERSONA', payload: { persona, correctCards, deck } });
    }

  useEffect(() => {
    // Auto bypass after 6 seconds if still loading
    const autoTimer = setTimeout(() => setIsBypassed(true), 3000);
    return () => clearTimeout(autoTimer);
  }, []);

  // Filter personas to only show those that have cards for the selected domain
  // const availablePersonas = MOCK_PERSONAS
  //   .filter(p => !domain || getCorrectCards(p.id, domain.id).length > 0)
  //   .map(persona => {
  //     const claimingTeam = activeTeams.find((t: any) => t.color === persona.color_code);
  //     return {
  //       ...persona,
  //       status: (claimingTeam ? 'CLAIMED' : 'AVAILABLE') as 'CLAIMED' | 'AVAILABLE',
  //       claimed_by_leader: claimingTeam?.user?.name || null
  //     };
  //   });
  

  // if (loading && !data && !error && !isBypassed) {
  //   return (
  //     <div className={styles.container}>
  //       <div className={styles.eyebrow}>
  //         <span>Auth_Protocol_Alpha</span>
  //         <span className={styles.sep}>/</span>
  //         <span>Syncing Nodes</span>
  //       </div>
  //       <h1 className={styles.heading}>Synchronizing...</h1>
  //     </div>
  //   );
  // }


  useEffect(() => {
    const autoTimer = setTimeout(() => setIsBypassed(true), 3000);
    return () => clearTimeout(autoTimer);
  }, []);

  

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'DOMAIN_SELECT' })}
        >
          <span>←</span> Back to Domains
        </button>
      </div>
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
              {/* Card Bottom Logo */}
              <img src="/assets/logos/placeholder.svg" alt="" className={styles.cardLogo} />
              
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


components/game/GameBoard/GameBoard.tsx:
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

  const { data } = useSubscription<{ teams: any[] }>(WATCH_TEAMS, {
    skip: !state.selectedPersona || state.gamePhase === 'WON' || state.gamePhase === 'PERSONA_TAKEN',
  });
  useEffect(() => {
    if (!data || !state.selectedPersona || !state.currentUser) return;
    const rivalTeam = data.teams.find(
      (team: any) => team.color === state.selectedPersona?.color_code
    );
    if (rivalTeam && rivalTeam.leader_id !== state.currentUser.id) {
      dispatch({
        type: 'PERSONA_TAKEN_BY',
        payload: rivalTeam.user?.name || 'Another player'
      });
    }
  }, [data, state.selectedPersona, state.currentUser, dispatch]);

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


store/gameStore.ts:


// lib/gameStore.ts
// Lightweight React Context-based state store — no Redux needed for MVP.
// Swap persistence layer for Hasura mutations when backend is live.

'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Domain, Persona, Card, SlotState, User, CardType, CARD_TYPE_SLOT_MAP, GameMode } from '@/app/x/types/index';
import { RuleManager } from '@/app/x/lib/GameRules';

// ─── STATE ────────────────────────────────────────────────────
export interface GameState {
  currentUser:    User | null;
  selectedDomain: Domain | null;
  selectedPersona: Persona | null;
  takenBy:         null,
  outpacedBy:      null
  correctCards:   Card[];
  deck:           Card[];
  pool:           Card[];
  discardPile:    Card[];
  slots:          SlotState;
  opponentCount:  number;
  gamePhase: 'USER_SELECT' | 'DOMAIN_SELECT' | 'PERSONA_SELECT' | 'PLAYING' | 'WON' | 'PERSONA_TAKEN' | 'LEADERBOARD';
  personaClaimed: boolean;
  personaTakenBy: string | null;
  gameMode:       GameMode;
  confirmCard:    Card | null;
  showTryAgainPopup: boolean;
  showDeck:       boolean;
  leaderboard:    Array<{
    user: User;
    persona: Persona;
    domain: Domain;
    claimedAt: string;
  }>;
}

const emptySlots: SlotState = { 
  AVATAR:      null, 
  PERSONA:     null, 
  SCENARIO:    null, 
  UX_PROBLEM:  null, 
  UI_PROBLEM:  null, 
  CX_PROBLEM:  null, 
  AI_PROBLEM:  null 
};

const initialState: GameState = {
  currentUser:     null,
  selectedDomain:  null,
  selectedPersona: null,
  correctCards:    [],
  deck:            [],
  pool:            [],
  discardPile:     [],
  slots:           emptySlots,
  opponentCount:   0,
  gamePhase:       'USER_SELECT',
  personaClaimed:  false,
  personaTakenBy:  null,
  gameMode:        'LOCK_ON_FILL',
  confirmCard:     null,
  showTryAgainPopup: false,
  showDeck:        true,
  leaderboard:     [],
  takenBy:         null,
  outpacedBy:      null
};

// ─── ACTIONS ──────────────────────────────────────────────────
export type Action =
  | { type: 'SET_USER';           payload: User }
  | { type: 'SELECT_DOMAIN';      payload: Domain }
  | { type: 'SELECT_PERSONA';     payload: { persona: Persona; correctCards: Card[]; deck: Card[] } }
  | { type: 'PLACE_CARD';         payload: { card: Card } }
  | { type: 'DISCARD_CARD' }
  | { type: 'SET_OPPONENT_COUNT'; payload: number }
  | { type: 'PERSONA_CLAIMED_BY_ME' }
  | { type: 'PERSONA_TAKEN_BY';   payload: string }
  | { type: 'RESET_BOARD' }
  | { type: 'GO_TO_PHASE';        payload: GameState['gamePhase'] }
  | { type: 'SET_GAME_MODE';      payload: GameMode }
  | { type: 'SHOW_CONFIRM_POPUP'; payload: Card }
  | { type: 'CANCEL_CONFIRM' }
  | { type: 'SHOW_TRY_AGAIN' }
  | { type: 'HIDE_TRY_AGAIN' }
  | { type: 'PLACE_CARD_FORCE';   payload: { card: Card } }
  | { type: 'TOGGLE_DECK_VISIBILITY' }
  | { type: 'PICK_ANOTHER_PERSONA' };

function reducer(state: GameState, action: Action): GameState {
  // Ensure leaderboard exists to prevent HMR or state initialization issues
  const leaderboard = state.leaderboard || [];
  const safeState = { ...state, leaderboard };

  switch (action.type) {
    case 'SET_USER':
      return { ...safeState, currentUser: action.payload, gamePhase: 'DOMAIN_SELECT' };

    case 'SELECT_DOMAIN':
      return { ...safeState, selectedDomain: action.payload, gamePhase: 'PERSONA_SELECT' };

    case 'SELECT_PERSONA': {
      const { persona, correctCards, deck: initialPool } = action.payload;
      const avatarCard = correctCards.find(c => c.card_type === 'AVATAR') || null;
      
      const startingSlots = { 
        ...emptySlots, 
        AVATAR: avatarCard 
      };

      const remainingPool = avatarCard 
        ? initialPool.filter(c => c.id !== avatarCard.id)
        : initialPool;

      const initialDeck = RuleManager.rebuildDeck(remainingPool, startingSlots, state.gameMode);
      
      return {
        ...safeState,
        selectedPersona: persona,
        correctCards:    correctCards,
        pool:            remainingPool,
        discardPile:     [],
        deck:            initialDeck,
        slots:           startingSlots,
        gamePhase:       'PLAYING',
        personaClaimed:  false,
        personaTakenBy:  null,
      };
    }

    case 'PLACE_CARD': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
      };
    }

    case 'DISCARD_CARD': {
      if (state.deck.length === 0) return state;
      const discardedCard = state.deck[0];
      let newPool = state.pool.filter(c => c.id !== discardedCard.id);
      let newDiscardPile = [...state.discardPile, discardedCard];
      
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
      
      // Respawn left-swiped cards if deck is empty
      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
        newDiscardPile = [];
      }
      
      return { ...safeState, pool: newPool, discardPile: newDiscardPile, deck: newDeck };
    }

    case 'SET_OPPONENT_COUNT':
      return { ...safeState, opponentCount: action.payload };

    case 'PERSONA_CLAIMED_BY_ME': {
      const newClaim = {
        user: state.currentUser!,
        persona: state.selectedPersona!,
        domain: state.selectedDomain!,
        claimedAt: new Date().toISOString(),
      };
      return { 
        ...safeState, 
        gamePhase: 'WON', 
        personaClaimed: true,
        leaderboard: [newClaim, ...leaderboard]
      };
    }

    case 'PERSONA_TAKEN_BY':
      return { ...safeState, gamePhase: 'PERSONA_TAKEN', personaTakenBy: action.payload };

    case 'RESET_BOARD': {
      const avatarCard = state.correctCards.find(c => c.card_type === 'AVATAR') || null;
      const startingSlots = { ...emptySlots, AVATAR: avatarCard };
      
      // Collect all cards currently in slots and pool, except the fixed avatar card
      const allCards = [...state.pool, ...Object.values(state.slots).filter(Boolean) as Card[]];
      const newPool = allCards.filter(c => c.id !== avatarCard?.id).sort(() => Math.random() - 0.5);
      
      const newDeck = RuleManager.rebuildDeck(newPool, startingSlots, state.gameMode);
      return {
        ...safeState,
        slots:          startingSlots,
        pool:           newPool,
        discardPile:    [],
        deck:           newDeck,
        gamePhase:      'PLAYING',
        personaClaimed: false,
        personaTakenBy: null,
        showTryAgainPopup: false,
      };
    }

    case 'GO_TO_PHASE':
      return { ...safeState, gamePhase: action.payload };

    case 'SET_GAME_MODE': {
      const newMode = action.payload;
      let newPool = state.pool;
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
        newDiscardPile = [];
      }
      return { ...safeState, gameMode: newMode, deck: newDeck, pool: newPool, discardPile: newDiscardPile };
    }

    case 'SHOW_CONFIRM_POPUP':
      return { ...safeState, confirmCard: action.payload };

    case 'CANCEL_CONFIRM':
      return { ...safeState, confirmCard: null };

    case 'SHOW_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: true };

    case 'HIDE_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: false };

    case 'PLACE_CARD_FORCE': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
        confirmCard: null,
      };
    }

    case 'TOGGLE_DECK_VISIBILITY':
      return { ...safeState, showDeck: !state.showDeck };

    case 'PICK_ANOTHER_PERSONA':
      return {
        ...state,
        gamePhase: 'DOMAIN_SELECT',
        selectedDomain: null,
        selectedPersona: null,
        personaClaimed: false,
        takenBy: null,
        outpacedBy: null,
      };

    default:
      return state;
  }
}

// ─── CONTEXT ──────────────────────────────────────────────────
const GameContext = createContext<{
  state:    GameState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}


lib/multiplayer/useMultiplayer.ts:

'use client'

import { useEffect, useState } from 'react'
import { useSubscription } from '@apollo/client/react'
import { MULTIPLAYER_GAME_STATE_SUBSCRIPTION } from './graphql'
import { MultiplayerRoom } from './types'

function getUserIdFromLocalStorage(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('jwt-token')
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)
    const claims = decoded?.['https://hasura.io/jwt/claims']
    return claims?.['x-hasura-user-id'] || decoded?.sub || null
  } catch (e) {
    return null
  }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('jwt-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function useMultiplayer(roomCodeFromUrl?: string) {
  // Read code from parameter or fallback gracefully to active tracking string
  const [activeCode, setActiveCode] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [pollingData, setPollingData] = useState<any>(null)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setUserId(getUserIdFromLocalStorage())
    const standardCode = roomCodeFromUrl || localStorage.getItem('active-room-code') || ''
    setActiveCode(standardCode.toUpperCase().trim())
  }, [roomCodeFromUrl])

  const { data: subData, loading: subLoading, error: subError } = useSubscription<any>(
    MULTIPLAYER_GAME_STATE_SUBSCRIPTION,
    {
      variables: { code: activeCode },
      skip: pollingActive || !activeCode,
    }
  )

  useEffect(() => {
    if (subError && activeCode) {
      setPollingActive(true)
    }
  }, [subError, activeCode])

  useEffect(() => {
    if (!pollingActive || !activeCode) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/multiplayer/game-state?code=${activeCode}`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setPollingData(data)
          setPollingError(null)
        }
      } catch (err) {
        setPollingError('Database pipeline disconnected')
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 1500)
    return () => clearInterval(interval)
  }, [pollingActive, activeCode])

  const room: MultiplayerRoom | undefined = pollingActive
    ? pollingData?.rooms?.[0]
    : subData?.rooms?.[0]

  const isHost = room?.host_user_id === userId

  const startGame = async (gameId: string, initialState?: any) => {
    if (!activeCode) return false
    try {
      const res = await fetch('/api/multiplayer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: activeCode, gameId, initialState }),
      })
      return res.ok
    } catch (err) {
      return false
    }
  }

  const updateGameState = async (stateUpdate: any) => {
    if (updating || !activeCode) return
    setUpdating(true)
    try {
      await fetch('/api/multiplayer/game-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: activeCode, state: stateUpdate }),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const leaveRoom = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active-room-code')
      window.location.href = '/dashboard'
    }
  }

  return {
    userId,
    room,
    gameState: room?.game_state?.state ?? null,
    loading: pollingActive ? !pollingData && !pollingError : subLoading,
    error: pollingError || (subError && !pollingActive ? subError.message : null),
    isHost,
    isWS: !pollingActive,
    activeRoomCode: activeCode,
    startGame,
    updateGameState,
    leaveRoom,
  }
}


components/multiplayer/GameWrapper.tsx:
'use client'

import React, { Suspense, useMemo, useState } from 'react'
import { getGame } from '@/app/games/registry'
import { GamePanel } from '@/app/games/_components/GameShell'
import { MultiplayerRoom } from '@/lib/multiplayer/types'
import { Trophy, Scroll } from 'lucide-react'
import { PersonaFlowHostMonitor } from '@/components/multiplayer/PersonaFlowHostMonitor'

type GameWrapperProps = {
  room: MultiplayerRoom
  userId: string | null
  isHost: boolean
  gameState: any
  updateGameState: (state: any) => Promise<void>
  leaveRoom: () => void
}

export function GameWrapper({
  room,
  userId,
  isHost,
  gameState,
  updateGameState,
  leaveRoom,
}: GameWrapperProps) {
  // Resolve game component from registry
  const gameDef = useMemo(() => {
    return getGame(room.game_id)
  }, [room.game_id])

  // Extract score states, defaults to empty map
  const playerScores = gameState?.scores || {}
  const playerLevels = gameState?.levels || {}
  const gameLogs: string[] = gameState?.logs || ['Signal connected. Sandbox listening for inputs.']

  // Render the registered game component
  const GameComponent = gameDef?.component


  const [isEndingGame, setIsEndingGame] = useState(false)
  const [endGameError, setEndGameError] = useState<string | null>(null)

  async function endCurrentGame() {
    const confirmed = window.confirm('End the current game for everyone in this room?')
    if (!confirmed) return

    setIsEndingGame(true)
    setEndGameError(null)

    try {
      const token = localStorage.getItem('jwt-token')

      const res = await fetch('/api/multiplayer/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: room.code,
          reason: 'Host ended the current game',
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to end game')
      }
    } catch (err: any) {
      setEndGameError(err.message || 'Failed to end game')
    } finally {
      setIsEndingGame(false)
    }
  }

  const [isStartingBidding, setIsStartingBidding] = useState(false)
  const [biddingError, setBiddingError] = useState<string | null>(null)

  const personaFlowEnded = room.game_id === 'persona-flow' && gameState?.personaFlow?.ended

  async function startBiddingFromPersonaRoom() {
    setIsStartingBidding(true)
    setBiddingError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt-token') : null

      const res = await fetch('/api/bidding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: room.code,
          startingTokens: 1_000_000,
          minIncrement: 50_000,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start bidding')
      }
    } catch (err: any) {
      setBiddingError(err.message || 'Failed to start bidding')
    } finally {
      setIsStartingBidding(false)
    }
  }

  return (
    <div className="space-y-6 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      {endGameError && (
        <div className="border border-[#ff6a6a]/40 bg-[#ff6a6a]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ff6a6a]">
          {endGameError}
        </div>
      )}
      <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#ff6a6a] flex items-center gap-2">
          <span className="h-1.5 w-1.5 bg-[#ff6a6a]" />
          SESSION CHANNEL: LIVE RUNNING
        </span>
        
        <div className="flex items-center gap-2">
        {isHost && (
          <button
            type="button"
            onClick={endCurrentGame}
            disabled={isEndingGame}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#ff6a6a] hover:text-white active:bg-[#ff6a6a] active:text-[#171717] px-2 py-0.5 transition-colors disabled:opacity-50"
          >
            {isEndingGame ? 'Ending...' : 'End Game'}
          </button>
        )}

        <button
          type="button"
          onClick={leaveRoom}
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] hover:text-white active:bg-[#ff6a6a] active:text-[#171717] px-2 py-0.5 transition-colors"
        >
          Disconnect
        </button>
      </div>
      </div>

      {/* Main Grid: Game View + Multiplayer HUD */}
      <div className="space-y-6">
        {room.game_id === 'persona-flow' && isHost ? (
        <div className="space-y-4">
          <PersonaFlowHostMonitor room={room} />

          {personaFlowEnded && (
            <GamePanel className="space-y-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                Persona Flow Complete
              </p>

              <h3 className="font-sans text-2xl uppercase tracking-[0.04em] text-white">
                Start Bidding in Same Room
              </h3>

              <p className="mx-auto max-w-[42ch] text-[12px] leading-5 text-[#929292]">
                Leaders and teams were created in this room. Continue with the same room code so bidding can detect those leaders.
              </p>

              {biddingError && (
                <div className="border border-[#ff6a6a]/40 bg-[#ff6a6a]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ff6a6a]">
                  {biddingError}
                </div>
              )}

              <button
                type="button"
                disabled={isStartingBidding}
                onClick={startBiddingFromPersonaRoom}
                className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:opacity-50"
              >
                {isStartingBidding ? 'Starting Bidding...' : 'Start Bidding Game'}
              </button>
            </GamePanel>
          )}
        </div>
      ) : GameComponent ? (
          <GamePanel className="relative">
            <Suspense
              fallback={
                <div className="flex h-48 items-center justify-center">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                    Syncing environment stream...
                  </span>
                </div>
              }
            >
              {/* Render the dynamic game component, passing down multiplayer sync props */}
              <GameComponent
                isMultiplayer={true}
                room={room}
                roomId={room.id}
                roomCode={room.code}
                gameState={gameState}
                updateGameState={updateGameState}
                players={room.room_players}
                userId={userId}
                isHost={isHost}
              />
            </Suspense>
          </GamePanel>
        ) : (
          <GamePanel className="py-8 text-center text-[#ff6a6a]">
            <p className="font-mono text-xs uppercase tracking-[0.14em]">
              ERR: Environment '{room.game_id}' not found in local registry.
            </p>
          </GamePanel>
        )}

        {/* Multiplayer HUD: Leaderboard & Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Live Leaderboard */}
          <div>
            <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] flex items-center gap-2">
                <Trophy size={12} className="text-[#DEF767]" />
                LIVE STANDINGS
              </p>
            </div>

            <div className="flex flex-col slab-list mt-2 max-h-48 overflow-y-auto">
              {room.room_players.map((player) => {
                const isMe = player.user.id === userId
                const pId = player.user.id
                
                // Read player's score or level from game state
                const score = playerScores[pId] ?? 0
                const level = playerLevels[pId] ?? 1

                return (
                  <div 
                    key={pId} 
                    className="flex h-[44px] items-center justify-between border border-[#2e2e2e] bg-[#171717]/70 px-4 -mt-[1px]"
                  >
                    <span className="font-sans text-[13px] uppercase tracking-[0.04em] text-[#929292] truncate max-w-[150px]">
                      {player.user.name} {isMe && <span className="font-mono text-[9px] text-[#DEF767] ml-1">(YOU)</span>}
                    </span>
                    <div className="font-mono text-[10px] text-white flex gap-3">
                      <span className="text-[#5b5b5b]">LVL {level}</span>
                      <span className="text-[#DEF767]">{score} PTS</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Log Console */}
          <div>
            <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] flex items-center gap-2">
                <Scroll size={12} />
                ACTIVITY SIGNAL LOG
              </p>
            </div>
            
            <div className="mt-2 border border-[#2e2e2e] bg-[#171717]/70 p-4 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5b5b5b] max-h-48 overflow-y-auto space-y-1.5 h-[140px] select-none">
              {gameLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-[#ff6a6a]">&gt;&gt;</span>
                  <span className="text-[#929292]">{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

app/room/[code]/page.tsx:
'use client'

import React, { use } from 'react'
import { GameShell } from '@/app/games/_components/GameShell'
import { useMultiplayer } from '@/lib/multiplayer/useMultiplayer'
import { Lobby } from '@/components/multiplayer/Lobby'
import { GameWrapper } from '@/components/multiplayer/GameWrapper'

export default function RoomCodePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code.toUpperCase().trim()

  const {
    userId,
    room,
    gameState,
    loading,
    error,
    isHost,
    isWS,
    startGame,
    updateGameState,
    leaveRoom,
  } = useMultiplayer(code)

  // Meta title and description based on room status
  const title = room?.status === 'in_game' ? 'Multiplayer Match' : 'Teammate Lobby'
  const description =
    room?.status === 'in_game'
      ? 'Collaborating or competing in real time. Work together to score!'
      : 'Invite other players using the lobby code. Prepare to launch.'
  const shellVariant =
    room?.game_id === "bidding" && isHost ? "stage" : "default";
  if (loading) {
    return (
      <GameShell
        meta={`UXISM / ROOM / ${code}`}
        title="Syncing..."
        description="Connecting to signal..."
        variant="default"
      >
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
            Loading room state...
          </p>
        </div>
      </GameShell>
    );
  }

  if (error || !room) {
    return (
      <GameShell meta="UXISM / MULTIPLAYER / ERROR" title="Lobby Error" description="The connection was interrupted.">
        <div className="border border-[#2e2e2e] bg-[#171717]/70 p-6 text-center space-y-4">
          <p className="font-mono text-xs text-[#ff6a6a] uppercase tracking-[0.12em]">
            {error || 'This room does not exist or has closed.'}
          </p>
          <button
            type="button"
            onClick={leaveRoom}
            className="px-4 py-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] transition-all"
          >
            Go Back
          </button>
        </div>
      </GameShell>
    )
  }


  const isHostBiddingStage = room.game_id === 'bidding' && isHost

  if (isHostBiddingStage) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-[#181818] text-white">
        <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
        <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
        <div className="pointer-events-none fixed bottom-4 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
        <div className="pointer-events-none fixed bottom-4 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />

        <section className="relative z-10 mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <GameWrapper
            room={room}
            userId={userId}
            isHost={isHost}
            gameState={gameState}
            updateGameState={updateGameState}
            leaveRoom={leaveRoom}
          />
        </section>
      </main>
    )
  }
  


  if (room.status === 'finished') {
    const personaEnded = room.game_id === 'persona-flow'
    const canStartBidding = isHost && personaEnded

    async function startBiddingFromFinishedRoom() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt-token') : null

      const res = await fetch('/api/bidding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          startingTokens: 1_000_000,
          minIncrement: 50_000,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.error || 'Failed to start bidding')
        return
      }

      window.location.reload()
    }

    return (
      <GameShell
        meta={`UXISM / ROOM / ${code}`}
        title={personaEnded ? 'Persona Flow Complete' : 'Game Ended'}
        description={
          personaEnded
            ? 'Persona leaders have been created. Continue this same room into Bidding.'
            : 'The game session has ended.'
        }
      >
        <div className="border border-[#2e2e2e] bg-[#171717]/70 p-6 text-center space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
            {personaEnded ? 'Persona Flow has ended.' : 'The game has ended.'}
          </p>

          <p className="text-[13px] leading-6 text-[#929292]">
            {personaEnded
              ? 'Use the same room code to continue into Bidding so the leaders can be detected.'
              : 'The current room session is complete.'}
          </p>

          {canStartBidding && (
            <button
              type="button"
              onClick={startBiddingFromFinishedRoom}
              className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]"
            >
              Start Bidding in This Room
            </button>
          )}
        </div>
      </GameShell>
    )
  }


  

  return (
    <GameShell
      meta={`UXISM / ROOM / ${code}`}
      title={title}
      description={description}
    >
      {room.status === 'waiting' ? (
        <Lobby
          room={room}
          userId={userId}
          isHost={isHost}
          isWS={isWS}
          onStart={(gameId) => startGame(gameId)}
          onLeave={leaveRoom}
        />
      ) : (
        <GameWrapper
          room={room}
          userId={userId}
          isHost={isHost}
          gameState={gameState}
          updateGameState={updateGameState}
          leaveRoom={leaveRoom}
        />
      )}
    </GameShell>
  )
}

app/api/persona-flow/claim/route.ts:
import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

type ClaimBody = {
  code: string
  domain: {
    id: string
    name: string
    description?: string
    icon?: string
  }
  persona: {
    id: string
    name: string
    color_code: string
    asset_path?: string
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ClaimBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!body.code || !body.domain || !body.persona) {
    return Response.json({ error: 'Missing code, domain, or persona' }, { status: 400 })
  }

  const code = body.code.toUpperCase().trim()

  try {
    const roomData = await hasuraAdminRequest<{
    rooms: Array<{
      id: string
      status: string
      game_id: string
      host_user_id: string
      room_players: Array<{ user_id: string }>
      game_state?: {
        state: any
      } | null
    }>
  }>(
      `query GetPersonaRoom($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          status
          game_id
          host_user_id
          room_players {
            user_id
          }
          game_state {
            state
          }
        }
      }  `,
      { code }
    )

    const room = roomData.rooms?.[0]

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'in_game' || room.game_id !== 'persona-flow') {
      return Response.json({ error: 'Persona Flow is not active in this room' }, { status: 400 })
    }

    if (room.host_user_id === userId) {
      return Response.json({ error: 'Host cannot claim a persona' }, { status: 403 })
    }

    const isPlayer = room.room_players.some((p) => p.user_id === userId)
    if (!isPlayer) {
      return Response.json({ error: 'You are not a player in this room' }, { status: 403 })
    }

    const claimResult = await hasuraAdminRequest<{
      insert_room_persona_claims: {
        affected_rows: number
        returning: Array<{
          id: string
          room_id: string
          user_id: string
          persona_id: string
          persona_name: string
          persona_hex: string
          domain_id: string
          domain_name: string
          claimed_at: string
        }>
      }
    }>(
      `mutation TryClaimPersona(
        $roomId: uuid!
        $userId: uuid!
        $domainId: String!
        $domainName: String!
        $domainDescription: String
        $domainIcon: String
        $personaId: String!
        $personaName: String!
        $personaHex: String!
        $personaAssetPath: String
      ) {
        insert_room_persona_claims(
          objects: [{
            room_id: $roomId
            user_id: $userId
            domain_id: $domainId
            domain_name: $domainName
            domain_description: $domainDescription
            domain_icon: $domainIcon
            persona_id: $personaId
            persona_name: $personaName
            persona_hex: $personaHex
            persona_asset_path: $personaAssetPath
          }]
          on_conflict: {
            constraint: room_persona_claims_room_persona_key
            update_columns: []
          }
        ) {
          affected_rows
          returning {
            id
            room_id
            user_id
            persona_id
            persona_name
            persona_hex
            domain_id
            domain_name
            claimed_at
          }
        }
      }`,
      {
        roomId: room.id,
        userId,
        domainId: body.domain.id,
        domainName: body.domain.name,
        domainDescription: body.domain.description ?? null,
        domainIcon: body.domain.icon ?? null,
        personaId: body.persona.id,
        personaName: body.persona.name,
        personaHex: body.persona.color_code,
        personaAssetPath: body.persona.asset_path ?? null,
      }
    )

    const insertedClaim = claimResult.insert_room_persona_claims.returning[0]

    if (!insertedClaim) {
      const existing = await hasuraAdminRequest<{
        room_persona_claims: Array<{
          user_id: string
          persona_name: string
          domain_name: string
          user?: { name?: string | null }
        }>
      }>(
        `query ExistingPersonaClaim($roomId: uuid!, $personaId: String!) {
          room_persona_claims(
            where: {
              room_id: { _eq: $roomId }
              persona_id: { _eq: $personaId }
            }
            limit: 1
          ) {
            user_id
            persona_name
            domain_name
            user {
              name
            }
          }
        }`,
        {
          roomId: room.id,
          personaId: body.persona.id,
        }
      )

      const takenBy = existing.room_persona_claims[0]

      return Response.json(
        {
          won: false,
          error: 'Persona already claimed',
          takenBy: takenBy?.user?.name || 'Another player',
        },
        { status: 409 }
      )
    }

    const teamName = `${body.persona.name} — ${body.domain.name}`

    const teamResult = await hasuraAdminRequest<{
      insert_teams_one: { id: string } | null
    }>(
      `mutation CreatePersonaTeam(
        $name: String!
        $color: String!
        $userId: uuid!
        $roomId: uuid!
        $domainId: String!
        $domainName: String!
        $domainDescription: String
        $personaId: String!
        $personaName: String!
        $personaHex: String!
      ) {
        insert_teams_one(
          object: {
            name: $name
            color: $color
            created_by: $userId
            leader_id: $userId
            room_id: $roomId
            domain_id: $domainId
            domain_name: $domainName
            domain_description: $domainDescription
            persona_id: $personaId
            persona_name: $personaName
            persona_hex: $personaHex
          }
          on_conflict: {
            constraint: teams_room_id_persona_id_key
            update_columns: [
              name
              color
              created_by
              leader_id
              domain_id
              domain_name
              domain_description
              persona_name
              persona_hex
            ]
          }
        ) {
          id
        }
      }`,
      {
        name: teamName,
        color: body.persona.color_code,
        userId,
        roomId: room.id,
        domainId: body.domain.id,
        domainName: body.domain.name,
        domainDescription: body.domain.description ?? '',
        personaId: body.persona.id,
        personaName: body.persona.name,
        personaHex: body.persona.color_code,
      }
    )
    console.log('[Persona Claim Team Result]', {
      roomId: room.id,
      userId,
      personaId: body.persona.id,
      teamResult,
    })

    if (teamResult.insert_teams_one?.id) {
      await hasuraAdminRequest(
        `mutation AddPersonaTeamLeader($teamId: uuid!, $userId: uuid!) {
          insert_team_members_one(
            object: {
              team_id: $teamId
              user_id: $userId
              member_type: "LEADER"
            }
            on_conflict: {
              constraint: team_members_pkey
              update_columns: []
            }
          ) {
            id
          }
        }`,
        {
          teamId: teamResult.insert_teams_one.id,
          userId,
        }
      )
    }

    const countData = await hasuraAdminRequest<{
      room_persona_claims_aggregate: { aggregate: { count: number } }
    }>(
      `query CountRoomClaims($roomId: uuid!) {
        room_persona_claims_aggregate(where: { room_id: { _eq: $roomId } }) {
          aggregate {
            count
          }
        }
      }`,
      { roomId: room.id }
    )

    const claimCount = countData.room_persona_claims_aggregate.aggregate.count
    const gameEnded = claimCount >= 20

    const previousState = room.game_state?.state || {}


    await hasuraAdminRequest(
      `mutation SyncPersonaGameState($roomId: uuid!, $state: jsonb!, $status: String!) {
        insert_game_state_one(
          object: {
            room_id: $roomId
            state: $state
          }
          on_conflict: {
            constraint: game_state_pkey
            update_columns: [state, updated_at]
          }
        ) {
          room_id
        }

        update_rooms_by_pk(
          pk_columns: { id: $roomId }
          _set: { status: $status }
        ) {
          id
          status
        }
      }`,
      {
        roomId: room.id,
        status: 'in_game',
        state: {
        ...previousState,
          personaFlow: {
            ...(previousState.personaFlow || {}),
            claimCount,
            totalPersonas: 20,
            ended: gameEnded,
            readyForBidding: gameEnded,
            lastClaim: insertedClaim,
          },
          logs: [
            `${body.persona.name} claimed by player ${userId.slice(0, 8)} in ${body.domain.name}`,
            ...(Array.isArray(previousState.logs) ? previousState.logs : []),
          ].slice(0, 50),
        },
      }
    )

    return Response.json({
      won: true,
      gameEnded,
      claimCount,
      claim: insertedClaim,
    })
  } catch (err: any) {
    console.error('Persona claim error:', err)
    return Response.json({ error: err.message || 'Failed to claim persona' }, { status: 500 })
  }
}

app/api/multiplayer/game-state/route.ts:
import { NextRequest } from 'next/server'
import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return Response.json({ error: 'Room code required' }, { status: 400 })
  }

  const uppercaseCode = code.toUpperCase().trim()

  try {
    const data = await hasuraAdminRequest<{
      rooms: any[]
    }>(
      `query GetGameState($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          code
          status
          game_id
          host_user_id
          max_players
          
          room_players(order_by: { joined_at: asc }) {
            joined_at
            user {
              id
              name
              profile_picture
            }
          }

          room_persona_claims(order_by: { claimed_at: asc }) {
          id
          user_id
          domain_id
          domain_name
          domain_description
          domain_icon
          persona_id
          persona_name
          persona_hex
          persona_asset_path
          claimed_at
          user {
            id
            name
            profile_picture
          }
        }

  
          game_state {
            room_id
            state
            updated_at
          }
        }
      }`,
      { code: uppercaseCode }
    )

    if (!data.rooms || !data.rooms.length) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    return Response.json(data)
  } catch (err: any) {
    console.error('Error fetching game state:', err)
    return Response.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let code: string
  let stateUpdate: any

  try {
    const body = await req.json()
    code = body.code
    stateUpdate = body.state
  } catch (e) {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })
  if (!stateUpdate) return Response.json({ error: 'State update required' }, { status: 400 })

  const uppercaseCode = code.toUpperCase().trim()

  try {
    // 1. Fetch current room details, players, and existing game state to authorize and merge
    const data = await hasuraAdminRequest<{
      rooms: Array<{
        id: string
        room_players: Array<{ user_id: string }>
        game_state?: { state: any }
      }>
    }>(
      `query VerifyAndFetchState($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          room_players {
            user_id
          }
          game_state {
            state
          }
        }
      }`,
      { code: uppercaseCode }
    )

    if (!data.rooms || !data.rooms.length) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    const room = data.rooms[0]
    
    // Check if the current user is a player in this room
    const isPlayer = room.room_players.some(p => p.user_id === userId)
    if (!isPlayer) {
      return Response.json({ error: 'You are not a player in this room' }, { status: 403 })
    }

    const currentGameState = room.game_state?.state || {}
    
    // 2. Merge current state with updates
    let mergedState = { ...currentGameState }
    
    for (const key of Object.keys(stateUpdate)) {
      if (key === 'logs' && Array.isArray(stateUpdate[key]) && Array.isArray(currentGameState[key])) {
        // Prepend new logs and limit to last 20
        mergedState.logs = [...stateUpdate.logs, ...currentGameState.logs].slice(0, 20)
      } else {
        mergedState[key] = stateUpdate[key]
      }
    }

    // 3. Save the merged game state back to the database
    const updateResult = await hasuraAdminRequest<{
      insert_game_state_one: {
        room_id: string
        state: any
        updated_at: string
      }
    }>(
      `mutation UpdateGameState($roomId: uuid!, $state: jsonb!) {
        insert_game_state_one(
          object: { room_id: $roomId, state: $state }
          on_conflict: { constraint: game_state_pkey, update_columns: [state, updated_at] }
        ) {
          room_id
          state
          updated_at
        }
      }`,
      { roomId: room.id, state: mergedState }
    )

    return Response.json({ success: true, game_state: updateResult.insert_game_state_one })
  } catch (err: any) {
    console.error('Error updating game state:', err)
    return Response.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}



component/views/PersonaTakenScreen:
'use client';
// components/PersonaTakenScreen.tsx — Race-loss overlay
import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import styles from './PersonaTakenScreen.module.css';

export default function PersonaTakenScreen() {
  const { state, dispatch } = useGame();
  const { selectedPersona, personaTakenBy } = state;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-modal="true"
      role="alertdialog"
      aria-label="Persona claimed by another player"
    >
      <motion.div
        className={styles.card}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
      >
        <div className={styles.tag} aria-hidden="true">PERSONA TAKEN</div>

        <div className={styles.personaBadge} style={{ borderColor: selectedPersona?.color_code }}>
          <span
            className={styles.personaDot}
            style={{ background: selectedPersona?.color_code }}
            aria-hidden="true"
          />
          <span className={styles.personaName}>{selectedPersona?.name}</span>
        </div>

        <h1 className={styles.heading}>You were outpaced.</h1>

        {personaTakenBy && (
          <p className={styles.takenBy} aria-live="assertive">
            <span className={styles.takenByUser}>{personaTakenBy}</span> claimed it first.
          </p>
        )}

        <p className={styles.sub}>Select another domain or persona.</p>

        <div className={styles.actions}>
          <button
            id="taken-pick-another"
            type="button"
            className={styles.primaryBtn}
            onClick={() => dispatch({ type: 'PICK_ANOTHER_PERSONA' })}
          >
            Pick Another Persona
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}





lib/mockData.ts:
// Fully self-contained mock dataset — no Hasura/DB required for the MVP demo.

import { Domain, Persona, Card, User } from '@/app/x/types/index';
import {
  HeartPulse,
  GraduationCap,
  Landmark,
  ShoppingCart,
  TrainFront, // or Truck / Bus
  Sprout, // or Tractor
  Store,
  Plane, // or MapPin
  Scale, // or Building2
  Clapperboard
} from 'lucide-react';
export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'PlayerOne', teamName: 'Alpha Squad', teamMembers: ['Alice', 'Bob', 'Charlie'] },
  { id: 'u2', username: 'NeonRacer', teamName: 'Cyber Punks', teamMembers: ['Dave', 'Eve', 'Frank'] },
  { id: 'u3', username: 'GridRunner', teamName: 'Velocity', teamMembers: ['Grace', 'Heidi', 'Ivan'] },
  { id: 'u4', username: 'DataPilot', teamName: 'NeuroNet', teamMembers: ['Jack', 'Karl', 'Liam'] },
];

// export const MOCK_DOMAINS: Domain[] = [
//   { id: 'd1', name: 'Health Care Sector', icon: '◈', description: 'Delivering quality healthcare services to improve patient outcomes and wellbeing.' },
//   { id: 'd2', name: 'Education Sector', icon: '⊕', description: 'Empowering learners through accessible, engaging, and effective educational experiences.' },
//   { id: 'd3', name: 'Banking & Finance Sector', icon: '⊙', description: 'Managing financial transactions securely while enabling economic growth opportunities.' },
//   { id: 'd4', name: 'E-Commerce Sector', icon: '🎮', description: 'Providing convenient online shopping experiences with seamless digital transactions.' },
//   { id: 'd5', name: 'Transportation & Mobility Sector', icon: '🎮', description: 'Enabling efficient movement of people and goods across regions.' },
//   { id: 'd6', name: 'Agriculture Sector', icon: '🎮', description: 'Enhancing crop production through sustainable farming practices and innovation.' },
//   { id: 'd7', name: 'Retail Sector', icon: '🎮', description: 'Connecting customers with products through personalized shopping experiences daily.' },
//   { id: 'd8', name: 'Travel & Hospitality Sector', icon: '🎮', description: 'Creating exceptional travel experiences and comfortable hospitality services worldwide.' },
//   { id: 'd9', name: 'Government & Public Service Sector', icon: '🎮', description: 'Delivering public services efficiently while promoting transparency and accountability.' },
//   { id: 'd10', name: 'Media & Entertainment Sector', icon: '🎮', description: 'Engaging audiences with creative content across diverse digital platforms.' },
// ];

export const MOCK_DOMAINS: Domain[] = [
  { id: 'd1', name: 'Health Care Sector', icon: '✚', description: 'Delivering quality healthcare services to improve patient outcomes and wellbeing.' }, // Heavy cross
  { id: 'd2', name: 'Education Sector', icon: '✎', description: 'Empowering learners through accessible, engaging, and effective educational experiences.' }, // Pencil
  { id: 'd3', name: 'Banking & Finance Sector', icon: '⛃', description: 'Managing financial transactions securely while enabling economic growth opportunities.' }, // Coin stack / Database
  { id: 'd4', name: 'E-Commerce Sector', icon: '⊞', description: 'Providing convenient online shopping experiences with seamless digital transactions.' }, // Digital grid / Window
  { id: 'd5', name: 'Transportation & Mobility Sector', icon: '⇄', description: 'Enabling efficient movement of people and goods across regions.' }, // Movement arrows
  { id: 'd6', name: 'Agriculture Sector', icon: '⚘', description: 'Enhancing crop production through sustainable farming practices and innovation.' }, // Plant symbol
  { id: 'd7', name: 'Retail Sector', icon: '⌂', description: 'Connecting customers with products through personalized shopping experiences daily.' }, // Storefront / Building
  { id: 'd8', name: 'Travel & Hospitality Sector', icon: '⛯', description: 'Creating exceptional travel experiences and comfortable hospitality services worldwide.' }, // Map marker / Compass
  { id: 'd9', name: 'Government & Public Service Sector', icon: '🏛', description: 'Delivering public services efficiently while promoting transparency and accountability.' }, // Scales
  { id: 'd10', name: 'Media & Entertainment Sector', icon: '▷', description: 'Engaging audiences with creative content across diverse digital platforms.' }  // Play button
];


export const MOCK_PERSONAS: Persona[] = [
  {
    id: "p01",
    name: "Shanti Devi",
    domain_id: "d1",
    color_code: "#FEF102",
    asset_path: "/assets/avatars/ShantiDevi.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "63, female | Goals: Book doctor appointments easily, Access prescriptions and reports, Understand medicines | Pain Points: Difficulty reading English interfaces, Confused by medical terminology",
    scenario: "Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.",
    ux_problems: "Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users, Lack of guided navigation, No offline-first experience",
    ui_problems: "Visual Clutter, Small text sizes, Poor contrast ratios, Non-standard icons, Lack of visual cues",
    cx_problems: "Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance, Inconsistent support experience, Reduced trust after failed payments",
    ai_problems: "Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations, Weak personalization for chronic patients, Inability to detect emotional distress"
  },
  {
    id: "p02",
    name: "Rohit Malhotra",
    domain_id: "d1",
    color_code: "#CADB2B",
    asset_path: "/assets/avatars/Rohit.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "32, male | Goals: Quick doctor consultations, Fast insurance claims, Smart health tracking | Pain Points: Too many irrelevant notifications, Confusing insurance claim process",
    scenario: "Rohit uses a health app to schedule annual checkups and manage fitness reports but receives irrelevant notifications and duplicate reminders.",
    ux_problems: "Fragmented patient journeys, Repetitive data entry, Poor synchronization across devices, Confusing insurance claim workflow",
    ui_problems: "Cluttered dashboards, Notification overload, Unclear CTAs, Difficult report comparison views",
    cx_problems: "Distrust in hidden healthcare costs, Frustration from delayed customer support, Lack of continuity between hospitals and insurers, Emotional stress during emergencies",
    ai_problems: "Incorrect health risk scoring, Weak predictive alerts, Generic fitness recommendations, Data privacy concerns, Poor integration of wearable data"
  },
  {
    id: "p03",
    name: "Kavya",
    domain_id: "d2",
    color_code: "#72AC22",
    asset_path: "/assets/avatars/Kavya.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "14, female | Goals: Access learning content, Prepare for exams, Learn in Punjabi/Hindi | Pain Points: Poor internet for online learning, Difficult navigation on LMS platforms",
    scenario: "Kavya attends online classes through a state LMS but struggles due to poor internet and difficult navigation.",
    ux_problems: "Complicated course navigation, Lack of progress indicators, Poor mobile optimization, High cognitive load for students",
    ui_problems: "Tiny clickable areas, Poor readability, Non responsive layouts, Excessive text heavy screens",
    cx_problems: "Feeling disconnected from teachers, Low motivation due to isolation, Frustration from technical issues, Reduced confidence after repeated failures",
    ai_problems: "Weak adaptive learning models, Poor language translation quality, Inaccurate student performance prediction, Lack of emotional engagement analysis"
  },
  {
    id: "p04",
    name: "Dr. Meera",
    domain_id: "d2",
    color_code: "#4BB059",
    asset_path: "/assets/avatars/DrMeera.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "45, female | Goals: Manage assignments efficiently, Track student performance, Conduct hybrid classes | Pain Points: Time consuming grading workflows, Overcrowded dashboards",
    scenario: "Dr. Meera uses a university LMS to upload assignments but struggles with grading automation and analytics.",
    ux_problems: "Complex admin workflows, Multi step grading systems, Poor analytics discoverability, Time consuming content uploads",
    ui_problems: "Overcrowded teacher dashboards, Difficult table navigation, Poor accessibility for long sessions, Inconsistent layouts across modules",
    cx_problems: "Burnout due to repetitive tasks, Lack of trust in digital grading, Difficulty maintaining student engagement, Reduced satisfaction from system crashes",
    ai_problems: "Incorrect plagiarism detection, Weak recommendation engines, Bias in automated grading, Poor predictive dropout analysis"
  },
  {
    id: "p05",
    name: "Suresh",
    domain_id: "d3",
    color_code: "#319F69",
    asset_path: "/assets/avatars/Suresh.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "40, male | Goals: Manage inventory, Track sales, File GST easily | Pain Points: Complex tax filing, Difficult inventory management, Lack of business insights",
    scenario: "Suresh tries to use a business management app to track his shop's inventory and file GST but finds the interface overwhelming.",
    ux_problems: "Confusing tax filing steps, Lack of bulk inventory updates, Poor data visualization, Non-intuitive navigation",
    ui_problems: "Cluttered data tables, Small fonts, Lack of visual hierarchy, Inconsistent button styles",
    cx_problems: "Anxiety over tax compliance, Frustration with slow support, Lack of trust in data security, Feeling overwhelmed by complex features",
    ai_problems: "Inaccurate sales forecasting, Weak inventory alerts, Generic business advice, Poor tax calculation accuracy"
  },

  {
    id: "p06",
    name: "Aditi",
    domain_id: "d3",
    color_code: "#29BA8F",
    asset_path: "/assets/avatars/Aditi.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "27, male | Goals: Invest in mutual funds Track portfolio growth Receive smart financial insights | Pain Points: Complex investment analysis Irrelevant financial suggestions",
    scenario: "Aditi uses an investment app but receives confusing risk analysis and irrelevant investment suggestions.",
    ux_problems: "Difficult onboarding for investors Complex portfolio comparison flows Poor transaction transparency Overwhelming financial information",
    ui_problems: "Cluttered data tables, Small fonts, Lack of visual hierarchy, Inconsistent button styles",
    cx_problems: "Anxiety over tax compliance, Frustration with slow support, Lack of trust in data security, Feeling overwhelmed by complex features",
    ai_problems: "Inaccurate sales forecasting, Weak inventory alerts, Generic business advice, Poor tax calculation accuracy"
  },






];

// ─────────────────────────────────────────────────────────────
// 7 correct cards per persona — the new design sequence
// ─────────────────────────────────────────────────────────────
export const HARDCODED_CARDS: Card[] = [
  // p01 — Shanti Devi (Mapped to d1)
  {
    id: 'c01-avatar', persona_id: 'p01', domain_id: 'd1', card_type: 'AVATAR',
    heading: 'Shanti Devi', content: 'Elderly Rural Patient'
  },
  {
    id: 'c01-persona', persona_id: 'p01', domain_id: 'd1', card_type: 'PERSONA',
    heading: 'Elderly Rural Patient', subHeading: 'Shanti Devi', content: 'Profile Details',
    sections: [
      { label: 'Demographics', value: '63, female' },
      { label: 'Goals', value: 'Book doctor appointments easily, Access prescriptions' },
      { label: 'Pain Points', value: 'Difficulty reading English, Confused by medical terminology' },
    ]
  },
  {
    id: 'c01-scenario', persona_id: 'p01', domain_id: 'd1', card_type: 'SCENARIO',
    heading: 'The Scenario', content: 'Scenario Context',
    bodyText: 'Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.'
  },
  {
    id: 'c01-ux', persona_id: 'p01', domain_id: 'd1', card_type: 'UX_PROBLEM',
    heading: 'UX Challenges', content: 'UX Problem',
    bodyText: 'Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users.'
  },
  {
    id: 'c01-ui', persona_id: 'p01', domain_id: 'd1', card_type: 'UI_PROBLEM',
    heading: 'UI & Interaction', content: 'UI Problem',
    listItems: [
      'Visual Clutter',
      'Small text sizes',
      'Poor contrast ratios',
      'Non-standard icons',
      'Lack of visual cues'
    ]
  },
  {
    id: 'c01-cx', persona_id: 'p01', domain_id: 'd1', card_type: 'CX_PROBLEM',
    heading: 'CX & Trust', subHeading: 'Emotional Nudge', content: 'CX Problem',
    bodyText: 'Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance.'
  },
  {
    id: 'c01-ai', persona_id: 'p01', domain_id: 'd1', card_type: 'AI_PROBLEM',
    heading: 'AI Intelligence', content: 'AI Problem',
    bodyText: 'Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations.'
  },
];

const generatedCards: Card[] = [];
MOCK_PERSONAS.forEach(p => {
  const dId = p.domain_id;
  const hasHardcoded = HARDCODED_CARDS.some(c => c.persona_id === p.id && c.domain_id === dId);

  if (!hasHardcoded) {
    // 1. AVATAR
    generatedCards.push({
      id: `c-${p.id}-avatar`, persona_id: p.id, domain_id: dId, card_type: 'AVATAR',
      heading: p.name, content: "Persona Archetype"
    });

    // 2. PERSONA
    const descParts = p.persona_details?.split('|') || [];
    const sections = descParts.map(part => {
      const [label, ...valueParts] = part.split(':');
      if (valueParts.length === 0) return { label: 'Bio', value: label.trim() };
      return {
        label: label?.trim() || "Profile",
        value: valueParts.join(':')?.trim() || part.trim()
      };
    });
    generatedCards.push({
      id: `c-${p.id}-persona`, persona_id: p.id, domain_id: dId, card_type: 'PERSONA',
      heading: "Archetype Profile", subHeading: p.name, content: 'Persona Details',
      sections: sections.length > 0 ? sections : [{ label: 'Trait', value: 'Archetype Trait' }]
    });

    // 3. SCENARIO
    generatedCards.push({
      id: `c-${p.id}-scenario`, persona_id: p.id, domain_id: dId, card_type: 'SCENARIO',
      heading: 'The Scenario', content: 'Scenario',
      bodyText: p.scenario || `Context for ${p.name}.`
    });

    // 4. UX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ux`, persona_id: p.id, domain_id: dId, card_type: 'UX_PROBLEM',
      heading: 'UX Challenges', content: 'UX Problem',
      bodyText: p.ux_problems || `Analyze UX for ${p.name}.`
    });

    // 5. UI_PROBLEM
    const uiList = p.ui_problems?.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'z') || [];
    generatedCards.push({
      id: `c-${p.id}-ui`, persona_id: p.id, domain_id: dId, card_type: 'UI_PROBLEM',
      heading: 'UI & Interaction', content: 'UI Problem',
      listItems: uiList.length > 0 ? uiList : ['Analyze visual hierarchy', 'Review touch targets', 'Check accessibility']
    });

    // 6. CX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-cx`, persona_id: p.id, domain_id: dId, card_type: 'CX_PROBLEM',
      heading: 'CX & Trust', subHeading: 'Emotional Nudge',
      content: 'CX Problem',
      bodyText: p.cx_problems || `Build trust with ${p.name}.`
    });

    // 7. AI_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ai`, persona_id: p.id, domain_id: dId, card_type: 'AI_PROBLEM',
      heading: 'AI Intelligence', content: 'AI Problem',
      bodyText: p.ai_problems || `AI recommendations for ${p.name}.`
    });
  }
});

export const MOCK_CARDS: Card[] = [...HARDCODED_CARDS, ...generatedCards];

export function buildDeck(_correctCards: Card[], allCards: Card[], domainId: string): Card[] {
  // Return all cards for this domain, shuffled.
  // The RuleManager will filter them to show only the relevant next slot.
  return allCards
    .filter(c => c.domain_id === domainId)
    .sort(() => Math.random() - 0.5);
}

import { SlotState, SlotKey, SLOT_ORDER } from '@/app/x/types/index';

export function isFlowComplete(slots: SlotState, correctCards: Card[]): boolean {
  return SLOT_ORDER.every((slotKey: SlotKey) => {
    const placed = slots[slotKey];
    if (!placed) return false;
    const correct = correctCards.find(c => c.card_type === slotKey);
    return placed.id === correct?.id;
  });
}

export function getCorrectCards(personaId: string, domainId: string): Card[] {
  return MOCK_CARDS.filter(c => c.persona_id === personaId && c.domain_id === domainId);
}
