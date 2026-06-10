import { lazy } from "react";

export const chimpConfig = {
  id: "chimp",
  name: "Chimp Test",
  description: "Memorize the numbered tiles and click them in ascending order.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};
