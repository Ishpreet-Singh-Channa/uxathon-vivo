'use client'

import React, { Suspense, useMemo, useState } from 'react'
import { getGame } from '@/app/games/registry'
import { GamePanel } from '@/app/games/_components/GameShell'
import { MultiplayerRoom } from '@/lib/multiplayer/types'
import { Trophy, Scroll } from 'lucide-react'
import { PersonaFlowHostMonitor } from '@/components/multiplayer/PersonaFlowHostMonitor'

type GameWrapperProps = {
  room: MultiplayerRoom
  userId: string | null
  isHost: boolean
  gameState: any
  updateGameState: (state: any) => Promise<void>
  leaveRoom: () => void
}

export function GameWrapper({
  room,
  userId,
  isHost,
  gameState,
  updateGameState,
  leaveRoom,
}: GameWrapperProps) {
  // Resolve game component from registry
  const gameDef = useMemo(() => {
    return getGame(room.game_id)
  }, [room.game_id])

  // Extract score states, defaults to empty map
  const playerScores = gameState?.scores || {}
  const playerLevels = gameState?.levels || {}
  const gameLogs: string[] = gameState?.logs || ['Signal connected. Sandbox listening for inputs.']

  // Render the registered game component
  const GameComponent = gameDef?.component


  const [isEndingGame, setIsEndingGame] = useState(false)
  const [endGameError, setEndGameError] = useState<string | null>(null)

  async function endCurrentGame() {
    const confirmed = window.confirm('End the current game for everyone in this room?')
    if (!confirmed) return

    setIsEndingGame(true)
    setEndGameError(null)

    try {
      const token = localStorage.getItem('jwt-token')

      const res = await fetch('/api/multiplayer/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: room.code,
          reason: 'Host ended the current game',
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to end game')
      }
    } catch (err: any) {
      setEndGameError(err.message || 'Failed to end game')
    } finally {
      setIsEndingGame(false)
    }
  }

  const [isStartingBidding, setIsStartingBidding] = useState(false)
  const [biddingError, setBiddingError] = useState<string | null>(null)

  const personaFlowEnded = room.game_id === 'persona-flow' && gameState?.personaFlow?.ended

  async function startBiddingFromPersonaRoom() {
    setIsStartingBidding(true)
    setBiddingError(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt-token') : null

      const res = await fetch('/api/bidding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: room.code,
          startingTokens: 1_000_000,
          minIncrement: 50_000,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start bidding')
      }
    } catch (err: any) {
      setBiddingError(err.message || 'Failed to start bidding')
    } finally {
      setIsStartingBidding(false)
    }
  }

  return (
    <div className="space-y-6 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      {endGameError && (
        <div className="border border-[#ff6a6a]/40 bg-[#ff6a6a]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ff6a6a]">
          {endGameError}
        </div>
      )}
      <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#ff6a6a] flex items-center gap-2">
          <span className="h-1.5 w-1.5 bg-[#ff6a6a]" />
          SESSION CHANNEL: LIVE RUNNING
        </span>
        
        <div className="flex items-center gap-2">
        {isHost && (
          <button
            type="button"
            onClick={endCurrentGame}
            disabled={isEndingGame}
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#ff6a6a] hover:text-white active:bg-[#ff6a6a] active:text-[#171717] px-2 py-0.5 transition-colors disabled:opacity-50"
          >
            {isEndingGame ? 'Ending...' : 'End Game'}
          </button>
        )}

        <button
          type="button"
          onClick={leaveRoom}
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] hover:text-white active:bg-[#ff6a6a] active:text-[#171717] px-2 py-0.5 transition-colors"
        >
          Disconnect
        </button>
      </div>
      </div>

      {/* Main Grid: Game View + Multiplayer HUD */}
      <div className="space-y-6">
        {room.game_id === 'persona-flow' && isHost ? (
        <div className="space-y-4">
          <PersonaFlowHostMonitor room={room} />

          {personaFlowEnded && (
            <GamePanel className="space-y-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                Persona Flow Complete
              </p>

              <h3 className="font-sans text-2xl uppercase tracking-[0.04em] text-white">
                Start Bidding in Same Room
              </h3>

              <p className="mx-auto max-w-[42ch] text-[12px] leading-5 text-[#929292]">
                Leaders and teams were created in this room. Continue with the same room code so bidding can detect those leaders.
              </p>

              {biddingError && (
                <div className="border border-[#ff6a6a]/40 bg-[#ff6a6a]/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ff6a6a]">
                  {biddingError}
                </div>
              )}

              <button
                type="button"
                disabled={isStartingBidding}
                onClick={startBiddingFromPersonaRoom}
                className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:opacity-50"
              >
                {isStartingBidding ? 'Starting Bidding...' : 'Start Bidding Game'}
              </button>
            </GamePanel>
          )}
        </div>
      ) : GameComponent ? (
          <GamePanel className="relative">
            <Suspense
              fallback={
                <div className="flex h-48 items-center justify-center">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                    Syncing environment stream...
                  </span>
                </div>
              }
            >
              {/* Render the dynamic game component, passing down multiplayer sync props */}
              <GameComponent
                isMultiplayer={true}
                room={room}
                roomId={room.id}
                roomCode={room.code}
                gameState={gameState}
                updateGameState={updateGameState}
                players={room.room_players}
                userId={userId}
                isHost={isHost}
              />
            </Suspense>
          </GamePanel>
        ) : (
          <GamePanel className="py-8 text-center text-[#ff6a6a]">
            <p className="font-mono text-xs uppercase tracking-[0.14em]">
              ERR: Environment '{room.game_id}' not found in local registry.
            </p>
          </GamePanel>
        )}

        {/* Multiplayer HUD: Leaderboard & Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Live Leaderboard */}
          <div>
            <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] flex items-center gap-2">
                <Trophy size={12} className="text-[#DEF767]" />
                LIVE STANDINGS
              </p>
            </div>

            <div className="flex flex-col slab-list mt-2 max-h-48 overflow-y-auto">
              {room.room_players.map((player) => {
                const isMe = player.user.id === userId
                const pId = player.user.id
                
                // Read player's score or level from game state
                const score = playerScores[pId] ?? 0
                const level = playerLevels[pId] ?? 1

                return (
                  <div 
                    key={pId} 
                    className="flex h-[44px] items-center justify-between border border-[#2e2e2e] bg-[#171717]/70 px-4 -mt-[1px]"
                  >
                    <span className="font-sans text-[13px] uppercase tracking-[0.04em] text-[#929292] truncate max-w-[150px]">
                      {player.user.name} {isMe && <span className="font-mono text-[9px] text-[#DEF767] ml-1">(YOU)</span>}
                    </span>
                    <div className="font-mono text-[10px] text-white flex gap-3">
                      <span className="text-[#5b5b5b]">LVL {level}</span>
                      <span className="text-[#DEF767]">{score} PTS</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Log Console */}
          <div>
            <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] flex items-center gap-2">
                <Scroll size={12} />
                ACTIVITY SIGNAL LOG
              </p>
            </div>
            
            <div className="mt-2 border border-[#2e2e2e] bg-[#171717]/70 p-4 font-mono text-[9px] uppercase tracking-[0.08em] text-[#5b5b5b] max-h-48 overflow-y-auto space-y-1.5 h-[140px] select-none">
              {gameLogs.map((log, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-[#ff6a6a]">&gt;&gt;</span>
                  <span className="text-[#929292]">{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
