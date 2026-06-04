'use client'

import { MultiplayerRoom } from '@/lib/multiplayer/types'
import { Trophy, Users, Layers } from 'lucide-react'

type Props = {
  room: MultiplayerRoom
}

export function PersonaFlowHostMonitor({ room }: Props) {
  const claims = room.room_persona_claims || []
  const totalPersonas = 20
  // const remaining = Math.max(totalPersonas - claims.length, 0)
  const ended = claims.length >= totalPersonas || room.status === 'finished'

  const claimedCount = claims.length
  const remaining = Math.max(totalPersonas - claimedCount, 0)


  console.log('[Host Monitor Claims]', {
  roomId: room.id,
  claims: room.room_persona_claims,
  count: room.room_persona_claims?.length,
})

  
  return (
    <div className="space-y-6">
      <div className="border border-[#2e2e2e] bg-[#171717]/70 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
          HOST OBSERVER MODE
        </p>

        <h2 className="mt-2 font-sans text-3xl uppercase tracking-[0.04em] text-white">
          Persona Flow Live Board
        </h2>

        <p className="mt-3 text-[13px] leading-6 text-[#929292]">
          You are hosting this game. Players are racing for personas; you can watch claims, domains,
          and final team assignment in real time.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-px border border-[#2e2e2e] bg-[#2e2e2e]">
          <div className="bg-[#181818] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Players</p>
            <p className="mt-1 font-sans text-2xl text-white">{room.room_players.length}</p>
          </div>

          <div className="bg-[#181818] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Claimed</p>
            <p className="mt-1 font-sans text-2xl text-[#DEF767]">{claimedCount}</p>
          </div>

          <div className="bg-[#181818] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">Remaining</p>
            <p className="mt-1 font-sans text-2xl text-[#ff6a6a]">{remaining}</p>
          </div>
        </div>

        {ended && (
          <div className="mt-6 border border-[#DEF767]/40 bg-[#DEF767]/10 p-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
            The game has ended. All 20 personas have been assigned.
          </div>
        )}
      </div>

      <div>
        <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#929292] flex items-center gap-2">
            <Trophy size={12} className="text-[#DEF767]" />
            Live Persona Claims
          </p>
        </div>

        <div className="mt-2 flex flex-col">
          {claims.length === 0 ? (
            <div className="border border-[#2e2e2e] bg-[#171717]/70 p-6 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              No claims yet.
            </div>
          ) : (
            claims.map((claim, index) => (
              <div
                key={claim.id}
                className="grid gap-3 border border-[#2e2e2e] bg-[#171717]/70 p-4 -mt-[1px] md:grid-cols-[40px_1fr_1fr_1fr]"
              >
                <div className="font-mono text-[11px] text-[#5b5b5b]">
                  #{String(index + 1).padStart(2, '0')}
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b] flex items-center gap-2">
                    <Users size={10} />
                    Player
                  </p>
                  <p className="mt-1 font-sans text-[14px] uppercase text-white">
                    {claim.user?.name || claim.user_id.slice(0, 8)}
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b] flex items-center gap-2">
                    <Layers size={10} />
                    Domain
                  </p>
                  <p className="mt-1 font-sans text-[14px] uppercase text-white">
                    {claim.domain_name}
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                    Persona
                  </p>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: claim.persona_hex }}
                    />
                    <span className="font-sans text-[14px] uppercase text-white">
                      {claim.persona_name}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
