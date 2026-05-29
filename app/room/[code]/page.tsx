'use client'

import React, { use } from 'react'
import { GameShell } from '@/app/games/_components/GameShell'
import { useMultiplayer } from '@/lib/multiplayer/useMultiplayer'
import { Lobby } from '@/components/multiplayer/Lobby'
import { GameWrapper } from '@/components/multiplayer/GameWrapper'

export default function RoomCodePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params)
  const code = resolvedParams.code.toUpperCase().trim()

  const {
    userId,
    room,
    gameState,
    loading,
    error,
    isHost,
    isWS,
    startGame,
    updateGameState,
    leaveRoom,
  } = useMultiplayer(code)

  // Meta title and description based on room status
  const title = room?.status === 'in_game' ? 'Multiplayer Match' : 'Teammate Lobby'
  const description =
    room?.status === 'in_game'
      ? 'Collaborating or competing in real time. Work together to score!'
      : 'Invite other players using the lobby code. Prepare to launch.'

  if (loading) {
    return (
      <GameShell meta="UXISM / MULTIPLAYER / LOADING" title="Syncing..." description="Connecting to signal...">
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ff6a6a] border-t-transparent"></div>
          <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
            Connecting to session...
          </span>
        </div>
      </GameShell>
    )
  }

  if (error || !room) {
    return (
      <GameShell meta="UXISM / MULTIPLAYER / ERROR" title="Lobby Error" description="The connection was interrupted.">
        <div className="border border-[#2e2e2e] bg-[#171717]/70 p-6 text-center space-y-4">
          <p className="font-mono text-xs text-[#ff6a6a] uppercase tracking-[0.12em]">
            {error || 'This room does not exist or has closed.'}
          </p>
          <button
            type="button"
            onClick={leaveRoom}
            className="px-4 py-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] transition-all"
          >
            Go Back
          </button>
        </div>
      </GameShell>
    )
  }

  return (
    <GameShell
      meta={`UXISM / ROOM / ${code}`}
      title={title}
      description={description}
    >
      {room.status === 'waiting' ? (
        <Lobby
          room={room}
          userId={userId}
          isHost={isHost}
          isWS={isWS}
          onStart={(gameId) => startGame(gameId)}
          onLeave={leaveRoom}
        />
      ) : (
        <GameWrapper
          room={room}
          userId={userId}
          isHost={isHost}
          gameState={gameState}
          updateGameState={updateGameState}
          leaveRoom={leaveRoom}
        />
      )}
    </GameShell>
  )
}
