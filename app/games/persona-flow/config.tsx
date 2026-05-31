import { lazy } from "react";
import { registerGame } from "../registry";

export const personaFlowConfig = {
  id: "persona-flow",
  name: "Persona Flow",
  description: "Race to build the correct persona flow matrix before rival nodes.",
  category: "design" as const,
  scoring: { strategy: "highest" as const, unit: "claims" },
  realtime: true,
  leaderboard: true,
  rounds: 1,
  component: lazy(() => import("./page")),
};

export function initPersonaFlow() {
  registerGame(personaFlowConfig);
}
