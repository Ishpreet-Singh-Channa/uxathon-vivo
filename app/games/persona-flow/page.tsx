// "use client";

// import React, { useEffect, Suspense } from "react";
// import { useSearchParams } from "next/navigation";
// import { useMultiplayer } from "@/lib/multiplayer/useMultiplayer";
// import { GameShell } from "../_components/GameShell";

// // Import your X app dependencies
// import { GameProvider, useGame } from "@/store/gameStore";
// import UserSelect from "@/components/onboarding/UserSelect/UserSelect";
// import DomainSelect from "@/components/onboarding/DomainSelect/DomainSelect";
// import PersonaSelect from "@/components/onboarding/PersonaSelect/PersonaSelect";
// import GameBoard from "@/components/game/GameBoard/GameBoard";
// import Leaderboard from "@/components/views/Leaderboard/Leaderboard";
// import FABRail from "@/components/core/FABRail/FABRail";

// function PersonaFlowBridge() {
//   const searchParams = useSearchParams();
//   const mode = searchParams.get("mode");
  
//   const { userId, room, gameState, updateGameState, activeRoomCode } = useMultiplayer();
//   const isMultiplayer = mode !== "singleplayer" && !!activeRoomCode;

//   const { state, dispatch } = useGame();

//   // 1. Sync User Data Automatically in Multiplayer
//   useEffect(() => {
//     if (isMultiplayer && room && state.gamePhase === 'USER_SELECT') {
//       const me = room.room_players.find(p => p.user.id === userId);
//       if (me) {
//         dispatch({
//           type: 'SET_USER',
//           payload: {
//             id: me.user.id,
//             username: me.user.name || 'Network Node',
//             teamName: 'UXISM Squad'
//           }
//         });
//         dispatch({ type: 'GO_TO_PHASE', payload: 'DOMAIN_SELECT' });
//       }
//     }
//   }, [isMultiplayer, room, state.gamePhase, userId, dispatch]);

//   // 2. Broadcast Local Wins to the Multiplayer Matrix
//   useEffect(() => {
//     if (isMultiplayer && state.gamePhase === 'WON' && state.personaClaimed) {
//       const syncClaim = async () => {
//         const currentClaims = gameState?.claims || {};
//         const currentLogs = gameState?.logs || [];
        
//         // Prevent duplicate broadcast
//         if (currentClaims[state.selectedPersona!.id] === userId) return;

//         await updateGameState({
//           ...gameState,
//           claims: {
//             ...currentClaims,
//             [state.selectedPersona!.id]: userId
//           },
//           logs: [
//             `Node ${state.currentUser?.username} secured persona: ${state.selectedPersona!.name}`,
//             ...currentLogs
//           ].slice(0, 20)
//         });
//       };
//       syncClaim();
//     }
//   }, [state.gamePhase, state.personaClaimed]);

//   // 3. Listen for Rival Claims and Update Local State
//   useEffect(() => {
//     if (isMultiplayer && gameState?.claims && state.selectedPersona) {
//       const claimedBy = gameState.claims[state.selectedPersona.id];
      
//       // If claimed by someone else, trigger the taken screen
//       if (claimedBy && claimedBy !== userId) {
//         const rivalPlayer = room?.room_players.find(p => p.user.id === claimedBy);
//         dispatch({ 
//           type: 'PERSONA_TAKEN_BY', 
//           payload: rivalPlayer?.user.name || 'Rival Node' 
//         });
//       }
//     }
//   }, [gameState?.claims, state.selectedPersona, userId, room, dispatch]);

//   return (
//     <div className="relative flex flex-col w-full h-full min-h-[600px] bg-[#181818] overflow-hidden rounded-xl border border-[#2e2e2e]">
//       {state.gamePhase === 'USER_SELECT' && <UserSelect />}
//       {state.gamePhase === 'DOMAIN_SELECT' && <DomainSelect />}
//       {state.gamePhase === 'PERSONA_SELECT' && <PersonaSelect />}
//       {state.gamePhase === 'LEADERBOARD' && <Leaderboard />}
//       {(state.gamePhase === 'PLAYING' ||
//         state.gamePhase === 'WON' ||
//         state.gamePhase === 'PERSONA_TAKEN') && <GameBoard />}
//       <FABRail />
//     </div>
//   );
// }

