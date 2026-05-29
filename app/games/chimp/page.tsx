// "use client";

// import React from "react";
// import {
//   GamePanel,
//   GameShell,
//   GameStats,
//   gameButtonPrimary,
//   gameButtonSecondary,
// } from "../_components/GameShell";

// type Phase = "idle" | "memorize" | "input" | "success" | "fail";

// const START_COUNT = 4;
// const MAX_COUNT = 25;
// const MEMORIZE_MS = 1400;
// const MIN_MEMORIZE_MS = 650;

// function shuffle<T>(items: T[]) {
//   const copy = [...items];
//   for (let index = copy.length - 1; index > 0; index -= 1) {
//     const swapIndex = Math.floor(Math.random() * (index + 1));
//     [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
//   }
//   return copy;
// }

// function createBoard(count: number) {
//   const positions = shuffle(Array.from({ length: count }, (_, index) => index));
//   return Array.from({ length: count }, (_, index) => ({
//     number: index + 1,
//     position: positions[index],
//   }));
// }

// function ChimpGame() {
//   const [level, setLevel] = React.useState(1);
//   const [phase, setPhase] = React.useState<Phase>("idle");
//   const [board, setBoard] = React.useState<Array<{ number: number; position: number }>>([]);
//   const [boardCount, setBoardCount] = React.useState(START_COUNT);
//   const [expected, setExpected] = React.useState(1);
//   const [revealed, setRevealed] = React.useState<number[]>([]);
//   const [bestLevel, setBestLevel] = React.useState(0);

//   const timerRef = React.useRef<number | null>(null);

//   const clearTimer = React.useCallback(() => {
//     if (timerRef.current !== null) {
//       window.clearTimeout(timerRef.current);
//       timerRef.current = null;
//     }
//   }, []);

//   React.useEffect(() => {
//     return () => clearTimer();
//   }, [clearTimer]);

//   const memorizeDuration = React.useCallback((count: number) => {
//     return Math.max(MIN_MEMORIZE_MS, MEMORIZE_MS - (count - START_COUNT) * 45);
//   }, []);

//   const startRound = React.useCallback(
//     (nextLevel = level) => {
//       clearTimer();

//       const count = Math.min(MAX_COUNT, START_COUNT + nextLevel - 1);
//       const nextBoard = createBoard(count);

//       setLevel(nextLevel);
//       setBoardCount(count);
//       setBoard(nextBoard);
//       setExpected(1);
//       setRevealed([]);
//       setPhase("memorize");

//       timerRef.current = window.setTimeout(() => {
//         setPhase("input");
//       }, memorizeDuration(count));
//     },
//     [clearTimer, level, memorizeDuration],
//   );

//   const handleStart = React.useCallback(() => {
//     startRound(1);
//   }, [startRound]);

//   const handleCellClick = React.useCallback(
//     (position: number) => {
//       if (phase !== "input") {
//         return;
//       }

//       const targetCell = board.find((entry) => entry.number === expected);
//       if (!targetCell || targetCell.position !== position) {
//         setPhase("fail");
//         setBestLevel((current) => Math.max(current, level));
//         return;
//       }

//       const nextExpected = expected + 1;
//       setRevealed((current) => [...current, position]);

//       if (nextExpected > board.length) {
//         setPhase("success");
//         setBestLevel((current) => Math.max(current, level));

//         timerRef.current = window.setTimeout(() => {
//           startRound(level + 1);
//         }, 650);
//         return;
//       }

//       setExpected(nextExpected);
//     },
//     [board, expected, level, phase, startRound],
//   );

//   const handleReset = React.useCallback(() => {
//     clearTimer();
//     setLevel(1);
//     setPhase("idle");
//     setBoard([]);
//     setBoardCount(START_COUNT);
//     setExpected(1);
//     setRevealed([]);
//   }, [clearTimer]);

//   const gridSize = Math.ceil(Math.sqrt(boardCount));

//   const cellByPosition = React.useMemo(() => {
//     const map = new Map<number, { number: number; position: number }>();
//     board.forEach((entry) => {
//       map.set(entry.position, entry);
//     });
//     return map;
//   }, [board]);

//   const phaseLabel =
//     phase === "memorize"
//       ? "memorize"
//       : phase === "input"
//         ? `click ${expected}`
//         : phase === "success"
//           ? "good"
//           : phase === "fail"
//             ? "wrong"
//             : "";

