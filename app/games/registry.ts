import { GameDefinition } from "./types";

// 1. Import all your game configurations directly
import { chimpConfig } from "./chimp/config";
import { numberMemoryConfig } from "./number-memory/config";
import { reactionTimeConfig } from "./reaction-time/config";
import { sequenceMemoryConfig } from "./sequence-memory/config";
import { personaFlowConfig } from "./persona-flow/config";


const gameRegistry = new Map<string, GameDefinition>();
// 2. Auto-register them into the Map immediately
const coreGames = [
  chimpConfig,
  numberMemoryConfig,
  reactionTimeConfig,
  sequenceMemoryConfig,
  personaFlowConfig
];

coreGames.forEach((config) => {
  gameRegistry.set(config.id, config);
});

// Keep the dynamic register function just in case you need it later
export function registerGame(definition: GameDefinition): void {
  gameRegistry.set(definition.id, definition);
}

export function getGame(id: string): GameDefinition | undefined {
  return gameRegistry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameRegistry.values());
}