// export default function PersonaFlowPage() {
//   const searchParams = useSearchParams();
//   const mode = searchParams.get("mode");
//   const isMultiplayer = mode !== "singleplayer";

//   return (
//     <GameShell
//       meta={`UXATHON / ENVIRONMENT / PERSONA FLOW / [${isMultiplayer ? "MULTIPLAYER" : "SINGLEPLAYER"}]`}
//       title="Context Persona Flow"
//       description="Navigate the matrix. Align archetypes to operational realities before your rivals."
//     >
//       <GameProvider>
//         <Suspense fallback={<div className="p-8 text-center text-[#5b5b5b] font-mono uppercase text-[11px]">Initializing Pipeline...</div>}>
//           <PersonaFlowBridge />
//         </Suspense>
//       </GameProvider>
//     </GameShell>
//   );
// }






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

// 1. The Bridge Logic (Expects the mode to be passed down)
function PersonaFlowBridge({ isMultiplayer }: { isMultiplayer: boolean }) {
  const { userId, room, gameState, updateGameState, activeRoomCode } = useMultiplayer();
  const isMultiplayerActive = isMultiplayer && !!activeRoomCode;

  const { state, dispatch } = useGame();

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
  useEffect(() => {
    if (isMultiplayerActive && state.gamePhase === 'WON' && state.personaClaimed) {
      const syncClaim = async () => {
        const currentClaims = gameState?.claims || {};
        const currentLogs = gameState?.logs || [];
        
        if (currentClaims[state.selectedPersona!.id] === userId) return;

        await updateGameState({
          ...gameState,
          claims: {
            ...currentClaims,
            [state.selectedPersona!.id]: userId
          },
          logs: [
            `Node ${state.currentUser?.username} secured persona: ${state.selectedPersona!.name}`,
            ...currentLogs
          ].slice(0, 20)
        });
      };
      syncClaim();
    }
  }, [state.gamePhase, state.personaClaimed]);

  // Listen for Rival Claims and Update Local State
  useEffect(() => {
    if (isMultiplayerActive && gameState?.claims && state.selectedPersona) {
      const claimedBy = gameState.claims[state.selectedPersona.id];
      
      if (claimedBy && claimedBy !== userId) {
        const rivalPlayer = room?.room_players.find(p => p.user.id === claimedBy);
        dispatch({ 
          type: 'PERSONA_TAKEN_BY', 
          payload: rivalPlayer?.user.name || 'Rival Node' 
        });
      }
    }
  }, [gameState?.claims, state.selectedPersona, userId, room, dispatch]);

  return (
    <div className="relative flex flex-col w-full h-full min-h-[600px] bg-[#181818] overflow-hidden rounded-xl border border-[#2e2e2e]">
      {state.gamePhase === 'USER_SELECT' && <UserSelect />}
      {state.gamePhase === 'DOMAIN_SELECT' && <DomainSelect />}
      {state.gamePhase === 'PERSONA_SELECT' && <PersonaSelect />}
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
  const isMultiplayer = mode !== "singleplayer";

  return (
    <GameShell
      meta={`UXATHON / ENVIRONMENT / PERSONA FLOW / [${isMultiplayer ? "MULTIPLAYER" : "SINGLEPLAYER"}]`}
      title="Context Persona Flow"
      description="Navigate the matrix. Align archetypes to operational realities before your rivals."
    >
      <GameProvider>
        <PersonaFlowBridge isMultiplayer={isMultiplayer} />
      </GameProvider>
    </GameShell>
  );
}

// 3. The Default Export (Provides the Suspense Boundary to prevent Next.js build crash)
export default function PersonaFlowPage() {
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
