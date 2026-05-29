'use client';
import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import styles from './Leaderboard.module.css';

export default function Leaderboard() {
  const { state, dispatch } = useGame();
  const leaderboard = state.leaderboard || [];

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={styles.header}>
        <button 
          className={styles.backBtn}
          onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'USER_SELECT' })}
        >
          ← EXIT RACE
        </button>
        <h1 className={styles.title}>LEADERBOARD</h1>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>PLAYER & TEAM</th>
              <th>DOMAIN</th>
              <th>PERSONA</th>
              <th>CLAIMED AT</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>No claims yet. Be the first!</td>
              </tr>
            ) : (
              leaderboard.map((claim, idx) => (
                <tr key={idx} className={styles.row}>
                  <td>
                    <div className={styles.userInfo}>
                      <span className={styles.username}>{claim.user.username}</span>
                      <span className={styles.teamName}>{claim.user.teamName}</span>
                      <div className={styles.members}>
                        {claim.user.teamMembers?.join(', ')}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.domainInfo}>
                      <span className={styles.domainIcon}>{claim.domain.icon}</span>
                      <span>{claim.domain.name}</span>
                    </div>
                  </td>
                  <td>
                    <div 
                      className={styles.personaTag}
                      style={{ '--color': claim.persona.color_code } as any}
                    >
                      {claim.persona.name}
                    </div>
                  </td>
                  <td className={styles.timestamp}>
                    {new Date(claim.claimedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
