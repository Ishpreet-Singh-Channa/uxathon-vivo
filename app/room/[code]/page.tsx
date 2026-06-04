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
  const shellVariant =
    room?.game_id === "bidding" && isHost ? "stage" : "default";
  if (loading) {
    return (
      <GameShell
        meta={`UXISM / ROOM / ${code}`}
        title="Syncing..."
        description="Connecting to signal..."
        variant="default"
      >
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
            Loading room state...
          </p>
        </div>
      </GameShell>
    );
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


  const isHostBiddingStage = room.game_id === 'bidding' && isHost

  if (isHostBiddingStage) {
    return (
      <main className="relative min-h-screen overflow-x-hidden bg-[#181818] text-white">
        <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
        <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
        <div className="pointer-events-none fixed bottom-4 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
        <div className="pointer-events-none fixed bottom-4 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />

        <section className="relative z-10 mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <GameWrapper
            room={room}
            userId={userId}
            isHost={isHost}
            gameState={gameState}
            updateGameState={updateGameState}
            leaveRoom={leaveRoom}
          />
        </section>
      </main>
    )
  }
  


  if (room.status === 'finished') {
    const personaEnded = room.game_id === 'persona-flow'
    const canStartBidding = isHost && personaEnded

    async function startBiddingFromFinishedRoom() {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt-token') : null

      const res = await fetch('/api/bidding/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code,
          startingTokens: 1_000_000,
          minIncrement: 50_000,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(data.error || 'Failed to start bidding')
        return
      }

      window.location.reload()
    }

    return (
      <GameShell
        meta={`UXISM / ROOM / ${code}`}
        title={personaEnded ? 'Persona Flow Complete' : 'Game Ended'}
        description={
          personaEnded
            ? 'Persona leaders have been created. Continue this same room into Bidding.'
            : 'The game session has ended.'
        }
      >
        <div className="border border-[#2e2e2e] bg-[#171717]/70 p-6 text-center space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
            {personaEnded ? 'Persona Flow has ended.' : 'The game has ended.'}
          </p>

          <p className="text-[13px] leading-6 text-[#929292]">
            {personaEnded
              ? 'Use the same room code to continue into Bidding so the leaders can be detected.'
              : 'The current room session is complete.'}
          </p>

          {canStartBidding && (
            <button
              type="button"
              onClick={startBiddingFromFinishedRoom}
              className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]"
            >
              Start Bidding in This Room
            </button>
          )}
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
