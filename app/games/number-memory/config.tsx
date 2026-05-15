import { lazy } from "react";
import { registerGame } from "../registry";

export const numberMemoryConfig = {
  id: "number-memory",
  name: "Number Memory",
  description: "Remember the longest number you can. Each level adds a digit.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initNumberMemory() {
  registerGame(numberMemoryConfig);
}
