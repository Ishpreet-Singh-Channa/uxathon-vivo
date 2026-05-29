'use client'

import React, { Suspense, useMemo } from 'react'
import { getGame } from '@/app/games/registry'
import { GamePanel } from '@/app/games/_components/GameShell'
import { MultiplayerRoom } from '@/lib/multiplayer/types'
import { Trophy, Scroll } from 'lucide-react'

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

  return (
    <div className="space-y-6 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      {/* Active Game Header */}
      <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#ff6a6a] flex items-center gap-2">
          <span className="h-1.5 w-1.5 bg-[#ff6a6a]" />
          SESSION CHANNEL: LIVE RUNNING
        </span>
        <button
          type="button"
          onClick={leaveRoom}
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] hover:text-white active:bg-[#ff6a6a] active:text-[#171717] px-2 py-0.5 transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Main Grid: Game View + Multiplayer HUD */}
      <div className="space-y-6">
        {/* Dynamic Game Component Display */}
        {GameComponent ? (
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
