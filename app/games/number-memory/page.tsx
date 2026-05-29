"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

type Phase = "idle" | "showing" | "input" | "success" | "fail";

const BASE_SHOW_MS = 1400;
const MIN_SHOW_MS = 700;

function makeNumber(length: number) {
  const firstDigit = String(Math.floor(Math.random() * 9) + 1);
  let result = firstDigit;

  for (let index = 1; index < length; index += 1) {
    result += String(Math.floor(Math.random() * 10));
  }

  return result;
}

function NumberMemoryGame() {
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [target, setTarget] = React.useState("");
  const [visibleNumber, setVisibleNumber] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [bestLevel, setBestLevel] = React.useState(0);

  const timersRef = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  React.useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [phase]);

  const showDurationForLevel = React.useCallback((currentLevel: number) => {
    return Math.max(MIN_SHOW_MS, BASE_SHOW_MS - (currentLevel - 1) * 65);
  }, []);

  const startRound = React.useCallback(
    (nextLevel = level) => {
      clearTimers();

      const nextTarget = makeNumber(nextLevel);
      setLevel(nextLevel);
      setTarget(nextTarget);
      setVisibleNumber(nextTarget);
      setInputValue("");
      setPhase("showing");

      const hideTimer = window.setTimeout(() => {
        setVisibleNumber("");
        setPhase("input");
      }, showDurationForLevel(nextLevel));

      timersRef.current.push(hideTimer);
    },
    [clearTimers, level, showDurationForLevel],
  );

  const handleStart = React.useCallback(() => {
    startRound(1);
  }, [startRound]);

  const handleSubmit = React.useCallback(() => {
    if (phase !== "input") {
      return;
    }

    if (inputValue.trim() === target) {
      setBestLevel((current) => Math.max(current, level));
      setPhase("success");

      const nextLevelTimer = window.setTimeout(() => {
        startRound(level + 1);
      }, 700);

      timersRef.current.push(nextLevelTimer);
      return;
    }

    setBestLevel((current) => Math.max(current, level - 1));
    setPhase("fail");
  }, [inputValue, level, phase, startRound, target]);

  const handleRetry = React.useCallback(() => {
    startRound(level);
  }, [level, startRound]);

  const handleReset = React.useCallback(() => {
    clearTimers();
    setLevel(1);
    setTarget("");
    setVisibleNumber("");
    setInputValue("");
    setPhase("idle");
  }, [clearTimers]);

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[260px] flex flex-col items-center justify-center text-center">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">one number at a time</p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        )}

        {phase === "showing" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">memorize</p>
            <p className="font-sans text-5xl tabular-nums uppercase tracking-[0.04em] text-white sm:text-6xl">
              {visibleNumber}
            </p>
          </div>
        )}

        {phase === "input" && (
          <div className="flex w-full max-w-md flex-col items-center gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">enter the number</p>
            <form
              className="flex w-full flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full border border-[#2e2e2e] bg-transparent px-4 py-4 text-center font-sans text-4xl tabular-nums uppercase tracking-[0.04em] text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]"
                placeholder=""
                aria-label="Enter remembered number"
              />
              <button type="submit" className={gameButtonSecondary}>
                submit
              </button>
            </form>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-sans text-4xl uppercase tracking-[0.04em] text-[#DEF767]">correct</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">next number incoming</p>
          </div>
        )}

        {phase === "fail" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-sans text-4xl uppercase tracking-[0.04em] text-[#ff6a6a]">wrong</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">answer was {target}</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleRetry} className={gameButtonPrimary}>
                retry
              </button>
              <button type="button" onClick={handleReset} className={gameButtonSecondary}>
                reset
              </button>
            </div>
          </div>
        )}
      </GamePanel>

      {phase !== "idle" && phase !== "fail" && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        </div>
      )}
    </>
  );
}

export default function NumberMemoryPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / NUMBER"
      title="Number Memory"
      description="Remember the number before it disappears."
    >
      <NumberMemoryGame />
    </GameShell>
  );
}