//   return (
//     <>
//       <GameStats levelValue={level} bestValue={bestLevel || "—"} />

//       <GamePanel className="min-h-[300px]">
//         {phase === "idle" && (
//           <div className="flex flex-col items-center gap-6 py-4 text-center">
//             <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
//               numbers will disappear
//             </p>
//             <button type="button" onClick={handleStart} className={gameButtonPrimary}>
//               start
//             </button>
//           </div>
//         )}

//         {phase !== "idle" && (
//           <div className="flex w-full flex-col items-center gap-4">
//             <div className="flex w-full items-center justify-between px-1">
//               <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{phaseLabel}</span>
//               <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{boardCount} cells</span>
//             </div>
//             <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
//               {Array.from({ length: gridSize * gridSize }).map((_, position) => {
//                 const entry = cellByPosition.get(position);
//                 const isActive = phase === "memorize" && Boolean(entry);
//                 const isRevealed = revealed.includes(position) || (phase === "memorize" && Boolean(entry));
//                 const cellNumber = entry?.number;
//                 return (
//                   <button
//                     key={position}
//                     type="button"
//                     onClick={() => handleCellClick(position)}
//                     disabled={phase !== "input"}
//                     className={[
//                       "flex aspect-square items-center justify-center border border-[#2e2e2e] bg-[#181818] transition-colors duration-150",
//                       phase === "input" ? "active:border-[rgba(222,247,103,0.5)] active:bg-[#171717]" : "cursor-default",
//                       isRevealed ? "text-white" : "text-[#5b5b5b]",
//                       isActive ? "bg-[#171717]" : "",
//                     ].join(" ")}
//                     aria-label={`chimp-cell-${position}`}
//                   >
//                     <span className="font-sans text-xl tabular-nums uppercase tracking-[0.04em] sm:text-2xl">
//                       {isRevealed && cellNumber ? cellNumber : ""}
//                     </span>
//                   </button>
//                 );
//               })}
//             </div>
//           </div>
//         )}
//       </GamePanel>

//       <div className="mt-4 flex items-center justify-center gap-3">
//         {phase !== "idle" && (
//           <button type="button" onClick={handleReset} className={gameButtonSecondary}>
//             {phase === "fail" ? "try again" : "reset"}
//           </button>
//         )}
//       </div>
//     </>
//   );
// }

// export default function ChimpPage() {
//   return (
//     <GameShell
//       meta="UXATHON / GAMES / CHIMP"
//       title="Chimp Test"
//       description="Memorize the numbered tiles, then click them in ascending order."
//     >
//       <ChimpGame />
//     </GameShell>
//   );
// }






"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMultiplayer } from "@/lib/multiplayer/useMultiplayer";
import { GamePanel, GameShell, GameStats, gameButtonPrimary, gameButtonSecondary } from "../_components/GameShell";

type Phase = "idle" | "memorize" | "input" | "success" | "fail" | "terminated";

const START_COUNT = 4;
const MAX_COUNT = 25;
const MEMORIZE_MS = 1400;
const MIN_MEMORIZE_MS = 650;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createBoard(count: number) {
  const positions = shuffle(Array.from({ length: count }, (_, index) => index));
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    position: positions[index],
  }));
}

function ChimpPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode"); // "singleplayer"

  // Load state tracking values using custom hook
  const { userId, room, gameState, updateGameState, activeRoomCode } = useMultiplayer();

  const isMultiplayer = mode !== "singleplayer" && !!activeRoomCode;

  // Internal Game Engine Mechanics
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [board, setBoard] = useState<Array<{ number: number; position: number }>>([]);
  const [boardCount, setBoardCount] = useState(START_COUNT);
  const [expected, setExpected] = useState(1);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [bestLevel, setBestLevel] = useState(0);
  
  // Real-time synchronization log
  const [terminalScore, setTerminalScore] = useState<number | null>(null);

  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const memorizeDuration = React.useCallback((count: number) => {
    return Math.max(MIN_MEMORIZE_MS, MEMORIZE_MS - (count - START_COUNT) * 45);
  }, []);

  const startRound = React.useCallback((nextLevel = level) => {
    clearTimer();
    const count = Math.min(MAX_COUNT, START_COUNT + nextLevel - 1);
    const nextBoard = createBoard(count);

    setLevel(nextLevel);
    setBoardCount(count);
    setBoard(nextBoard);
    setExpected(1);
    setRevealed([]);
    setPhase("memorize");

    timerRef.current = window.setTimeout(() => {
      setPhase("input");
    }, memorizeDuration(count));
  }, [clearTimer, level, memorizeDuration]);

  const handleCellClick = React.useCallback(async (position: number) => {
    if (phase !== "input") return;

    const targetCell = board.find((entry) => entry.number === expected);
    if (!targetCell || targetCell.position !== position) {
      // TRIGGER GAME OVER
      setPhase("terminated");
      const finalScore = level * 100;
      setTerminalScore(finalScore);
      setBestLevel((current) => Math.max(current, level));

      if (isMultiplayer && userId && room) {
        // Broadcast the final score payload back to your database pipeline
        const currentScores = gameState?.scores ? { ...gameState.scores } : {};
        const currentLevels = gameState?.levels ? { ...gameState.levels } : {};
        const currentLogs = gameState?.logs ? [...gameState.logs] : [];

        currentScores[userId] = finalScore;
        currentLevels[userId] = level;
        currentLogs.unshift(`Node ${userId.slice(0,8)} disconnected at Level ${level} (${finalScore} PTS).`);

        await updateGameState({
          scores: currentScores,
          levels: currentLevels,
          logs: currentLogs
        });
      }
      return;
    }

    const nextExpected = expected + 1;
    setRevealed((current) => [...current, position]);

    if (nextExpected > board.length) {
      setPhase("success");
      setBestLevel((current) => Math.max(current, level));

      timerRef.current = window.setTimeout(() => {
        startRound(level + 1);
      }, 650);
      return;
    }
    setExpected(nextExpected);
  }, [board, expected, level, phase, startRound, isMultiplayer, userId, room, gameState, updateGameState]);

  const handleReset = () => {
    clearTimer();
    setLevel(1);
    setPhase("idle");
    setBoard([]);
    setBoardCount(START_COUNT);
    setExpected(1);
    setRevealed([]);
    setTerminalScore(null);
  };

  const gridSize = Math.ceil(Math.sqrt(boardCount));
  const cellByPosition = React.useMemo(() => {
    const map = new Map<number, { number: number; position: number }>();
    board.forEach((entry) => map.set(entry.position, entry));
    return map;
  }, [board]);

  return (
    <GameShell
      meta={`UXATHON / ENVIRONMENT / CHIMP / [${isMultiplayer ? "MULTIPLAYER" : "SINGLEPLAYER"}]`}
      title="Chimp Matrix Test"
      description="Click numeric items sequentially following matrix fadeout."
    >
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[300px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Local node isolation protocol ready
            </p>
            <button type="button" onClick={() => startRound(1)} className={gameButtonPrimary}>
              Start Stream Run
            </button>
          </div>
        )}

        {phase === "terminated" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-pulse">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">[ RUN TERMINATED ]</p>
            <h3 className="font-sans text-3xl text-white font-bold">{terminalScore} PTS</h3>
            <p className="text-xs text-[#929292] max-w-[28ch]">
              {isMultiplayer ? "Telemetry frame automatically synchronized to network matrix records." : "Isolated sandbox execution. Only this latest score was computed."}
            </p>
            <button type="button" onClick={handleReset} className={gameButtonPrimary}>Re-Initialize Module</button>
          </div>
        )}

        {phase !== "idle" && phase !== "terminated" && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {Array.from({ length: gridSize * gridSize }).map((_, position) => {
                const entry = cellByPosition.get(position);
                const isRevealed = revealed.includes(position) || phase === "memorize";
                return (
                  <button
                    key={position}
                    type="button"
                    disabled={phase !== "input"}
                    onClick={() => handleCellClick(position)}
                    className="flex aspect-square items-center justify-center border border-[#2e2e2e] bg-[#181818] font-sans text-xl"
                  >
                    {isRevealed && entry ? entry.number : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GamePanel>
    </GameShell>
  );
}




export default function ChimpPage() {
  return (
    <Suspense fallback={null}>
      <ChimpPageInner />
    </Suspense>
  );
}
