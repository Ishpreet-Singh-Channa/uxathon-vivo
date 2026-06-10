"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

type Phase = "idle" | "memorize" | "input" | "success" | "fail";

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

function ChimpGame() {
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [board, setBoard] = React.useState<Array<{ number: number; position: number }>>([]);
  const [boardCount, setBoardCount] = React.useState(START_COUNT);
  const [expected, setExpected] = React.useState(1);
  const [revealed, setRevealed] = React.useState<number[]>([]);
  const [bestLevel, setBestLevel] = React.useState(0);

  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const memorizeDuration = React.useCallback((count: number) => {
    return Math.max(MIN_MEMORIZE_MS, MEMORIZE_MS - (count - START_COUNT) * 45);
  }, []);

  const startRound = React.useCallback(
    (nextLevel = level) => {
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
    },
    [clearTimer, level, memorizeDuration],
  );

  const handleCellClick = React.useCallback(
    (position: number) => {
      if (phase !== "input") return;

      const targetCell = board.find((entry) => entry.number === expected);
      if (!targetCell || targetCell.position !== position) {
        setPhase("fail");
        setBestLevel((current) => Math.max(current, level));
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
    },
    [board, expected, level, phase, startRound],
  );

  const handleReset = React.useCallback(() => {
    clearTimer();
    setLevel(1);
    setPhase("idle");
    setBoard([]);
    setBoardCount(START_COUNT);
    setExpected(1);
    setRevealed([]);
  }, [clearTimer]);

  const gridSize = Math.ceil(Math.sqrt(boardCount));
  const cellByPosition = React.useMemo(() => {
    const map = new Map<number, { number: number; position: number }>();
    board.forEach((entry) => map.set(entry.position, entry));
    return map;
  }, [board]);

  const phaseLabel =
    phase === "memorize"
      ? "memorize"
      : phase === "input"
        ? `click ${expected}`
        : phase === "success"
          ? "good"
          : phase === "fail"
            ? "wrong"
            : "";

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "-"} />

      <GamePanel className="min-h-[300px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Numbers disappear after a short delay.
            </p>
            <button type="button" onClick={() => startRound(1)} className={gameButtonPrimary}>
              Start
            </button>
          </div>
        )}

        {phase !== "idle" && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex w-full items-center justify-between px-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                {phaseLabel}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                {boardCount} cells
              </span>
            </div>
            <div
              className="grid w-full gap-2"
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: gridSize * gridSize }).map((_, position) => {
                const entry = cellByPosition.get(position);
                const isRevealed = revealed.includes(position) || (phase === "memorize" && Boolean(entry));

                return (
                  <button
                    key={position}
                    type="button"
                    onClick={() => handleCellClick(position)}
                    disabled={phase !== "input"}
                    className="flex aspect-square items-center justify-center border border-[#2e2e2e] bg-[#181818] text-[#5b5b5b] active:border-[rgba(222,247,103,0.5)] disabled:cursor-default"
                    aria-label={`chimp-cell-${position}`}
                  >
                    <span className="font-sans text-xl tabular-nums uppercase tracking-[0.04em] text-white sm:text-2xl">
                      {isRevealed && entry ? entry.number : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GamePanel>

      <div className="mt-4 flex items-center justify-center gap-3">
        {phase !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            {phase === "fail" ? "try again" : "reset"}
          </button>
        )}
      </div>
    </>
  );
}

export default function ChimpPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / CHIMP"
      title="Chimp Test"
      description="Memorize the numbered tiles, then click them in ascending order."
    >
      <ChimpGame />
    </GameShell>
  );
}
