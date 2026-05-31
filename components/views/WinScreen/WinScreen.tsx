import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { useGame } from '@/store/gameStore';
import PersonaMiniCard from '@/components/game/PersonaMiniCard/PersonaMiniCard';
import { CREATE_TEAM, ADD_TEAM_MEMBER } from '@/lib/GameRules/game-queries';
import styles from './WinScreen.module.css';




type CreateTeamData = {
  insert_teams_one: {
    id: string;
    color: string;
    created_by: string;
  } | null;
};

type CreateTeamVariables = {
  name: string;
  color: string;
  userId: string;
};

type AddTeamMemberData = {
  insert_team_members_one: {
    id: string;
  } | null;
};

type AddTeamMemberVariables = {
  teamId: string;
  userId: string;
  memberType: string;
};


type WinScreenProps = {
  userId?: string;
};

export default function WinScreen({ userId }: WinScreenProps) {
  const { state, dispatch } = useGame();
  const { selectedPersona, currentUser } = state;
  const [claimStatus, setClaimStatus] = useState<'VERIFYING' | 'WON' | 'LOST'>('VERIFYING');

  const [createTeam] = useMutation<CreateTeamData, CreateTeamVariables>(CREATE_TEAM);
  const [addTeamMember] = useMutation<AddTeamMemberData, AddTeamMemberVariables>(ADD_TEAM_MEMBER);
  // ---------------------------------------------------

  
  // const [createTeam] = useMutation(CREATE_TEAM);
  // const [addTeamMember] = useMutation(ADD_TEAM_MEMBER);
  // const [claimPersona, ] = useMutation(CREATE_TEAM_ATOMIC);
  // const [createTeam] = useMutation(CREATE_TEAM_ATOMIC_V2);
  const claimAttempted = useRef(false);
  useEffect(() => {
  async function verifyWin() {
    if (!selectedPersona || !currentUser || !userId || claimAttempted.current) return;
    claimAttempted.current = true;

    try {
      // Step 1: Create the team
      const { data: teamData } = await createTeam({
        variables: {
          name: `${selectedPersona.name} Squad`,
          color: selectedPersona.color_code,
          userId,
        },
      });

      const newTeamId = teamData?.insert_teams_one?.id;
      if (!newTeamId) throw new Error("Team creation returned no ID");

      // Step 2: Add the leader as a team_member
      await addTeamMember({
        variables: {
          teamId: newTeamId,
          userId,
          memberType: "LEADER",
        },
      });

      setClaimStatus("WON");
      fireConfetti();

    } catch (err: any) {
      console.error("Failed to verify claim:", err);

      const errorString = JSON.stringify(err);

      // Already created a team (duplicate request)
      if (errorString.includes("teams_leader_id_key") || 
          errorString.includes("teams_created_by_key")) {
        setClaimStatus("WON");
        fireConfetti();
        return;
      }

      // Someone took this color
      setClaimStatus("LOST");
      setTimeout(() => {
        dispatch({ type: "PERSONA_TAKEN_BY", payload: "Another player" });
      }, 1500);
    }
  }

  verifyWin();
}, [createTeam, addTeamMember, selectedPersona, currentUser, userId, dispatch]);







  


  function fireConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }

  // If we lost at the last millisecond, show a brief transition state
  if (claimStatus === 'LOST') {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <h1 className={styles.heading} style={{ color: 'var(--coral)' }}>Sync Failure</h1>
          <p className={styles.sub}>Verifying database... Persona was claimed milliseconds ago by another player.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={styles.blob} style={{ background: `radial-gradient(circle, ${selectedPersona?.color_code ?? '#DEF767'}33 0%, transparent 70%)` }} />

      <motion.div className={styles.card} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className={styles.tag}>
          {claimStatus === 'VERIFYING' ? 'VERIFYING CLAIM...' : 'FLOW COMPLETE'}
        </div>

        <div className={styles.personaShowcase}>
          {selectedPersona && <PersonaMiniCard persona={selectedPersona} />}
        </div>

        <h1 className={styles.heading}>
          {claimStatus === 'VERIFYING' ? 'Awaiting DB...' : `${currentUser?.username}, you are the Leader.`}
        </h1>

        <p className={styles.sub}>
          {claimStatus === 'VERIFYING'
            ? 'Locking transaction on the server...'
            : 'Persona locked. No one else can take it now.'}
        </p>

        {claimStatus === 'WON' && (
          <div className={styles.actions}>
            <Link href="/dashboard" className={styles.primaryBtn}>
              Return to Dashboard
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
