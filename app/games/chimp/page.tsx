"use client";

import React from "react";

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

const ChimpGame: React.FC = () => {
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

  const handleStart = React.useCallback(() => {
    startRound(1);
  }, [startRound]);

  const handleCellClick = React.useCallback((position: number) => {
    if (phase !== "input") {
      return;
    }

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
  }, [board, expected, level, phase, startRound]);

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
    board.forEach((entry) => {
      map.set(entry.position, entry);
    });
    return map;
  }, [board]);

  return (
    <div className="flex-1 flex flex-col w-full h-full gap-4">
      <div className="flex flex-1 flex-col items-center justify-start gap-6 px-6 py-6 text-center">
        <div className="flex w-full max-w-3xl items-center justify-between gap-6">
          <div className="text-left">
            <div className="font-display text-2xl tracking-[0.18em]">Chimp Test</div>
            <div className="mt-1 font-mono text-[12px] text-uxism-muted">Memorize the numbers, then click them in order.</div>
          </div>

          <div className="flex items-end gap-4">
            <div className="font-mono text-[12px] text-uxism-muted">level</div>
            <div className="font-display text-3xl tabular-nums">{level}</div>
            <div className="ml-4 font-mono text-[12px] text-uxism-muted">best</div>
            <div className="font-display text-2xl tabular-nums">{bestLevel}</div>
          </div>
        </div>

        <div className="mt-4 flex min-h-[320px] w-full max-w-3xl flex-col items-center justify-center border border-uxism-border bg-uxism-base-bg px-5 py-6">
          {phase === "idle" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">numbers will disappear</div>
              <button
                type="button"
                onClick={handleStart}
                className="px-6 py-3 bg-uxism-primary text-uxism-base-bg font-mono text-[12px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-lime"
              >
                start
              </button>
            </div>
          )}

          {phase !== "idle" && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="flex w-full items-center justify-between px-1">
                <span className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">
                  {phase === "memorize" ? "memorize" : phase === "input" ? `click ${expected}` : phase === "success" ? "good" : "wrong"}
                </span>
                <span className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">{boardCount} cells</span>
              </div>

              <div
                className="grid w-full gap-2 sm:gap-3"
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, position) => {
                  const entry = cellByPosition.get(position);
                  const isActive = phase === "memorize" && Boolean(entry);
                  const isRevealed = revealed.includes(position) || (phase === "memorize" && Boolean(entry));
                  const cellNumber = entry?.number;

                  return (
                    <button
                      key={position}
                      type="button"
                      onClick={() => handleCellClick(position)}
                      disabled={phase !== "input"}
                      className={[
                        "aspect-square border border-uxism-border bg-uxism-base-bg transition-colors duration-150",
                        "flex items-center justify-center",
                        phase === "input" ? "hover:border-uxism-lime hover:bg-uxism-deep-bg" : "cursor-default",
                        isRevealed ? "text-uxism-primary" : "text-uxism-muted",
                        isActive ? "bg-uxism-deep-bg" : "",
                      ].join(" ")}
                      aria-label={`chimp-cell-${position}`}
                    >
                      <span className="font-display text-2xl sm:text-3xl tabular-nums tracking-[0.08em]">
                        {isRevealed && cellNumber ? cellNumber : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {phase !== "idle" && phase !== "fail" && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-uxism-border font-mono text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-deep-bg hover:text-uxism-base-bg"
            >
              reset
            </button>
          )}

          {phase === "fail" && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-uxism-border font-mono text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-deep-bg hover:text-uxism-base-bg"
            >
              try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChimpGame;
