import { lazy } from "react";
import { registerGame } from "../registry";

export const sequenceMemoryConfig = {
  id: "sequence-memory",
  name: "Sequence Memory",
  description: "Watch the pattern and reproduce it. Levels get progressively longer.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initSequenceMemory() {
  registerGame(sequenceMemoryConfig);
}
