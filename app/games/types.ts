export type ScoringStrategy = 'lowest' | 'highest' | 'accumulated';

export interface GameScoring {
  strategy: ScoringStrategy;
  unit: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'strategy' | 'cognitive' | 'reflex' | 'design' | 'accessibility';
  scoring: GameScoring;
  realtime: boolean;
  leaderboard: boolean;
  rounds: number;
  component: React.ComponentType<Record<string, never>>;
}

export type GameLifecycleStatus = 'idle' | 'ready' | 'playing' | 'paused' | 'completed' | 'reviewing';

export interface GameState {
  status: GameLifecycleStatus;
  currentRound: number;
  totalRounds: number;
  score: number;
  startTime?: number;
  endTime?: number;
}
