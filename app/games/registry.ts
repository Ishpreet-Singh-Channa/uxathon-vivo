import { GameDefinition } from "./types";

// 1. Import all your game configurations directly
import { chimpConfig } from "./chimp/config";
import { numberMemoryConfig } from "./number-memory/config";
import { reactionTimeConfig } from "./reaction-time/config";
import { sequenceMemoryConfig } from "./sequence-memory/config";

const gameRegistry = new Map<string, GameDefinition>();
const coreGames = [
  chimpConfig,
  numberMemoryConfig,
  reactionTimeConfig,
  sequenceMemoryConfig,
];

coreGames.forEach((config) => {
  gameRegistry.set(config.id, config);
});

export function getGame(id: string): GameDefinition | undefined {
  return gameRegistry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameRegistry.values());
}
