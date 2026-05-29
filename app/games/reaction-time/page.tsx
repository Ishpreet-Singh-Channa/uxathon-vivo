"use client";

import React from "react";
import { GameShell, GameStats, gameButtonPrimary, gameButtonSecondary } from "../_components/GameShell";

type Phase = "idle" | "waiting" | "ready" | "false_start" | "round_result" | "complete";

const ROUNDS = 5;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 4000;

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
}

function averageMs(times: number[]) {
  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
}

function ReactionTimeGame() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [attempt, setAttempt] = React.useState(0);
  const [times, setTimes] = React.useState<number[]>([]);
  const [lastMs, setLastMs] = React.useState<number | null>(null);
  const [bestAverage, setBestAverage] = React.useState<number | null>(null);

  const readyAtRef = React.useRef<number>(0);
  const delayTimerRef = React.useRef<number | null>(null);

  const clearDelayTimer = React.useCallback(() => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearDelayTimer();
  }, [clearDelayTimer]);

  const beginWaiting = React.useCallback(() => {
    clearDelayTimer();
    setPhase("waiting");

    delayTimerRef.current = window.setTimeout(() => {
      readyAtRef.current = performance.now();
      setPhase("ready");
      delayTimerRef.current = null;
    }, randomDelay());
  }, [clearDelayTimer]);

  const handleStart = React.useCallback(() => {
    setAttempt(1);
    setTimes([]);
    setLastMs(null);
    beginWaiting();
  }, [beginWaiting]);

  const handleReset = React.useCallback(() => {
    clearDelayTimer();
    setPhase("idle");
    setAttempt(0);
    setTimes([]);
    setLastMs(null);
  }, [clearDelayTimer]);

  const handlePanelClick = React.useCallback(() => {
    if (phase === "idle") {
      handleStart();
      return;
    }

    if (phase === "waiting") {
      clearDelayTimer();
      setPhase("false_start");
      return;
    }

    if (phase === "ready") {
      const ms = Math.round(performance.now() - readyAtRef.current);
      setLastMs(ms);
      setTimes((current) => [...current, ms]);
      setPhase("round_result");
      return;
    }

    if (phase === "false_start") {
      beginWaiting();
      return;
    }

    if (phase === "round_result") {
      if (attempt >= ROUNDS) {
        setTimes((current) => {
          const avg = averageMs(current);
          setBestAverage((best) => (best === null ? avg : Math.min(best, avg)));
          return current;
        });
        setPhase("complete");
        return;
      }

      setAttempt((value) => value + 1);
      beginWaiting();
      return;
    }

    if (phase === "complete") {
      handleStart();
    }
  }, [attempt, beginWaiting, clearDelayTimer, handleStart, phase]);

  const currentAverage = averageMs(times);

  const panelLabel = (() => {
    switch (phase) {
      case "idle":
        return { kicker: "signal / idle", title: "Click to begin", hint: `${ROUNDS} attempts — wait for live` };
      case "waiting":
        return { kicker: "signal / hold", title: "Wait for live", hint: "do not click yet" };
      case "ready":
        return { kicker: "signal / live", title: "Click now", hint: "capture your reaction" };
      case "false_start":
        return { kicker: "signal / fault", title: "Too soon", hint: "click to retry this attempt" };
      case "round_result":
        return {
          kicker: `attempt / ${attempt} of ${ROUNDS}`,
          title: lastMs !== null ? `${lastMs} ms` : "—",
          hint: attempt >= ROUNDS ? "click for average" : "click for next signal",
        };
      case "complete":
        return {
          kicker: "session / complete",
          title: `${currentAverage} ms`,
          hint: "average reaction — click to run again",
        };
      default:
        return { kicker: "", title: "", hint: "" };
    }
  })();

  const panelTone =
    phase === "ready"
      ? "border-[rgba(222,247,103,0.5)] bg-[#171717]"
      : phase === "waiting"
        ? "border-[#ff6a6a] bg-[#171717]"
        : phase === "false_start"
          ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]"
          : "border-[#2e2e2e] bg-[#181818]";

  const titleTone =
    phase === "false_start"
      ? "text-[#171717]"
      : phase === "ready"
        ? "text-[#DEF767]"
        : phase === "waiting"
          ? "text-[#ff6a6a]"
          : "text-white";

  const metaTone = phase === "false_start" ? "text-[#171717]/70" : "text-[#5b5b5b]";
  const hintTone = phase === "false_start" ? "text-[#171717]/80" : "text-[#929292]";

  return (
    <>
      <GameStats
        levelLabel="attempt"
        levelValue={phase === "idle" || phase === "complete" ? "—" : `${Math.min(attempt, ROUNDS)}/${ROUNDS}`}
        bestLabel="best avg"
        bestValue={bestAverage !== null ? `${bestAverage} ms` : "—"}
      />

      <button
        type="button"
        onClick={handlePanelClick}
        aria-label={panelLabel.title}
        className={`flex min-h-[min(48vh,380px)] w-full flex-col items-center justify-center gap-4 border px-6 py-10 text-center transition-colors ${panelTone} cursor-pointer active:border-[rgba(222,247,103,0.5)]`}
      >
        <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${metaTone}`}>{panelLabel.kicker}</p>
        <p className={`font-sans text-5xl uppercase leading-[0.95] tracking-[0.02em] sm:text-6xl ${titleTone}`}>
          {panelLabel.title}
        </p>
        <p className={`max-w-[28ch] text-[13px] leading-6 ${hintTone}`}>{panelLabel.hint}</p>
      </button>

      {times.length > 0 && phase !== "idle" && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {times.map((ms, index) => (
            <span
              key={`${index}-${ms}`}
              className="border border-[#2e2e2e] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]"
            >
              {index + 1}: {ms} ms
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {phase === "idle" && (
          <button type="button" onClick={handleStart} className={gameButtonPrimary}>
            start
          </button>
        )}
        {phase !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        )}
      </div>
    </>
  );
}

export default function ReactionTimePage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / REACTION"
      title="Reaction Time"
      description="Wait for the live signal, then click as fast as you can."
    >
      <ReactionTimeGame />
    </GameShell>
  );
}
