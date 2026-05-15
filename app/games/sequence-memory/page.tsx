"use client";

import React from "react";

const GRID_SIZE = 3;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BASE_INTERVAL = 700; // ms
const MIN_INTERVAL = 300; // ms

type Mode = "idle" | "showing" | "input" | "success" | "fail";

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

const SequenceMemoryGame: React.FC = () => {
  const [level, setLevel] = React.useState(1);
  const [mode, setMode] = React.useState<Mode>("idle");
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [progress, setProgress] = React.useState<number>(0);
  const [highlightIndex, setHighlightIndex] = React.useState<number | null>(null);
  const [bestLevel, setBestLevel] = React.useState<number>(0);

  const timersRef = React.useRef<number[]>([]);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const intervalForLevel = React.useCallback((lvl: number) => {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - (lvl - 1) * 60);
  }, []);

  const generateSequence = React.useCallback((lvl: number) => {
    const seq: number[] = [];
    for (let i = 0; i < lvl; i++) seq.push(randInt(CELL_COUNT));
    return seq;
  }, []);

  const beginRound = React.useCallback((startLevel = level) => {
    clearTimers();
    const lvl = startLevel;
    const seq = generateSequence(lvl);
    setSequence(seq);
    setProgress(0);
    setMode("showing");

    const interval = intervalForLevel(lvl);
    // show sequence
    seq.forEach((cell, idx) => {
      const show = window.setTimeout(() => {
        setHighlightIndex(cell);
      }, idx * (interval + 220));

      const hide = window.setTimeout(() => {
        setHighlightIndex(null);
        if (idx === seq.length - 1) {
          // finished showing
          setMode("input");
        }
      }, idx * (interval + 220) + interval);

      timersRef.current.push(show, hide);
    });
  }, [clearTimers, generateSequence, intervalForLevel, level]);

  const handleCellClick = React.useCallback((index: number) => {
    if (mode !== "input") return;
    const expected = sequence[progress];
    if (index === expected) {
      const nextProg = progress + 1;
      setProgress(nextProg);
      if (nextProg >= sequence.length) {
        // success
        setMode("success");
        setBestLevel((b) => Math.max(b, level));
        // auto progress to next level after short delay
        const t = window.setTimeout(() => {
          setLevel((l) => l + 1);
          beginRound(level + 1);
        }, 700);
        timersRef.current.push(t);
      }
    } else {
      // fail
      setMode("fail");
      setBestLevel((b) => Math.max(b, level));
    }
  }, [mode, sequence, progress, level, beginRound]);

  const handleStart = React.useCallback(() => {
    setLevel(1);
    setBestLevel((b) => Math.max(b, 1));
    beginRound(1);
  }, [beginRound]);

  const handleReset = React.useCallback(() => {
    clearTimers();
    setMode("idle");
    setSequence([]);
    setProgress(0);
    setHighlightIndex(null);
  }, [clearTimers]);

  const cellClass = (idx: number) => {
    const base = "flex items-center justify-center h-20 sm:h-28 w-20 sm:w-28 border border-uxism-border bg-uxism-base-bg text-uxism-muted select-none";
    if (highlightIndex === idx) return base + " bg-uxism-lime/80 text-uxism-deep-bg border-uxism-lime";
    return base;
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full gap-4">
      <div className="flex-1 flex flex-col items-center justify-start gap-6 px-6 py-6 text-center">
        <div className="flex items-center gap-6 w-full max-w-2xl justify-between">
          <div className="text-left">
            <div className="font-display text-2xl tracking-[0.18em]">Sequence Memory</div>
            <div className="font-mono text-[12px] text-uxism-muted mt-1">Reproduce the pattern. Difficulty increases each level.</div>
          </div>

          <div className="flex items-end gap-4">
            <div className="font-mono text-[12px] text-uxism-muted">level</div>
            <div className="font-display text-3xl tabular-nums">{level}</div>
            <div className="ml-4 font-mono text-[12px] text-uxism-muted">best</div>
            <div className="font-display text-2xl tabular-nums">{bestLevel}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: CELL_COUNT }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                className={cellClass(idx)}
                aria-label={`cell-${idx}`}
              >
                {/* minimalist indicator */}
                <span className="font-display text-lg">{""}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {mode === "idle" && (
            <button
              onClick={handleStart}
              className="px-6 py-3 bg-uxism-primary text-uxism-base-bg font-mono text-[12px] uppercase tracking-[0.3em] hover:bg-uxism-lime transition-colors"
            >
              start
            </button>
          )}

          {mode === "showing" && <div className="font-mono text-[12px] text-uxism-muted">watch the pattern</div>}

          {mode === "input" && <div className="font-mono text-[12px] text-uxism-muted">your turn</div>}

          {mode === "success" && <div className="font-mono text-[12px] text-uxism-lime">good — next level</div>}

          {mode === "fail" && (
            <div className="flex items-center gap-3">
              <div className="font-display text-xl text-uxism-deep-bg">wrong</div>
              <button
                onClick={() => beginRound(level)}
                className="px-4 py-2 border border-uxism-border font-mono text-[11px] uppercase tracking-[0.3em] hover:bg-uxism-deep-bg hover:text-uxism-base-bg transition-colors"
              >
                retry
              </button>
            </div>
          )}

          <button
            onClick={handleReset}
            className="ml-2 px-4 py-2 border border-uxism-border font-mono text-[11px] uppercase tracking-[0.3em] hover:bg-uxism-deep-bg hover:text-uxism-base-bg transition-colors"
          >
            reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default SequenceMemoryGame;
