import { lazy } from "react";

export const reactionTimeConfig = {
  id: "reaction-time",
  name: "Reaction Time",
  description: "Click when the signal turns live. Lower milliseconds wins.",
  category: "reflex" as const,
  scoring: { strategy: "lowest" as const, unit: "ms" },
  realtime: false,
  leaderboard: true,
  rounds: 5,
  component: lazy(() => import("./page")),
};
