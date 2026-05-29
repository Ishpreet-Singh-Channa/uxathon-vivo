'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, Users, Shield, Play } from 'lucide-react'
import { GamePanel, gameButtonPrimary, gameButtonSecondary } from '@/app/games/_components/GameShell'
import { getAllGames } from '@/app/games/registry'
import { MultiplayerRoom } from '@/lib/multiplayer/types'

type LobbyProps = {
  room: MultiplayerRoom
  userId: string | null
  isHost: boolean
  isWS: boolean
  onStart: (gameId: string) => void
  onLeave: () => void
}

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return 'UX'
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function Lobby({ room, userId, isHost, isWS, onStart, onLeave }: LobbyProps) {
  const [copied, setCopied] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState(room.game_id || 'chimp')
  const [allGames, setAllGames] = useState<any[]>([])

  // Load all registered games on client-side mount
  useEffect(() => {
    try {
      setAllGames(getAllGames())
    } catch (e) {
      // Fallback if registry fails/empty
      setAllGames([{ id: 'chimp', name: 'Chimp Test', description: 'Memorize tiles' }])
    }
  }, [])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  function getImageUrl(imagePath?: string | null) {
    if (!imagePath) return "";
    
    // If it's already a full URL (like Dicebear) or a base64 string, return it as is
    if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
        return imagePath;
    }

    // Otherwise, append the backend URL and the /uploads/ prefix
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    return `${backendUrl}/uploads/${imagePath}`;
}

  const selectedGame = allGames.find((g) => g.id === selectedGameId)
  

  return (
    <div className="space-y-6 text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      {/* Connection & Meta Status Panel */}
      <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b] flex items-center gap-2">
          <span className={`h-1.5 w-1.5 ${isWS ? 'bg-[#DEF767]' : 'bg-[#5b5b5b]'}`} />
          {isWS ? 'SIGNAL LINK: ACTIVE (WS)' : 'SIGNAL LINK: SIMULATED (HTTP)'}
        </span>
        <button
          type="button"
          onClick={onLeave}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#ff6a6a] hover:text-white active:bg-[#ff6a6a] active:text-[#171717] px-2 py-0.5 transition-colors"
        >
          Leave Room
        </button>
      </div>

      {/* Lobby Room Code Card */}
      <GamePanel className="text-center py-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">LOBBY COORDINATE KEY</p>
        <div className="mt-3 inline-flex items-center justify-center gap-3">
          <h2 className="font-sans text-[42px] uppercase leading-none tracking-[0.05em] text-white">
            {room.code}
          </h2>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy room code"
            className="grid h-10 w-10 place-items-center border border-[#2e2e2e] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] transition-all"
          >
            {copied ? <Check size={14} className="text-[#DEF767]" /> : <Copy size={14} />}
          </button>
        </div>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[#929292]">
          {copied ? 'Signal coordinate key copied!' : 'Distribute key code to sync peer nodes'}
        </p>
      </GamePanel>

      {/* Joined Players List */}
      <div>
        <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] flex items-center gap-2">
            <Users size={12} />
            SYNCED PLAYER NODES
          </p>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
            {room.room_players.length} / {room.max_players || 8} CONNECTED
          </span>
        </div>

        <div className="flex flex-col slab-list mt-2">
          {room.room_players.map((player) => {
            const isPlayerHost = player.user.id === room.host_user_id
            const isMe = player.user.id === userId
            const name = player.user.name || 'Anonymous Gamer'
            const profile_picture = player.user.profile_picture

            return (
              <div
                key={player.user.id}
                className="flex h-[90px] items-center justify-between border border-[#2e2e2e] bg-[#171717]/70 px-5 -mt-[1px]"
              >
                <div className="flex items-center gap-3">
                  {profile_picture ? (
                    <img
                      src={getImageUrl(profile_picture)}
                      alt=""
                      className="h-10 w-10 border border-[#2e2e2e] object-cover bg-[#181818]"
                    />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.08em] text-[#ff6a6a]">
                      {getInitials(name)}
                    </div>
                  )}

                  <div>
                    <h3 className="font-sans text-[15px] uppercase tracking-[0.04em] text-white">
                      {name} {isMe && <span className="text-[10px] font-mono text-[#DEF767] tracking-[0.1em] ml-1">(YOU)</span>}
                    </h3>
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#5b5b5b]">
                      NODE_ID: {player.user.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {isPlayerHost && (
                  <span className="flex items-center gap-1 border border-[rgba(222,247,103,0.3)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-[#DEF767] bg-[#DEF767]/5">
                    <Shield size={9} />
                    Host
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Host Settings & Controls */}
      {isHost ? (
        <div className="space-y-4 pt-2">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b] block mb-2 px-1">
              Select Sandbox Environment
            </label>
            <div className="grid grid-cols-2 border border-[#2e2e2e]">
              {allGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                  className={`py-3.5 px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-center transition-all border-r border-[#2e2e2e] last:border-r-0 ${
                    selectedGameId === game.id
                      ? 'bg-[#ff6a6a] text-[#171717] border-[#ff6a6a]'
                      : 'bg-[#181818] text-[#929292] hover:text-white active:bg-[#DEF767] active:text-[#171717]'
                  }`}
                >
                  {game.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onStart(selectedGameId)}
              disabled={room.room_players.length < 1}
              className={`w-full flex items-center justify-center gap-2 ${gameButtonPrimary}`}
            >
              <Play size={12} fill="currentColor" />
              Launch {selectedGame?.name || 'Session'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-[#2e2e2e] bg-[#171717]/40 px-4 py-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] flex items-center justify-center gap-3">
            <span className="flex space-x-1 items-center">
              <span className="w-1.5 h-1.5 bg-[#DEF767]" />
              <span className="w-1.5 h-1.5 bg-[#DEF767] opacity-60" />
              <span className="w-1.5 h-1.5 bg-[#DEF767] opacity-30" />
            </span>
            Awaiting host launch: {selectedGame?.name || 'Session'}
          </p>
        </div>
      )}
    </div>
  )
}
