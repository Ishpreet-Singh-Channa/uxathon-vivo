'use client';
// app/page.tsx — Root page; renders phase-appropriate screen
import { GameProvider, useGame } from '@/store/gameStore';
import UserSelect    from '@/components/onboarding/UserSelect/UserSelect';
import DomainSelect  from '@/components/onboarding/DomainSelect/DomainSelect';
import PersonaSelect from '@/components/onboarding/PersonaSelect/PersonaSelect';
import GameBoard     from '@/components/game/GameBoard/GameBoard';
import FABRail       from '@/components/core/FABRail/FABRail';
import Leaderboard   from '@/components/views/Leaderboard/Leaderboard';
import styles from './page.module.css';

function App() {
  const { state } = useGame();

  return (
    <div className={styles.shell}>
      {state.gamePhase === 'USER_SELECT'    && <UserSelect />}
      {state.gamePhase === 'DOMAIN_SELECT'  && <DomainSelect />}
      {state.gamePhase === 'PERSONA_SELECT' && <PersonaSelect />}
      {state.gamePhase === 'LEADERBOARD'    && <Leaderboard />}
      {(state.gamePhase === 'PLAYING' ||
        state.gamePhase === 'WON'    ||
        state.gamePhase === 'PERSONA_TAKEN') && <GameBoard />}
      <FABRail />
    </div>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <App />
    </GameProvider>
  );
}
