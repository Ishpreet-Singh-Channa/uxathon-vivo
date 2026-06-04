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
  const isMultiplayerActive = !!isMultiplayer && !!room?.id;

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
      const me = room.room_players.find((p:any) => p.user.id === userId);
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
function PersonaFlowPageInner(props: PersonaFlowPageProps) {
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
      <PersonaFlowPageInner {...props}/>
    </Suspense>
  );
}
