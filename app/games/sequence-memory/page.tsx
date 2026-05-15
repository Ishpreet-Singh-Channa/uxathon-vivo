"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

const GRID_SIZE = 3;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BASE_INTERVAL = 700;
const MIN_INTERVAL = 300;

type Mode = "idle" | "showing" | "input" | "success" | "fail";

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function SequenceMemoryGame() {
  const [level, setLevel] = React.useState(1);
  const [mode, setMode] = React.useState<Mode>("idle");
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [highlightIndex, setHighlightIndex] = React.useState<number | null>(null);
  const [bestLevel, setBestLevel] = React.useState(0);

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

  const beginRound = React.useCallback(
    (startLevel = level) => {
      clearTimers();
      const lvl = startLevel;
      const seq = generateSequence(lvl);
      setSequence(seq);
      setProgress(0);
      setMode("showing");

      const interval = intervalForLevel(lvl);
      seq.forEach((cell, idx) => {
        const show = window.setTimeout(() => {
          setHighlightIndex(cell);
        }, idx * (interval + 220));

        const hide = window.setTimeout(() => {
          setHighlightIndex(null);
          if (idx === seq.length - 1) {
            setMode("input");
          }
        }, idx * (interval + 220) + interval);

        timersRef.current.push(show, hide);
      });
    },
    [clearTimers, generateSequence, intervalForLevel, level],
  );

  const handleCellClick = React.useCallback(
    (index: number) => {
      if (mode !== "input") return;
      const expected = sequence[progress];
      if (index === expected) {
        const nextProg = progress + 1;
        setProgress(nextProg);
        if (nextProg >= sequence.length) {
          setMode("success");
          setBestLevel((b) => Math.max(b, level));
          const t = window.setTimeout(() => {
            setLevel((l) => l + 1);
            beginRound(level + 1);
          }, 700);
          timersRef.current.push(t);
        }
      } else {
        setMode("fail");
        setBestLevel((b) => Math.max(b, level));
      }
    },
    [mode, sequence, progress, level, beginRound],
  );

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
    const base =
      "flex h-20 w-20 items-center justify-center border border-[#2e2e2e] bg-[#181818] text-[#5b5b5b] select-none sm:h-24 sm:w-24";
    if (highlightIndex === idx) {
      return `${base} border-[rgba(222,247,103,0.5)] bg-[#DEF767] text-[#171717]`;
    }
    return base;
  };

  const statusText =
    mode === "showing"
      ? "watch the pattern"
      : mode === "input"
        ? "your turn"
        : mode === "success"
          ? "good — next level"
          : mode === "fail"
            ? "wrong"
            : "";

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel>
        {mode === "idle" ? (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">reproduce the pattern</p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{statusText}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: CELL_COUNT }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCellClick(idx)}
                  className={cellClass(idx)}
                  aria-label={`cell-${idx}`}
                />
              ))}
            </div>
          </div>
        )}
      </GamePanel>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {mode === "fail" && (
          <button type="button" onClick={() => beginRound(level)} className={gameButtonPrimary}>
            retry
          </button>
        )}
        {mode !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        )}
      </div>
    </>
  );
}

export default function SequenceMemoryPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / SEQUENCE"
      title="Sequence Memory"
      description="Reproduce the pattern. Difficulty increases each level."
    >
      <SequenceMemoryGame />
    </GameShell>
  );
}
