import { lazy } from "react";
import { registerGame } from "../registry";

export const biddingConfig = {
  id: "bidding",
  name: "Bidding",
  description: "Strategic bidding mode. Coming soon.",
  category: "strategy" as const,
  scoring: { strategy: "highest" as const, unit: "points" },
  realtime: true,
  leaderboard: true,
  rounds: 1,
  component: lazy(() => import("./page")),
};

export function initBidding() {
  registerGame(biddingConfig);
}
