"use client";

import React from "react";

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

const NumberMemoryGame: React.FC = () => {
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

  const startRound = React.useCallback((nextLevel = level) => {
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
  }, [clearTimers, level, showDurationForLevel]);

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
    <div className="flex-1 flex flex-col w-full h-full gap-4">
      <div className="flex flex-1 flex-col items-center justify-start gap-6 px-6 py-6 text-center">
        <div className="flex w-full max-w-2xl items-center justify-between gap-6">
          <div className="text-left">
            <div className="font-display text-2xl tracking-[0.18em]">Number Memory</div>
            <div className="mt-1 font-mono text-[12px] text-uxism-muted">Remember the number before it disappears.</div>
          </div>

          <div className="flex items-end gap-4">
            <div className="font-mono text-[12px] text-uxism-muted">level</div>
            <div className="font-display text-3xl tabular-nums">{level}</div>
            <div className="ml-4 font-mono text-[12px] text-uxism-muted">best</div>
            <div className="font-display text-2xl tabular-nums">{bestLevel}</div>
          </div>
        </div>

        <div className="mt-4 flex min-h-[260px] w-full max-w-2xl flex-col items-center justify-center border border-uxism-border bg-uxism-base-bg px-6 py-8 text-center">
          {phase === "idle" && (
            <div className="flex flex-col items-center gap-6">
              <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">one number at a time</div>
              <button
                type="button"
                onClick={handleStart}
                className="px-6 py-3 bg-uxism-primary text-uxism-base-bg font-mono text-[12px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-lime"
              >
                start
              </button>
            </div>
          )}

          {phase === "showing" && (
            <div className="flex flex-col items-center gap-5">
              <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">memorize</div>
              <div className="font-display text-6xl sm:text-7xl tabular-nums tracking-[0.08em] text-uxism-primary">{visibleNumber}</div>
            </div>
          )}

          {phase === "input" && (
            <div className="flex w-full max-w-md flex-col items-center gap-5">
              <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">enter the number</div>
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
                  className="w-full border border-uxism-border bg-transparent px-4 py-4 text-center font-display text-4xl tabular-nums tracking-[0.12em] text-uxism-primary outline-none placeholder:text-uxism-muted/40 focus:border-uxism-lime"
                  placeholder=""
                  aria-label="Enter remembered number"
                />
                <button
                  type="submit"
                  className="px-6 py-3 border border-uxism-border font-mono text-[12px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-deep-bg hover:text-uxism-base-bg"
                >
                  submit
                </button>
              </form>
            </div>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center gap-5">
              <div className="font-display text-4xl uppercase tracking-[0.2em] text-uxism-deep-bg">correct</div>
              <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">next number incoming</div>
            </div>
          )}

          {phase === "fail" && (
            <div className="flex flex-col items-center gap-5">
              <div className="font-display text-4xl uppercase tracking-[0.2em] text-uxism-deep-bg">wrong</div>
              <div className="font-mono text-[12px] uppercase tracking-[0.3em] text-uxism-muted">answer was {target}</div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-5 py-3 bg-uxism-primary text-uxism-base-bg font-mono text-[12px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-lime"
                >
                  retry
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-3 border border-uxism-border font-mono text-[12px] uppercase tracking-[0.3em] transition-colors hover:bg-uxism-deep-bg hover:text-uxism-base-bg"
                >
                  reset
                </button>
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
        </div>
      </div>
    </div>
  );
};

export default NumberMemoryGame;
