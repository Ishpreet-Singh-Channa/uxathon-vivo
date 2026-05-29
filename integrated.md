# Project Code Dump

### File: `apis/hasura/AppoloClient.tsx`

```tsx
"use client";
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// Normal Query, mutation link
const httpLink = new HttpLink({
    uri: "http://localhost:8100/v1/graphql",
    fetch: async (uri, options) => {
        const token = localStorage.getItem("jwt-token");
        console.log("Token in fetch:", token);
        const headers = { ...(options?.headers || {}), Authorization: token ? `Bearer ${token}` : "" };
        return fetch(uri, { ...options, headers });
    },
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
    createClient({
        url: "ws://localhost:8100/v1/graphql",
        connectionParams: async () => {
            const token = localStorage.getItem("jwt-token");
            if (!token) window.location.href = "/login";
            return { headers: { Authorization: token ? `Bearer ${token}` : "" } };
        },
    }),
);

const link = ApolloLink.split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === "OperationDefinition" && definition.operation === "subscription";
    },
    wsLink,
    httpLink,
);

export const client = new ApolloClient({
    link,
    cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

```

---

### File: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

```

---

### File: `app/api/auth/hasura-token/route.ts`

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateHasuraToken } from '@/lib/hasura-token'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = generateHasuraToken(session.user.id)
  return Response.json({ token })
}

```

---

### File: `app/api/multiplayer/create/route.ts`

```typescript
import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'
import { generateRoomCode } from '@/lib/room-code'

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  console.log('[API Multiplayer Create] Parsed userId from bearer token:', userId)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let gameId = 'chimp'
  try {
    const body = await req.json().catch(() => ({}))
    if (body.gameId) {
      gameId = body.gameId
    }
  } catch (e) {
    // Ignore JSON parse error, fallback to default 'chimp'
  }

  let code = generateRoomCode()
  let attempts = 0

  while (attempts < 5) {
    try {
      const data = await hasuraAdminRequest<{
        insert_rooms_one: { id: string; code: string; game_id: string }
      }>(
        `mutation CreateRoom($code: String!, $hostId: uuid!, $gameId: String!) {
          insert_rooms_one(object: {
            code: $code
            host_user_id: $hostId
            status: "waiting"
            game_id: $gameId
            room_players: { data: { user_id: $hostId } }
          }) {
            id
            code
            game_id
          }
        }`,
        { code, hostId: userId, gameId }
      )
      return Response.json({ room: data.insert_rooms_one })
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        code = generateRoomCode()
        attempts++
      } else {
        console.error('Error creating room:', err)
        return Response.json({ error: err.message || 'Failed to create room' }, { status: 500 })
      }
    }
  }

  return Response.json({ error: 'Failed to generate unique code' }, { status: 500 })
}

```

---

### File: `app/api/multiplayer/game-state/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return Response.json({ error: 'Room code required' }, { status: 400 })
  }

  const uppercaseCode = code.toUpperCase().trim()

  try {
    const data = await hasuraAdminRequest<{
      rooms: any[]
    }>(
      `query GetGameState($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          code
          status
          game_id
          host_user_id
          max_players
          room_players(order_by: { joined_at: asc }) {
            joined_at
            user {
              id
              name
              profile_picture
            }
          }
          game_state {
            room_id
            state
            updated_at
          }
        }
      }`,
      { code: uppercaseCode }
    )

    if (!data.rooms || !data.rooms.length) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    return Response.json(data)
  } catch (err: any) {
    console.error('Error fetching game state:', err)
    return Response.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let code: string
  let stateUpdate: any

  try {
    const body = await req.json()
    code = body.code
    stateUpdate = body.state
  } catch (e) {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })
  if (!stateUpdate) return Response.json({ error: 'State update required' }, { status: 400 })

  const uppercaseCode = code.toUpperCase().trim()

  try {
    // 1. Fetch current room details, players, and existing game state to authorize and merge
    const data = await hasuraAdminRequest<{
      rooms: Array<{
        id: string
        room_players: Array<{ user_id: string }>
        game_state?: { state: any }
      }>
    }>(
      `query VerifyAndFetchState($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          room_players {
            user_id
          }
          game_state {
            state
          }
        }
      }`,
      { code: uppercaseCode }
    )

    if (!data.rooms || !data.rooms.length) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    const room = data.rooms[0]
    
    // Check if the current user is a player in this room
    const isPlayer = room.room_players.some(p => p.user_id === userId)
    if (!isPlayer) {
      return Response.json({ error: 'You are not a player in this room' }, { status: 403 })
    }

    const currentGameState = room.game_state?.state || {}
    
    // 2. Merge current state with updates
    let mergedState = { ...currentGameState }
    
    for (const key of Object.keys(stateUpdate)) {
      if (key === 'logs' && Array.isArray(stateUpdate[key]) && Array.isArray(currentGameState[key])) {
        // Prepend new logs and limit to last 20
        mergedState.logs = [...stateUpdate.logs, ...currentGameState.logs].slice(0, 20)
      } else {
        mergedState[key] = stateUpdate[key]
      }
    }

    // 3. Save the merged game state back to the database
    const updateResult = await hasuraAdminRequest<{
      insert_game_state_one: {
        room_id: string
        state: any
        updated_at: string
      }
    }>(
      `mutation UpdateGameState($roomId: uuid!, $state: jsonb!) {
        insert_game_state_one(
          object: { room_id: $roomId, state: $state }
          on_conflict: { constraint: game_state_pkey, update_columns: [state, updated_at] }
        ) {
          room_id
          state
          updated_at
        }
      }`,
      { roomId: room.id, state: mergedState }
    )

    return Response.json({ success: true, game_state: updateResult.insert_game_state_one })
  } catch (err: any) {
    console.error('Error updating game state:', err)
    return Response.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

```

---

### File: `app/api/multiplayer/join/route.ts`

```typescript
import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let code: string
  try {
    const body = await req.json()
    code = body.code
  } catch (e) {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })

  const uppercaseCode = code.toUpperCase().trim()

  try {
    // Fetch room and current player count
    const { rooms } = await hasuraAdminRequest<{
      rooms: Array<{
        id: string
        status: string
        max_players: number
        room_players_aggregate: { aggregate: { count: number } }
      }>
    }>(
      `query GetRoom($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          status
          max_players
          room_players_aggregate { aggregate { count } }
        }
      }`,
      { code: uppercaseCode }
    )

    if (!rooms || !rooms.length) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    const room = rooms[0]

    if (room.status !== 'waiting') {
      return Response.json({ error: 'Game already started' }, { status: 400 })
    }

    if (room.room_players_aggregate.aggregate.count >= room.max_players) {
      return Response.json({ error: 'Room is full' }, { status: 400 })
    }

    // Join room
    await hasuraAdminRequest(
      `mutation JoinRoom($roomId: uuid!, $userId: uuid!) {
        insert_room_players_one(
          object: { room_id: $roomId, user_id: $userId }
          on_conflict: { constraint: room_players_pkey, update_columns: [] }
        ) { room_id }
      }`,
      { roomId: room.id, userId }
    )

    return Response.json({ code: uppercaseCode })
  } catch (err: any) {
    console.error('Error joining room:', err)
    return Response.json({ error: err.message || 'Failed to join room' }, { status: 500 })
  }
}

```

---

### File: `app/api/multiplayer/lobby-status/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { hasuraAdminRequest } from '@/lib/hasura'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })

  try {
    const data = await hasuraAdminRequest<{
      rooms: any[]
    }>(
      `query LobbyPlayers($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          status
          game_id
          host_user_id
          max_players
          room_players {
            joined_at
            user {
              id
              name
              profile_picture
            }
          }
        }
      }`,
      { code: code.toUpperCase().trim() }
    )
    return Response.json(data)
  } catch (err: any) {
    console.error('Error fetching lobby status:', err)
    return Response.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

```

---

### File: `app/api/multiplayer/start/route.ts`

```typescript
import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let code: string
  let gameId = 'chimp'
  let initialState: any = null

  try {
    const body = await req.json()
    code = body.code
    if (body.gameId) {
      gameId = body.gameId
    }
    if (body.initialState) {
      initialState = body.initialState
    }
  } catch (e) {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!code) return Response.json({ error: 'Room code required' }, { status: 400 })

  const uppercaseCode = code.toUpperCase().trim()

  try {
    const { rooms } = await hasuraAdminRequest<{
      rooms: Array<{ id: string; host_user_id: string; status: string }>
    }>(
      `query GetRoom($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          host_user_id
          status
        }
      }`,
      { code: uppercaseCode }
    )

    if (!rooms || !rooms.length) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    const room = rooms[0]

    if (room.host_user_id !== userId) {
      return Response.json({ error: 'Only the host can start the game' }, { status: 403 })
    }

    if (room.status !== 'waiting') {
      return Response.json({ error: 'Game already started' }, { status: 400 })
    }

    // Default configuration for standard games, or use client-provided initial state
    const state = initialState || {
      score: 0,
      turn: 1,
      timeLeft: 60,
      logs: ['Multiplayer session started.', 'Let the game begin!']
    }

    await hasuraAdminRequest(
      `mutation StartGame($id: uuid!, $gameId: String!, $state: jsonb!) {
        update_rooms_by_pk(
          pk_columns: { id: $id }
          _set: { status: "in_game", game_id: $gameId }
        ) { 
          id 
          status 
          game_id
        }
        insert_game_state_one(
          object: { room_id: $id, state: $state }
          on_conflict: { constraint: game_state_pkey, update_columns: [state, updated_at] }
        ) {
          room_id
          state
          updated_at
        }
      }`,
      { id: room.id, gameId, state }
    )

    return Response.json({ success: true })
  } catch (err: any) {
    console.error('Error starting game:', err)
    return Response.json({ error: err.message || 'Failed to start game' }, { status: 500 })
  }
}

```

---

### File: `app/dashboard/page.tsx`

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Gamepad2, MessageCircle, User, Users, Activity, Gem, Layers } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AnimatedBanner } from "@/components/AnimatedBanner";
import { useAuth } from "@/context/token-context";
import { useEffect, useState } from "react";

const BANNER_SUBSCRIPTION = gql`
    query GetLiveBanner {
        banner_by_pk(id: 1) { data }
    }
`;

export default function DashboardPage() {
    const router = useRouter();
    const auth = useAuth();
    
    const [joinCode, setJoinCode] = useState('');
    const [roomError, setRoomError] = useState('');
    const [isRoomLoading, setIsRoomLoading] = useState(false);

    // Guard route against anonymous access vectors
    useEffect(() => {
        if (typeof window !== "undefined" && !auth.getJwt()) {
            router.push("/login");
        }
    }, [auth, router]);

    const { data } = useQuery<{ banner_by_pk: { data: any } }>(BANNER_SUBSCRIPTION);
    const bannerConfig = data?.banner_by_pk?.data;

    async function createRoom() {
        setIsRoomLoading(true);
        setRoomError('');
        try {
            const token = auth.getJwt();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/multiplayer/create', { 
                method: 'POST',
                headers,
                body: JSON.stringify({ gameId: 'chimp' }) 
            });
            
            const data = await res.json();
            if (res.ok && data.room) {
                localStorage.setItem('active-room-code', data.room.code);
                router.push(`/room/${data.room.code}`);
            } else {
                setRoomError(data.error ?? 'Failed to create room channel');
            }
        } catch (err) {
            setRoomError('Network execution timeout.');
        } finally {
            setIsRoomLoading(false);
        }
    }

    async function joinRoom() {
        if (joinCode.trim().length !== 6) return;
        setIsRoomLoading(true);
        setRoomError('');
        try {
            const token = auth.getJwt();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/multiplayer/join', {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
            });
            
            const data = await res.json();
            if (res.ok && data.code) {
                localStorage.setItem('active-room-code', data.code);
                router.push(`/room/${data.code}`);
            } else {
                setRoomError(data.error ?? 'Validation failed for coordinate key');
            }
        } catch (err) {
            setRoomError('Synchronization pipeline mismatch.');
        } finally {
            setIsRoomLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white">
            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">UXISM<span className="text-[#5b5b5b]">/</span>TOPOLOGY</p>
                <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] text-[#929292]"><User size={18} /></Link>
            </header>

            {/* Live Banner Metrics Frame */}
            <section className="relative z-10 flex flex-col items-center justify-center px-5 pt-8 w-full max-w-5xl mx-auto">
                {bannerConfig && bannerConfig.text ? (
                    <div className="w-full border border-[#2e2e2e] bg-[#171717]/80 p-6 flex flex-col items-center">
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#DEF767", letterSpacing: "0.25em", marginBottom: "16px" }}>
                            [ {bannerConfig.subHeader || "LIVE RUNNING BROADCAST"} ]
                        </div>
                        <AnimatedBanner text={bannerConfig.text} effect={bannerConfig.effect} speed={bannerConfig.speed} blurStrength={bannerConfig.blurStrength} font={bannerConfig.font} fontSize={bannerConfig.mainFontSize} repeat={bannerConfig.repeat} color={bannerConfig.color} />
                    </div>
                ) : (
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">SYNCING SYSTEM ENGINE DATA...</p>
                )}
            </section>

            {/* Stream Gateway Interface Blocks */}
            <section className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 px-5 pb-28 pt-6 w-full max-w-5xl mx-auto">
                <div className="border border-[#2e2e2e] bg-[#171717]/70 p-5 text-center flex flex-col justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-2">TRANSMITTER LINK</p>
                        <h3 className="font-sans text-lg uppercase tracking-[0.04em] mb-2">Host New Session</h3>
                        <p className="text-[12px] text-[#929292] mb-6 leading-5">Initialize a room framework channel on local host context definitions.</p>
                    </div>
                    <button onClick={createRoom} disabled={isRoomLoading} className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] py-3.5">
                        {isRoomLoading ? 'Deploying...' : 'Deploy Room Channel'}
                    </button>
                </div>

                <div className="border border-[#2e2e2e] bg-[#171717]/70 p-5 text-center flex flex-col justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-2">RECEIVER LINK</p>
                        <h3 className="font-sans text-lg uppercase tracking-[0.04em] mb-2">Sync Existing Room</h3>
                        <p className="text-[12px] text-[#929292] mb-6 leading-5">Enter 6-character room matrix identity hash code keys directly.</p>
                    </div>
                    <div className="space-y-4">
                        <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ROOM KEY" maxLength={6} className="w-full border border-[#2e2e2e] bg-[#181818] py-3 text-center font-mono font-bold tracking-[0.2em]" />
                        <button onClick={joinRoom} disabled={isRoomLoading || joinCode.trim().length !== 6} className="w-full border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] py-3.5">
                            Sync Session Channel
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer Navigation bar layout definitions */}
            <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#2e2e2e] bg-[#181818]/95 h-16 flex items-center justify-around font-mono text-[10px]">
                <button onClick={() => router.push("/myteam")} className="flex flex-col items-center text-[#FFFFFF]"> <Users size={16}/> TEAM </button>
                <Link href="/games" className="flex flex-col items-center text-[#FFFFFF]"><Gamepad2 size={16}/>GAMES LOUNGE</Link>
                <Link href="/live" className="flex flex-col items-center text-[#FFFFFF]"><MessageCircle size={16}/>LIVE STREAM</Link>
                <Link href="/x" className="flex flex-col items-center text-[#FFFFFF]"><MessageCircle size={16}/>X</Link>
            </nav>
        </main>
    );
}    

```

---

### File: `app/games/_components/GameShell.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Gavel, Gamepad2, MessageCircle, User, Users } from "lucide-react";
import React, { useState, useEffect } from "react";
const bottomNavItems = [
  { label: "My Team", href: "/myteam", icon: Users, enabled: true },
  { label: "Bidding", href: null, icon: Gavel, enabled: false },
  { label: "Games", href: "/games", icon: Gamepad2, enabled: true },
  { label: "Live Chat", href: "/live", icon: MessageCircle, enabled: true },
];

type GameShellProps = {
  meta: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function GameShell({ meta, title, description, children }: GameShellProps) {
  const pathname = usePathname();

  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const roomMatch = pathname?.match(/^\/room\/([A-Z0-9]+)/i);
    if (roomMatch) {
      const code = roomMatch[1].toUpperCase();
      setActiveRoomCode(code);
      localStorage.setItem('active-room-code', code);
    } else {
      const saved = localStorage.getItem('active-room-code');
      if (saved) {
        setActiveRoomCode(saved);
      }
    }
  }, [pathname]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <PageDecor />

      <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-28 pt-6">
        <Link
          href="/games"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:text-[#DEF767]"
        >
          <ArrowLeft size={14} aria-hidden />
          Games lounge
        </Link>
        <div className="mb-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">{meta}</p>
          <h1 className="mt-3 font-sans text-[32px] uppercase leading-[0.95] tracking-[0.02em] text-white sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-4 max-w-[34ch] text-[13px] leading-6 text-[#929292]">{description}</p>
        </div>
        {children}
      </section>
    </main>
  );
}

export function GameStats({
  levelLabel = "level",
  levelValue,
  bestLabel = "best",
  bestValue,
}: {
  levelLabel?: string;
  levelValue: string | number;
  bestLabel?: string;
  bestValue: string | number;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-px border border-[#2e2e2e] bg-[#2e2e2e]">
      <div className="bg-[#171717]/70 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{levelLabel}</p>
        <p className="mt-1 font-sans text-2xl tabular-nums uppercase tracking-[0.04em] text-white">{levelValue}</p>
      </div>
      <div className="bg-[#171717]/70 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{bestLabel}</p>
        <p className="mt-1 font-sans text-2xl tabular-nums uppercase tracking-[0.04em] text-white">{bestValue}</p>
      </div>
    </div>
  );
}

export function GamePanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#2e2e2e] bg-[#171717]/70 px-4 py-6 sm:px-5 ${className}`}>{children}</div>
  );
}

export const gameButtonPrimary =
  "px-6 py-3 border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] active:border-[#ff6a6a] active:bg-[#ff6a6a] active:text-[#171717]";

export const gameButtonSecondary =
  "px-4 py-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]";

function PageDecor() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none fixed left-4 top-4 z-0 h-5 w-5 border-l border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed right-4 top-4 z-0 h-5 w-5 border-r border-t border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-24 left-4 z-0 h-5 w-5 border-b border-l border-[#5b5b5b]" />
      <div className="pointer-events-none fixed bottom-24 right-4 z-0 h-5 w-5 border-b border-r border-[#5b5b5b]" />
      <div className="pointer-events-none fixed left-1/2 top-[-120px] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-20 blur-3xl" />
    </>
  );
}

```

---

### File: `app/games/chimp/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const chimpConfig = {
  id: "chimp",
  name: "Chimp Test",
  description: "Memorize the numbered tiles and click them in ascending order.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initChimp() {
  registerGame(chimpConfig);
}

```

---

### File: `app/games/chimp/page.tsx`

```tsx

"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMultiplayer } from "@/lib/multiplayer/useMultiplayer";
import { GamePanel, GameShell, GameStats, gameButtonPrimary, gameButtonSecondary } from "../_components/GameShell";

type Phase = "idle" | "memorize" | "input" | "success" | "fail" | "terminated";

const START_COUNT = 4;
const MAX_COUNT = 25;
const MEMORIZE_MS = 1400;
const MIN_MEMORIZE_MS = 650;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createBoard(count: number) {
  const positions = shuffle(Array.from({ length: count }, (_, index) => index));
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    position: positions[index],
  }));
}

function ChimpPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode"); // "singleplayer"

  // Load state tracking values using custom hook
  const { userId, room, gameState, updateGameState, activeRoomCode } = useMultiplayer();

  const isMultiplayer = mode !== "singleplayer" && !!activeRoomCode;

  // Internal Game Engine Mechanics
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [board, setBoard] = useState<Array<{ number: number; position: number }>>([]);
  const [boardCount, setBoardCount] = useState(START_COUNT);
  const [expected, setExpected] = useState(1);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [bestLevel, setBestLevel] = useState(0);
  
  // Real-time synchronization log
  const [terminalScore, setTerminalScore] = useState<number | null>(null);

  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const memorizeDuration = React.useCallback((count: number) => {
    return Math.max(MIN_MEMORIZE_MS, MEMORIZE_MS - (count - START_COUNT) * 45);
  }, []);

  const startRound = React.useCallback((nextLevel = level) => {
    clearTimer();
    const count = Math.min(MAX_COUNT, START_COUNT + nextLevel - 1);
    const nextBoard = createBoard(count);

    setLevel(nextLevel);
    setBoardCount(count);
    setBoard(nextBoard);
    setExpected(1);
    setRevealed([]);
    setPhase("memorize");

    timerRef.current = window.setTimeout(() => {
      setPhase("input");
    }, memorizeDuration(count));
  }, [clearTimer, level, memorizeDuration]);

  const handleCellClick = React.useCallback(async (position: number) => {
    if (phase !== "input") return;

    const targetCell = board.find((entry) => entry.number === expected);
    if (!targetCell || targetCell.position !== position) {
      // TRIGGER GAME OVER
      setPhase("terminated");
      const finalScore = level * 100;
      setTerminalScore(finalScore);
      setBestLevel((current) => Math.max(current, level));

      if (isMultiplayer && userId && room) {
        // Broadcast the final score payload back to your database pipeline
        const currentScores = gameState?.scores ? { ...gameState.scores } : {};
        const currentLevels = gameState?.levels ? { ...gameState.levels } : {};
        const currentLogs = gameState?.logs ? [...gameState.logs] : [];

        currentScores[userId] = finalScore;
        currentLevels[userId] = level;
        currentLogs.unshift(`Node ${userId.slice(0,8)} disconnected at Level ${level} (${finalScore} PTS).`);

        await updateGameState({
          scores: currentScores,
          levels: currentLevels,
          logs: currentLogs
        });
      }
      return;
    }

    const nextExpected = expected + 1;
    setRevealed((current) => [...current, position]);

    if (nextExpected > board.length) {
      setPhase("success");
      setBestLevel((current) => Math.max(current, level));

      timerRef.current = window.setTimeout(() => {
        startRound(level + 1);
      }, 650);
      return;
    }
    setExpected(nextExpected);
  }, [board, expected, level, phase, startRound, isMultiplayer, userId, room, gameState, updateGameState]);

  const handleReset = () => {
    clearTimer();
    setLevel(1);
    setPhase("idle");
    setBoard([]);
    setBoardCount(START_COUNT);
    setExpected(1);
    setRevealed([]);
    setTerminalScore(null);
  };

  const gridSize = Math.ceil(Math.sqrt(boardCount));
  const cellByPosition = React.useMemo(() => {
    const map = new Map<number, { number: number; position: number }>();
    board.forEach((entry) => map.set(entry.position, entry));
    return map;
  }, [board]);

  return (
    <GameShell
      meta={`UXATHON / ENVIRONMENT / CHIMP / [${isMultiplayer ? "MULTIPLAYER" : "SINGLEPLAYER"}]`}
      title="Chimp Matrix Test"
      description="Click numeric items sequentially following matrix fadeout."
    >
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[300px]">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
              Local node isolation protocol ready
            </p>
            <button type="button" onClick={() => startRound(1)} className={gameButtonPrimary}>
              Start Stream Run
            </button>
          </div>
        )}

        {phase === "terminated" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-pulse">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">[ RUN TERMINATED ]</p>
            <h3 className="font-sans text-3xl text-white font-bold">{terminalScore} PTS</h3>
            <p className="text-xs text-[#929292] max-w-[28ch]">
              {isMultiplayer ? "Telemetry frame automatically synchronized to network matrix records." : "Isolated sandbox execution. Only this latest score was computed."}
            </p>
            <button type="button" onClick={handleReset} className={gameButtonPrimary}>Re-Initialize Module</button>
          </div>
        )}

        {phase !== "idle" && phase !== "terminated" && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {Array.from({ length: gridSize * gridSize }).map((_, position) => {
                const entry = cellByPosition.get(position);
                const isRevealed = revealed.includes(position) || phase === "memorize";
                return (
                  <button
                    key={position}
                    type="button"
                    disabled={phase !== "input"}
                    onClick={() => handleCellClick(position)}
                    className="flex aspect-square items-center justify-center border border-[#2e2e2e] bg-[#181818] font-sans text-xl"
                  >
                    {isRevealed && entry ? entry.number : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GamePanel>
    </GameShell>
  );
}




export default function ChimpPage() {
  return (
    <Suspense fallback={null}>
      <ChimpPageInner />
    </Suspense>
  );
}

```

---

### File: `app/games/number-memory/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const numberMemoryConfig = {
  id: "number-memory",
  name: "Number Memory",
  description: "Remember the longest number you can. Each level adds a digit.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initNumberMemory() {
  registerGame(numberMemoryConfig);
}

```

---

### File: `app/games/number-memory/page.tsx`

```tsx
"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

type Phase = "idle" | "showing" | "input" | "success" | "fail";

const BASE_SHOW_MS = 1400;
const MIN_SHOW_MS = 700;

function makeNumber(length: number) {
  const firstDigit = String(Math.floor(Math.random() * 9) + 1);
  let result = firstDigit;

  for (let index = 1; index < length; index += 1) {
    result += String(Math.floor(Math.random() * 10));
  }

  return result;
}

function NumberMemoryGame() {
  const [level, setLevel] = React.useState(1);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [target, setTarget] = React.useState("");
  const [visibleNumber, setVisibleNumber] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const [bestLevel, setBestLevel] = React.useState(0);

  const timersRef = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  React.useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [phase]);

  const showDurationForLevel = React.useCallback((currentLevel: number) => {
    return Math.max(MIN_SHOW_MS, BASE_SHOW_MS - (currentLevel - 1) * 65);
  }, []);

  const startRound = React.useCallback(
    (nextLevel = level) => {
      clearTimers();

      const nextTarget = makeNumber(nextLevel);
      setLevel(nextLevel);
      setTarget(nextTarget);
      setVisibleNumber(nextTarget);
      setInputValue("");
      setPhase("showing");

      const hideTimer = window.setTimeout(() => {
        setVisibleNumber("");
        setPhase("input");
      }, showDurationForLevel(nextLevel));

      timersRef.current.push(hideTimer);
    },
    [clearTimers, level, showDurationForLevel],
  );

  const handleStart = React.useCallback(() => {
    startRound(1);
  }, [startRound]);

  const handleSubmit = React.useCallback(() => {
    if (phase !== "input") {
      return;
    }

    if (inputValue.trim() === target) {
      setBestLevel((current) => Math.max(current, level));
      setPhase("success");

      const nextLevelTimer = window.setTimeout(() => {
        startRound(level + 1);
      }, 700);

      timersRef.current.push(nextLevelTimer);
      return;
    }

    setBestLevel((current) => Math.max(current, level - 1));
    setPhase("fail");
  }, [inputValue, level, phase, startRound, target]);

  const handleRetry = React.useCallback(() => {
    startRound(level);
  }, [level, startRound]);

  const handleReset = React.useCallback(() => {
    clearTimers();
    setLevel(1);
    setTarget("");
    setVisibleNumber("");
    setInputValue("");
    setPhase("idle");
  }, [clearTimers]);

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel className="min-h-[260px] flex flex-col items-center justify-center text-center">
        {phase === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">one number at a time</p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        )}

        {phase === "showing" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">memorize</p>
            <p className="font-sans text-5xl tabular-nums uppercase tracking-[0.04em] text-white sm:text-6xl">
              {visibleNumber}
            </p>
          </div>
        )}

        {phase === "input" && (
          <div className="flex w-full max-w-md flex-col items-center gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">enter the number</p>
            <form
              className="flex w-full flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
            >
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full border border-[#2e2e2e] bg-transparent px-4 py-4 text-center font-sans text-4xl tabular-nums uppercase tracking-[0.04em] text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]"
                placeholder=""
                aria-label="Enter remembered number"
              />
              <button type="submit" className={gameButtonSecondary}>
                submit
              </button>
            </form>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-sans text-4xl uppercase tracking-[0.04em] text-[#DEF767]">correct</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">next number incoming</p>
          </div>
        )}

        {phase === "fail" && (
          <div className="flex flex-col items-center gap-5">
            <p className="font-sans text-4xl uppercase tracking-[0.04em] text-[#ff6a6a]">wrong</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">answer was {target}</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleRetry} className={gameButtonPrimary}>
                retry
              </button>
              <button type="button" onClick={handleReset} className={gameButtonSecondary}>
                reset
              </button>
            </div>
          </div>
        )}
      </GamePanel>

      {phase !== "idle" && phase !== "fail" && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        </div>
      )}
    </>
  );
}

export default function NumberMemoryPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / NUMBER"
      title="Number Memory"
      description="Remember the number before it disappears."
    >
      <NumberMemoryGame />
    </GameShell>
  );
}

```

---

### File: `app/games/page.tsx`

```tsx


"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Brain, Gamepad2, MessageCircle, Plus, Shapes, Sparkles, User, Users, Zap, type LucideIcon, X, Radio } from "lucide-react";
import { useMultiplayer } from "@/lib/multiplayer/useMultiplayer";

type Game = {
    id: string;
    title: string;
    description: string;
    meta: string;
    href: string;
    icon: LucideIcon;
};

const GAMES: Game[] = [
    { id: "chimp", title: "chimp", description: "Pair live signals before the feed resets.", meta: "mode / memory", href: "/games/chimp", icon: Brain },
    { id: "number-memory", title: "number-memory", description: "Draw the prompt before the room times out.", meta: "mode / creative", href: "/games/number-memory", icon: Shapes },
    { id: "sequence-memory", title: "sequence-memory", description: "Vote with the crowd on the fastest path.", meta: "mode / social", href: "/games/sequence-memory", icon: Zap },
    { id: "reaction-time", title: "reaction-time", description: "Answer streak questions from the event deck.", meta: "mode / quiz", href: "/games/reaction-time", icon: Sparkles },
];

export default function GamesPage() {
    const [selectedId, setSelectedId] = useState(GAMES[0].id);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { activeRoomCode } = useMultiplayer();

    const selectedGame = GAMES.find((game) => game.id === selectedId) ?? GAMES[0];

    return (
        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#181818] text-white select-none">
            <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4">
                <Link href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
                    <ArrowLeft size={14} /> Dashboard
                </Link>
                <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] text-[#929292]">
                    <User size={18} />
                </Link>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-36 pt-8">
                <div className="mb-8">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXATHON / GAMES / LOUNGE</p>
                    <h1 className="mt-3 font-sans text-[32px] uppercase tracking-[0.02em]">Choose operational mode</h1>
                </div>

                <ul className="border border-[#2e2e2e]">
                    {GAMES.map((game) => {
                        const Icon = game.icon;
                        const isSelected = game.id === selectedId;
                        return (
                            <li key={game.id}>
                                <button type="button" onClick={() => setSelectedId(game.id)} className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 border border-[#2e2e2e] px-4 py-4 text-left ${isSelected ? "bg-[#ff6a6a] text-[#171717]" : "bg-[#181818]"}`}>
                                    <span className={`grid h-11 w-11 place-items-center border ${isSelected ? "border-[#171717]/30" : "border-[#2e2e2e]"}`}><Icon size={20} /></span>
                                    <div>
                                        <span className="block font-sans text-[16px] uppercase tracking-[0.04em]">{game.title}</span>
                                        <span className="block font-mono text-[10px] uppercase tracking-[0.14em]">{game.meta}</span>
                                    </div>
                                    <Plus size={18} className={isSelected ? "rotate-45" : ""} />
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <button type="button" onClick={() => setIsModalOpen(true)} className="mt-6 flex min-h-[58px] w-full items-center justify-center border border-[rgba(222,247,103,0.5)] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767]">
                    Initialize {selectedGame.title}
                </button>
            </section>

            {/* Mode Split Intercept Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md border border-[#2e2e2e] bg-[#171717] p-6 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-[#5b5b5b] hover:text-white"><X size={16} /></button>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b] mb-1">MODE ROUTING INTERCEPT</p>
                        <h3 className="font-sans text-xl uppercase tracking-[0.04em] mb-4">Select Deployment Layer</h3>
                        
                        <div className="space-y-3">
                            <Link href={`${selectedGame.href}?mode=singleplayer`} className="block w-full text-center border border-[#2e2e2e] bg-[#181818] py-4 font-mono text-[11px] uppercase tracking-[0.14em] hover:border-[#ff6a6a]">
                                [ Mode A ] Local Sandbox (Singleplayer)
                            </Link>

                            {activeRoomCode ? (
                                <Link href={`/room/${activeRoomCode}`} className="block w-full text-center border border-[rgba(222,247,103,0.5)] bg-[#181818] py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] hover:bg-[#DEF767] hover:text-[#171717]">
                                    [ Mode B ] Broadcast to Linked Room ({activeRoomCode})
                                </Link>
                            ) : (
                                <button onClick={() => alert('Operational Failure: No active room key mapped. Deploy or sync a room from the dashboard topology first.')} className="block w-full text-center border border-[#2e2e2e] opacity-40 cursor-not-allowed bg-[#181818]/50 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                    [ Mode B ] Multiplayer (No Linked Room Detected)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

```

---

### File: `app/games/persona-flow/config.tsx`

```tsx

```

---

### File: `app/games/reaction-time/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const reactionTimeConfig = {
  id: "reaction-time",
  name: "Reaction Time",
  description: "Click when the signal turns live. Lower milliseconds wins.",
  category: "reflex" as const,
  scoring: { strategy: "lowest" as const, unit: "ms" },
  realtime: false,
  leaderboard: true,
  rounds: 5,
  component: lazy(() => import("./page")),
};

export function initReactionTime() {
  registerGame(reactionTimeConfig);
}

```

---

### File: `app/games/reaction-time/page.tsx`

```tsx
"use client";

import React from "react";
import { GameShell, GameStats, gameButtonPrimary, gameButtonSecondary } from "../_components/GameShell";

type Phase = "idle" | "waiting" | "ready" | "false_start" | "round_result" | "complete";

const ROUNDS = 5;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 4000;

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
}

function averageMs(times: number[]) {
  if (times.length === 0) return 0;
  return Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
}

function ReactionTimeGame() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [attempt, setAttempt] = React.useState(0);
  const [times, setTimes] = React.useState<number[]>([]);
  const [lastMs, setLastMs] = React.useState<number | null>(null);
  const [bestAverage, setBestAverage] = React.useState<number | null>(null);

  const readyAtRef = React.useRef<number>(0);
  const delayTimerRef = React.useRef<number | null>(null);

  const clearDelayTimer = React.useCallback(() => {
    if (delayTimerRef.current !== null) {
      window.clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearDelayTimer();
  }, [clearDelayTimer]);

  const beginWaiting = React.useCallback(() => {
    clearDelayTimer();
    setPhase("waiting");

    delayTimerRef.current = window.setTimeout(() => {
      readyAtRef.current = performance.now();
      setPhase("ready");
      delayTimerRef.current = null;
    }, randomDelay());
  }, [clearDelayTimer]);

  const handleStart = React.useCallback(() => {
    setAttempt(1);
    setTimes([]);
    setLastMs(null);
    beginWaiting();
  }, [beginWaiting]);

  const handleReset = React.useCallback(() => {
    clearDelayTimer();
    setPhase("idle");
    setAttempt(0);
    setTimes([]);
    setLastMs(null);
  }, [clearDelayTimer]);

  const handlePanelClick = React.useCallback(() => {
    if (phase === "idle") {
      handleStart();
      return;
    }

    if (phase === "waiting") {
      clearDelayTimer();
      setPhase("false_start");
      return;
    }

    if (phase === "ready") {
      const ms = Math.round(performance.now() - readyAtRef.current);
      setLastMs(ms);
      setTimes((current) => [...current, ms]);
      setPhase("round_result");
      return;
    }

    if (phase === "false_start") {
      beginWaiting();
      return;
    }

    if (phase === "round_result") {
      if (attempt >= ROUNDS) {
        setTimes((current) => {
          const avg = averageMs(current);
          setBestAverage((best) => (best === null ? avg : Math.min(best, avg)));
          return current;
        });
        setPhase("complete");
        return;
      }

      setAttempt((value) => value + 1);
      beginWaiting();
      return;
    }

    if (phase === "complete") {
      handleStart();
    }
  }, [attempt, beginWaiting, clearDelayTimer, handleStart, phase]);

  const currentAverage = averageMs(times);

  const panelLabel = (() => {
    switch (phase) {
      case "idle":
        return { kicker: "signal / idle", title: "Click to begin", hint: `${ROUNDS} attempts — wait for live` };
      case "waiting":
        return { kicker: "signal / hold", title: "Wait for live", hint: "do not click yet" };
      case "ready":
        return { kicker: "signal / live", title: "Click now", hint: "capture your reaction" };
      case "false_start":
        return { kicker: "signal / fault", title: "Too soon", hint: "click to retry this attempt" };
      case "round_result":
        return {
          kicker: `attempt / ${attempt} of ${ROUNDS}`,
          title: lastMs !== null ? `${lastMs} ms` : "—",
          hint: attempt >= ROUNDS ? "click for average" : "click for next signal",
        };
      case "complete":
        return {
          kicker: "session / complete",
          title: `${currentAverage} ms`,
          hint: "average reaction — click to run again",
        };
      default:
        return { kicker: "", title: "", hint: "" };
    }
  })();

  const panelTone =
    phase === "ready"
      ? "border-[rgba(222,247,103,0.5)] bg-[#171717]"
      : phase === "waiting"
        ? "border-[#ff6a6a] bg-[#171717]"
        : phase === "false_start"
          ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]"
          : "border-[#2e2e2e] bg-[#181818]";

  const titleTone =
    phase === "false_start"
      ? "text-[#171717]"
      : phase === "ready"
        ? "text-[#DEF767]"
        : phase === "waiting"
          ? "text-[#ff6a6a]"
          : "text-white";

  const metaTone = phase === "false_start" ? "text-[#171717]/70" : "text-[#5b5b5b]";
  const hintTone = phase === "false_start" ? "text-[#171717]/80" : "text-[#929292]";

  return (
    <>
      <GameStats
        levelLabel="attempt"
        levelValue={phase === "idle" || phase === "complete" ? "—" : `${Math.min(attempt, ROUNDS)}/${ROUNDS}`}
        bestLabel="best avg"
        bestValue={bestAverage !== null ? `${bestAverage} ms` : "—"}
      />

      <button
        type="button"
        onClick={handlePanelClick}
        aria-label={panelLabel.title}
        className={`flex min-h-[min(48vh,380px)] w-full flex-col items-center justify-center gap-4 border px-6 py-10 text-center transition-colors ${panelTone} cursor-pointer active:border-[rgba(222,247,103,0.5)]`}
      >
        <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${metaTone}`}>{panelLabel.kicker}</p>
        <p className={`font-sans text-5xl uppercase leading-[0.95] tracking-[0.02em] sm:text-6xl ${titleTone}`}>
          {panelLabel.title}
        </p>
        <p className={`max-w-[28ch] text-[13px] leading-6 ${hintTone}`}>{panelLabel.hint}</p>
      </button>

      {times.length > 0 && phase !== "idle" && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {times.map((ms, index) => (
            <span
              key={`${index}-${ms}`}
              className="border border-[#2e2e2e] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]"
            >
              {index + 1}: {ms} ms
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        {phase === "idle" && (
          <button type="button" onClick={handleStart} className={gameButtonPrimary}>
            start
          </button>
        )}
        {phase !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        )}
      </div>
    </>
  );
}

export default function ReactionTimePage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / REACTION"
      title="Reaction Time"
      description="Wait for the live signal, then click as fast as you can."
    >
      <ReactionTimeGame />
    </GameShell>
  );
}

```

---

### File: `app/games/registry.ts`

```typescript
import { GameDefinition } from "./types";

// 1. Import all your game configurations directly
import { chimpConfig } from "./chimp/config";
import { numberMemoryConfig } from "./number-memory/config";
import { reactionTimeConfig } from "./reaction-time/config";
import { sequenceMemoryConfig } from "./sequence-memory/config";
// import { personaFlowConfig } from "./persona-flow/config";


const gameRegistry = new Map<string, GameDefinition>();
// 2. Auto-register them into the Map immediately
const coreGames = [
  chimpConfig,
  numberMemoryConfig,
  reactionTimeConfig,
  sequenceMemoryConfig,
];

coreGames.forEach((config) => {
  gameRegistry.set(config.id, config);
});

// Keep the dynamic register function just in case you need it later
export function registerGame(definition: GameDefinition): void {
  gameRegistry.set(definition.id, definition);
}

export function getGame(id: string): GameDefinition | undefined {
  return gameRegistry.get(id);
}

export function getAllGames(): GameDefinition[] {
  return Array.from(gameRegistry.values());
}

```

---

### File: `app/games/sequence-memory/config.tsx`

```tsx
import { lazy } from "react";
import { registerGame } from "../registry";

export const sequenceMemoryConfig = {
  id: "sequence-memory",
  name: "Sequence Memory",
  description: "Watch the pattern and reproduce it. Levels get progressively longer.",
  category: "cognitive" as const,
  scoring: { strategy: "highest" as const, unit: "level" },
  realtime: false,
  leaderboard: true,
  rounds: 99,
  component: lazy(() => import("./page")),
};

export function initSequenceMemory() {
  registerGame(sequenceMemoryConfig);
}

```

---

### File: `app/games/sequence-memory/page.tsx`

```tsx
"use client";

import React from "react";
import {
  GamePanel,
  GameShell,
  GameStats,
  gameButtonPrimary,
  gameButtonSecondary,
} from "../_components/GameShell";

const GRID_SIZE = 3;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BASE_INTERVAL = 700;
const MIN_INTERVAL = 300;

type Mode = "idle" | "showing" | "input" | "success" | "fail";

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function SequenceMemoryGame() {
  const [level, setLevel] = React.useState(1);
  const [mode, setMode] = React.useState<Mode>("idle");
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [highlightIndex, setHighlightIndex] = React.useState<number | null>(null);
  const [bestLevel, setBestLevel] = React.useState(0);

  const timersRef = React.useRef<number[]>([]);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const intervalForLevel = React.useCallback((lvl: number) => {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - (lvl - 1) * 60);
  }, []);

  const generateSequence = React.useCallback((lvl: number) => {
    const seq: number[] = [];
    for (let i = 0; i < lvl; i++) seq.push(randInt(CELL_COUNT));
    return seq;
  }, []);

  const beginRound = React.useCallback(
    (startLevel = level) => {
      clearTimers();
      const lvl = startLevel;
      const seq = generateSequence(lvl);
      setSequence(seq);
      setProgress(0);
      setMode("showing");

      const interval = intervalForLevel(lvl);
      seq.forEach((cell, idx) => {
        const show = window.setTimeout(() => {
          setHighlightIndex(cell);
        }, idx * (interval + 220));

        const hide = window.setTimeout(() => {
          setHighlightIndex(null);
          if (idx === seq.length - 1) {
            setMode("input");
          }
        }, idx * (interval + 220) + interval);

        timersRef.current.push(show, hide);
      });
    },
    [clearTimers, generateSequence, intervalForLevel, level],
  );

  const handleCellClick = React.useCallback(
    (index: number) => {
      if (mode !== "input") return;
      const expected = sequence[progress];
      if (index === expected) {
        const nextProg = progress + 1;
        setProgress(nextProg);
        if (nextProg >= sequence.length) {
          setMode("success");
          setBestLevel((b) => Math.max(b, level));
          const t = window.setTimeout(() => {
            setLevel((l) => l + 1);
            beginRound(level + 1);
          }, 700);
          timersRef.current.push(t);
        }
      } else {
        setMode("fail");
        setBestLevel((b) => Math.max(b, level));
      }
    },
    [mode, sequence, progress, level, beginRound],
  );

  const handleStart = React.useCallback(() => {
    setLevel(1);
    setBestLevel((b) => Math.max(b, 1));
    beginRound(1);
  }, [beginRound]);

  const handleReset = React.useCallback(() => {
    clearTimers();
    setMode("idle");
    setSequence([]);
    setProgress(0);
    setHighlightIndex(null);
  }, [clearTimers]);

  const cellClass = (idx: number) => {
    const base =
      "flex h-20 w-20 items-center justify-center border border-[#2e2e2e] bg-[#181818] text-[#5b5b5b] select-none sm:h-24 sm:w-24";
    if (highlightIndex === idx) {
      return `${base} border-[rgba(222,247,103,0.5)] bg-[#DEF767] text-[#171717]`;
    }
    return base;
  };

  const statusText =
    mode === "showing"
      ? "watch the pattern"
      : mode === "input"
        ? "your turn"
        : mode === "success"
          ? "good — next level"
          : mode === "fail"
            ? "wrong"
            : "";

  return (
    <>
      <GameStats levelValue={level} bestValue={bestLevel || "—"} />

      <GamePanel>
        {mode === "idle" ? (
          <div className="flex flex-col items-center gap-6 py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">reproduce the pattern</p>
            <button type="button" onClick={handleStart} className={gameButtonPrimary}>
              start
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{statusText}</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: CELL_COUNT }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCellClick(idx)}
                  className={cellClass(idx)}
                  aria-label={`cell-${idx}`}
                />
              ))}
            </div>
          </div>
        )}
      </GamePanel>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {mode === "fail" && (
          <button type="button" onClick={() => beginRound(level)} className={gameButtonPrimary}>
            retry
          </button>
        )}
        {mode !== "idle" && (
          <button type="button" onClick={handleReset} className={gameButtonSecondary}>
            reset
          </button>
        )}
      </div>
    </>
  );
}

export default function SequenceMemoryPage() {
  return (
    <GameShell
      meta="UXATHON / GAMES / SEQUENCE"
      title="Sequence Memory"
      description="Reproduce the pattern. Difficulty increases each level."
    >
      <SequenceMemoryGame />
    </GameShell>
  );
}

```

---

### File: `app/games/types.ts`

```typescript
export type ScoringStrategy = 'lowest' | 'highest' | 'accumulated';

export interface GameScoring {
  strategy: ScoringStrategy;
  unit: string;
}

export interface GameDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'cognitive' | 'reflex' | 'design' | 'accessibility';
  scoring: GameScoring;
  realtime: boolean;
  leaderboard: boolean;
  rounds: number;
  component: React.ComponentType<any>;
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

```

---

### File: `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-sans;
}

```

---

### File: `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/token-context";
import { ApolloWrapper } from "@/apis/hasura/AppoloClient";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "UXathon - Uxism",
    description: "Uxism is a platform that connects UX designers with companies.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
            <ApolloWrapper>
                <AuthProvider>
                    <body className="min-h-full flex flex-col">{children}</body>
                </AuthProvider>
            </ApolloWrapper>
        </html>
    );
}

```

---

### File: `app/live/page.tsx`

```tsx
"use client";
import { FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { gql } from "@apollo/client";
import { useMutation, useSubscription } from "@apollo/client/react";
import { ArrowLeft, ArrowUp, MessageCircle, Plus, Send, Smile, Users, X } from "lucide-react";

const REACTIONS = [
    { id: "heart", emoji: "❤️", label: "Heart" },
    { id: "thumbs", emoji: "👍", label: "Thumbs up" },
    { id: "raise", emoji: "🙋", label: "Hand raise" },
] as const;

type FloatingReaction = {
    id: string;
    emoji: string;
};

type PollOption = {
    id: string;
    option: string;
};

type LivePoll = {
    id: string;
    title: string;
    created_at: string;
    ends_at: string;
    poll_options: PollOption[];
};

const MUTATION_CREATE_QUESTION = gql`
    mutation CreateQuestion($sessionId: uuid!, $question: String!) {
        insert_live_questions_one(object: { session_id: $sessionId, question: $question }) {
            question
        }
    }
`;

const POLL_SUBSCRIPTION = gql`
    subscription PollSubscription($sessionId: uuid!) {
        live_polls(where: { session_id: { _eq: $sessionId } }, order_by: { created_at: asc }) {
            id
            title
            created_at
            ends_at
            poll_options {
                id
                option
            }
        }
    }
`;

const VOTE_MUTATION = gql`
    mutation Vote($pollOptionId: uuid!, $pollId: uuid!) {
        insert_live_user_votes_one(object: { option_id: $pollOptionId, poll_id: $pollId }) {
            id
        }
    }
`;

const CHAT_SUBSCRIPTION = gql`
    subscription ChatSubsScription($sessionId: uuid!) {
        live_chat(order_by: { created_at: desc }, where: { session_id: { _eq: $sessionId } }) {
            user {
                name
                profile_picture
            }
            message
        }
    }
`;

const GET_ACTIVE_SESSION = gql`
    subscription GetActiveSession {
        live_sessions(order_by: { started_at: desc }, where: { active: { _eq: true } }, limit: 1) {
            id
            started_at
        }
    }
`;

const MUTATION_ADD_MESSAGE = gql`
    mutation AddMessage($sessionId: uuid!, $message: String!) {
        insert_live_chat_one(object: { session_id: $sessionId, message: $message }) {
            message
        }
    }
`;

type LiveSession = {
    id: string;
    started_at: string;
};

type ChatItem = {
    user: {
        name: string | null;
        profile_picture: string | null;
    } | null;
    message: string;
};

type ActiveSessionData = {
    live_sessions: LiveSession[];
};

type ChatSubscriptionData = {
    live_chat: ChatItem[];
};

type PollSubscriptionData = {
    live_polls: LivePoll[];
};

type AddMessageVariables = {
    sessionId: string;
    message: string;
};

type VoteVariables = {
    pollOptionId: string;
    pollId: string;
};

type VotedOptionByPoll = Record<string, string>;

function getInitials(name?: string | null) {
    if (!name || !name.trim()) return "UX";

    return name
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function normalizeMessages(items?: ChatItem[]) {
    return items?.slice().reverse() ?? [];
}

function getVoteStorageKey(sessionId: string) {
    return `uxism-live-votes:${sessionId}`;
}

function subscribeVoteStorage(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);

    return () => window.removeEventListener("storage", onStoreChange);
}

function readStoredVotes(sessionId?: string) {
    if (!sessionId || typeof window === "undefined") return "{}";

    return window.localStorage.getItem(getVoteStorageKey(sessionId)) ?? "{}";
}

function parseStoredVotes(value: string): VotedOptionByPoll {
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function getPollProgress(poll: LivePoll, currentTime: number) {
    const startTime = new Date(poll.created_at).getTime();
    const endTime = new Date(poll.ends_at).getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return 100;

    return Math.min(100, Math.max(0, ((currentTime - startTime) / (endTime - startTime)) * 100));
}

function getSecondsRemaining(endsAt: string, currentTime: number) {
    const endTime = new Date(endsAt).getTime();

    if (!Number.isFinite(endTime)) return 0;

    return Math.max(0, Math.ceil((endTime - currentTime) / 1000));
}

export default function LivePage() {
    const [input, setInput] = useState("");
    const [reactionsOpen, setReactionsOpen] = useState(false);
    const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [voteLocksBySession, setVoteLocksBySession] = useState<Record<string, VotedOptionByPoll>>({});
    const [pendingPollIds, setPendingPollIds] = useState<Set<string>>(() => new Set());
    const [questionOpen, setQuestionOpen] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [questionSent, setQuestionSent] = useState(false);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const reactionsRef = useRef<HTMLDivElement | null>(null);
    const reactionIdRef = useRef(0);
    const questionResetRef = useRef<number | null>(null);

    const { data: sessionData, loading: sessionLoading, error: sessionError } = useSubscription<ActiveSessionData>(GET_ACTIVE_SESSION);
    const [createQuestion] = useMutation(MUTATION_CREATE_QUESTION);

    const activeSession = sessionData?.live_sessions?.[0] ?? null;
    const activeSessionId = activeSession?.id;

    const {
        data,
        loading: messagesLoading,
        error: messagesError,
    } = useSubscription<ChatSubscriptionData>(CHAT_SUBSCRIPTION, {
        skip: !activeSessionId,
        variables: activeSessionId ? { sessionId: activeSessionId } : undefined,
    });

    const {
        data: pollData,
        loading: pollsLoading,
        error: pollsError,
    } = useSubscription<PollSubscriptionData>(POLL_SUBSCRIPTION, {
        skip: !activeSessionId,
        variables: activeSessionId ? { sessionId: activeSessionId } : undefined,
    });

    const [addMessage, { loading: addMessageLoading, error: addMessageError }] = useMutation<unknown, AddMessageVariables>(MUTATION_ADD_MESSAGE);
    const [vote, { error: voteError }] = useMutation<unknown, VoteVariables>(VOTE_MUTATION);

    const storedVoteSnapshot = useSyncExternalStore(
        subscribeVoteStorage,
        () => readStoredVotes(activeSessionId),
        () => "{}",
    );
    const storedVotedOptionByPoll = useMemo(() => parseStoredVotes(storedVoteSnapshot), [storedVoteSnapshot]);
    const votedOptionByPoll = useMemo(() => {
        return { ...storedVotedOptionByPoll, ...(activeSessionId ? voteLocksBySession[activeSessionId] : undefined) };
    }, [activeSessionId, storedVotedOptionByPoll, voteLocksBySession]);
    const messages = useMemo(() => normalizeMessages(data?.live_chat), [data?.live_chat]);
    const activePolls = useMemo(() => {
        return (
            pollData?.live_polls?.filter((poll) => {
                const endTime = new Date(poll.ends_at).getTime();

                return Number.isFinite(endTime) && currentTime < endTime;
            }) ?? []
        );
    }, [currentTime, pollData?.live_polls]);
    const hasStackedPolls = activePolls.length > 1;
    const visibleUserCount = useMemo(() => Math.max(1, messages.length), [messages.length]);

    const errorMessage = sessionError?.message || messagesError?.message || addMessageError?.message || null;
    const pollErrorMessage = pollsError?.message || voteError?.message || null;

    const statusText = sessionLoading ? "loading session" : errorMessage ? "error" : !activeSessionId ? "no active session" : messagesLoading ? "loading messages" : pollsLoading ? "loading polls" : "live";

    useEffect(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
    }, [messages.length]);

    useEffect(() => {
        const interval = window.setInterval(() => setCurrentTime(Date.now()), 250);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        return () => {
            if (questionResetRef.current) window.clearTimeout(questionResetRef.current);
        };
    }, []);

    useEffect(() => {
        if (!reactionsOpen) return;

        function handlePointerDown(event: MouseEvent | TouchEvent) {
            if (!reactionsRef.current?.contains(event.target as Node)) {
                setReactionsOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [reactionsOpen]);

    function triggerReaction(emoji: string) {
        reactionIdRef.current += 1;
        const id = `reaction-${reactionIdRef.current}`;
        setFloatingReactions((prev) => [...prev, { id, emoji }]);
        setReactionsOpen(false);
        window.setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
        }, 1800);
    }

    async function sendMessage(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const message = input.trim();
        if (!message || !activeSessionId || addMessageLoading) return;

        await addMessage({ variables: { sessionId: activeSessionId, message } });
        setInput("");
    }

    async function submitVote(poll: LivePoll, optionId: string) {
        if (!activeSessionId || votedOptionByPoll[poll.id] || pendingPollIds.has(poll.id)) return;

        const endTime = new Date(poll.ends_at).getTime();
        if (!Number.isFinite(endTime) || currentTime >= endTime) return;

        setPendingPollIds((prev) => new Set(prev).add(poll.id));

        try {
            await vote({ variables: { pollId: poll.id, pollOptionId: optionId } });

            setVoteLocksBySession((prev) => {
                const nextSessionVotes = { ...(prev[activeSessionId] ?? {}), [poll.id]: optionId };

                try {
                    window.localStorage.setItem(getVoteStorageKey(activeSessionId), JSON.stringify(nextSessionVotes));
                } catch {
                    // Local storage is only a UI lock; the backend vote mutation is the source of truth.
                }

                return { ...prev, [activeSessionId]: nextSessionVotes };
            });
        } finally {
            setPendingPollIds((prev) => {
                const next = new Set(prev);
                next.delete(poll.id);
                return next;
            });
        }
    }

    function scrollToLatest() {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }

    function closeQuestionBox() {
        if (questionResetRef.current) window.clearTimeout(questionResetRef.current);
        setQuestionOpen(false);
        setQuestionSent(false);
        setQuestionText("");
    }

    // function sendQuestion(event: FormEvent<HTMLFormElement>) {
    //     event.preventDefault();

    //     if (!questionText.trim() || questionSent) return;

    //     setQuestionText("");
    //     createQuestion({ variables: { sessionId: activeSessionId!, question: questionText.trim() } }).then(() => {
    //         setQuestionSent(true);
    //     });

    //     questionResetRef.current = window.setTimeout(() => {
    //         setQuestionOpen(false);
    //         setQuestionSent(false);
    //     }, 1400);
    // }


    function sendQuestion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Add the activeSessionId check here!
        if (!questionText.trim() || questionSent || !activeSessionId) return;

        setQuestionText("");
        createQuestion({ variables: { sessionId: activeSessionId, question: questionText.trim() } }).then(() => {
            setQuestionSent(true);
        });

        questionResetRef.current = window.setTimeout(() => {
            setQuestionOpen(false);
            setQuestionSent(false);
        }, 1400);
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

    

    

    return (
        <main className="h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 z-30 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 z-30 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 left-4 z-30 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 right-4 z-30 h-5 w-5 border-b border-r border-[#5b5b5b]" />

            <div className="pointer-events-none fixed left-1/2 top-[-140px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-25 blur-3xl" />

            {(activePolls.length > 0 || pollErrorMessage) && (
                <div className={`fixed left-5 right-5 top-5 z-40 mx-auto flex max-w-3xl flex-col overflow-y-auto sm:left-8 sm:right-8 ${hasStackedPolls ? "max-h-[68vh] gap-2" : "max-h-[52vh] gap-3"}`}>
                    {pollErrorMessage && <div className="border border-[#2e2e2e] bg-[#171717] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#ff6a6a]">poll / {pollErrorMessage}</div>}

                    {activePolls.map((poll) => (
                        <LivePollPanel key={poll.id} poll={poll} currentTime={currentTime} selectedOptionId={votedOptionByPoll[poll.id]} isPending={pendingPollIds.has(poll.id)} compact={hasStackedPolls} onVote={submitVote} />
                    ))}
                </div>
            )}

            <section className="relative z-10 mx-auto grid h-screen w-full max-w-5xl grid-rows-[1fr] px-5 py-5 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
                <div className="grid min-h-0 grid-rows-[auto_1fr_auto] lg:max-w-[75%]">
                    <header className="relative z-20 border-b border-[#2e2e2e] bg-[#181818]/95 pb-4 pt-2">
                        <nav className="flex items-center justify-between gap-4">
                            <a href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                <ArrowLeft size={15} />
                                Dashboard
                            </a>

                            <div className="flex items-center gap-3">
                                <div className="hidden h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] sm:flex">
                                    <Users size={15} />
                                    {visibleUserCount} Users
                                </div>

                                <button type="button" onClick={scrollToLatest} className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]" aria-label="Scroll to latest message">
                                    <ArrowUp className="rotate-180" size={17} />
                                </button>
                            </div>
                        </nav>

                        <div className="mt-7 flex items-end justify-between gap-6">
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LIVE CHAT / EVENT ROOM</p>
                                <h1 className="mt-3 font-sans text-[36px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[48px]">Signal Room</h1>
                            </div>

                            <div className="hidden text-right font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:block">
                                <p>feed / public</p>
                                <p>state / {statusText}</p>
                            </div>
                        </div>

                        {activeSessionId && <div className="mt-4 truncate border border-[#2e2e2e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">Session is Active</div>}
                    </header>

                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-x border-[#2e2e2e] bg-[#171717]/70">
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-20 bg-gradient-to-b from-[#181818] via-[#181818]/75 to-transparent backdrop-blur-[2px]" />

                        <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto overscroll-contain px-0 pb-4 pt-4">
                            <div className="mt-auto flex min-h-min flex-col">
                                {sessionLoading && <SystemMessage title="Loading session" body="Checking for the latest active live session." />}
                                {errorMessage && <SystemMessage title="Connection error" body={errorMessage} tone="error" />}
                                {!sessionLoading && !errorMessage && !activeSessionId && <SystemMessage title="No active session" body="Create or activate a live session before messages can appear." />}
                                {activeSessionId && messagesLoading && <SystemMessage title="Loading messages" body="Reading live chat feed." />}
                                {activeSessionId && !messagesLoading && messages.length === 0 && <SystemMessage title="No messages yet" body="Send the first message to start the room signal." />}

                                {messages.map((chat, index) => {
                                    const name = chat.user?.name || "Unknown User";
                                    const profilePicture = chat.user?.profile_picture || "";

                                    return (
                                        <article key={`${index}-${name}-${chat.message}`} className="grid animate-[fadeInUp_260ms_ease-out] grid-cols-[48px_1fr] gap-3 border-b border-[#2e2e2e] px-4 py-4 sm:grid-cols-[56px_1fr] sm:px-5">
                                            {profilePicture ? <img src={getImageUrl(profilePicture)} alt={`${name} avatar`} className="h-10 w-10 border border-[#2e2e2e] object-cover sm:h-11 sm:w-11" /> : <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[11px] uppercase tracking-[0.08em] text-[#ff6a6a] sm:h-11 sm:w-11">{getInitials(name)}</div>}

                                            <div className="min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h2 className="truncate font-sans text-[16px] uppercase tracking-[0.04em] text-white">{name}</h2>
                                                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">participant</p>
                                                    </div>

                                                    {index === messages.length - 1 && <span className="shrink-0 border border-[rgba(222,247,103,0.5)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#DEF767]">Latest</span>}
                                                </div>

                                                <p className="mt-3 break-words text-[13px] leading-6 text-[#929292]">{chat.message}</p>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={sendMessage} className="relative z-20 shrink-0 border-t border-[#2e2e2e] bg-[#181818] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4">
                        <div className="flex items-stretch gap-2">
                            <div ref={reactionsRef} className="relative shrink-0 self-end">
                                {floatingReactions.map((reaction, index) => (
                                    <span key={reaction.id} className="pointer-events-none absolute bottom-full left-1/2 z-30 -translate-x-1/2 animate-[reactionFloat_1.8s_ease-out_forwards] text-[22px]" style={{ marginBottom: 8 + index * 6 }} aria-hidden>
                                        {reaction.emoji}
                                    </span>
                                ))}

                                {reactionsOpen && (
                                    <div className="absolute bottom-full left-0 z-40 mb-2 flex flex-col-reverse gap-1.5 border border-[#2e2e2e] bg-[#171717] p-1.5" role="menu" aria-label="Reactions">
                                        {REACTIONS.map((reaction) => (
                                            <button key={reaction.id} type="button" role="menuitem" onClick={() => triggerReaction(reaction.emoji)} className="grid h-11 w-11 place-items-center text-[22px] active:bg-[#ff6a6a]" aria-label={reaction.label}>
                                                {reaction.emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button type="button" onClick={() => setReactionsOpen((open) => !open)} className={`grid h-[58px] w-12 place-items-center border bg-[#171717] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] ${reactionsOpen ? "border-[rgba(222,247,103,0.5)] text-[#DEF767]" : "border-[#2e2e2e]"}`} aria-label="Add reaction" aria-expanded={reactionsOpen} aria-haspopup="menu">
                                    <Smile size={20} aria-hidden />
                                </button>
                            </div>

                            <div className="flex min-h-[58px] min-w-0 flex-1 border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
                                <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={activeSessionId ? "Type message to everyone" : "No active session"} disabled={!activeSessionId || addMessageLoading} className="h-[58px] min-w-0 flex-1 bg-transparent px-4 text-[13px] leading-6 text-white outline-none placeholder:text-[#5b5b5b] disabled:cursor-not-allowed disabled:text-[#5b5b5b]" maxLength={500} />

                                <button type="submit" disabled={!activeSessionId || addMessageLoading || input.trim().length === 0} className="grid w-14 shrink-0 place-items-center border-l border-[#2e2e2e] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]" aria-label="Send message">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                            <span>{addMessageLoading ? "sending" : "public channel"}</span>
                            <span>{input.length}/500</span>
                        </div>
                    </form>
                </div>

                <aside className="pointer-events-none fixed bottom-6 right-5 hidden flex-col gap-4 lg:flex">
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)]">
                        <Plus size={17} />
                    </button>

                    <button type="button" onClick={scrollToLatest} className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]">
                        <ArrowUp className="rotate-180" size={17} />
                    </button>
                </aside>
            </section>

            <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end">
                {questionOpen && (
                    <div className="mb-3 w-[min(calc(100vw-40px),320px)] border border-[#2e2e2e] bg-[#181818]">
                        <div className="flex h-11 items-center justify-between border-b border-[#2e2e2e] px-3">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292]">ask / live question</p>
                            <button type="button" onClick={closeQuestionBox} className="grid h-8 w-8 place-items-center text-[#929292] active:bg-[#ff6a6a] active:text-[#171717]" aria-label="Close question box">
                                <X size={15} />
                            </button>
                        </div>

                        {questionSent ? (
                            <div className="px-4 py-5">
                                <p className="font-sans text-[18px] uppercase leading-tight tracking-[0.04em] text-white">Question Sent</p>
                                <p className="mt-2 text-[13px] leading-5 text-[#929292]">Your question has been sent.</p>
                            </div>
                        ) : (
                            <form onSubmit={sendQuestion} className="p-3">
                                <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="Write your question" className="min-h-24 w-full resize-none border border-[#2e2e2e] bg-[#171717] px-3 py-3 text-[13px] leading-5 text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]" maxLength={240} />

                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">{questionText.length}/240</span>
                                    <button type="submit" disabled={questionText.trim().length === 0} className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] disabled:cursor-not-allowed disabled:opacity-30 active:bg-[#ff6a6a] active:text-[#171717]">
                                        <Send size={14} />
                                        Send
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {!questionOpen && (
                    <button type="button" onClick={() => setQuestionOpen(true)} className="flex h-10 items-center gap-2 rounded-[24px] border border-[#5b5b5b] bg-[#181818] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]" aria-label="Ask a question">
                        <MessageCircle size={15} />
                        Ask me a question
                    </button>
                )}
            </div>

            <style jsx global>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(14px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes reactionFloat {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, 12px) scale(0.85);
                    }
                    15% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -72px) scale(1.1);
                    }
                }
            `}</style>
        </main>
    );
}

function SystemMessage({ title, body, tone = "muted" }: { title: string; body: string; tone?: "muted" | "error" }) {
    return (
        <div className="border-b border-[#2e2e2e] px-4 py-5 sm:px-5">
            <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone === "error" ? "text-[#ff6a6a]" : "text-[#5b5b5b]"}`}>{title}</p>
            <p className="mt-2 text-[13px] leading-6 text-[#929292]">{body}</p>
        </div>
    );
}

function LivePollPanel({ poll, currentTime, selectedOptionId, isPending, compact, onVote }: { poll: LivePoll; currentTime: number; selectedOptionId?: string; isPending: boolean; compact: boolean; onVote: (poll: LivePoll, optionId: string) => void }) {
    const progress = getPollProgress(poll, currentTime);
    const secondsRemaining = getSecondsRemaining(poll.ends_at, currentTime);
    const hasVoted = Boolean(selectedOptionId);

    return (
        <section className="relative overflow-hidden border border-[#2e2e2e] bg-[#181818]/95 backdrop-blur-sm">
            <div className={`grid gap-3 px-4 sm:grid-cols-[1fr_auto] sm:items-start sm:px-5 ${compact ? "pb-3 pt-3" : "pb-5 pt-4"}`}>
                <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">poll / {hasVoted ? "vote locked" : isPending ? "sending vote" : `${secondsRemaining}s left`}</p>
                    <h2 className={`mt-2 break-words font-sans uppercase leading-[1.05] tracking-[0.04em] text-white ${compact ? "overflow-hidden text-[16px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1] sm:text-[18px]" : "text-[20px] sm:text-[24px]"}`}>{poll.title}</h2>
                </div>

                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b] sm:text-right">{poll.poll_options.length} options</p>
            </div>

            <div className={`grid gap-2 px-4 sm:grid-cols-2 sm:px-5 ${compact ? "pb-3" : "pb-5"}`}>
                {poll.poll_options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    const disabled = hasVoted || isPending;

                    return (
                        <button key={option.id} type="button" onClick={() => onVote(poll, option.id)} disabled={disabled} className={`border px-3 text-left transition-colors disabled:cursor-not-allowed ${compact ? "min-h-9 truncate py-2 text-[12px] leading-4" : "min-h-12 py-3 text-[13px] leading-5"} ${isSelected ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]" : "border-[#2e2e2e] bg-[#171717] text-[#929292] active:bg-[#ff6a6a] active:text-[#171717] disabled:text-[#5b5b5b]"}`} aria-pressed={isSelected}>
                            {option.option}
                        </button>
                    );
                })}
            </div>

            <div className="absolute bottom-0 left-0 h-1 bg-[#2e2e2e] right-0" aria-hidden>
                <div className="h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
            </div>
        </section>
    );
}

```

---

### File: `app/login/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Plus, Check } from "lucide-react";
import Field from "@/components/Field";
import { useAuth } from "@/context/token-context";

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

type LoginErrors = Partial<Record<keyof LoginForm, string> & { general?: string }>;

const initialLoginForm: LoginForm = {
    email: "",
    password: "",
    remember: false,
};

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLogin(form: LoginForm): LoginErrors {
    const errors: LoginErrors = {};

    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!validateEmail(form.email)) errors.email = "Enter a valid email address.";

    if (!form.password) errors.password = "Password is required.";
    else if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";

    return errors;
}

export default function UXISMLoginPage() {
    const [form, setForm] = useState<LoginForm>(initialLoginForm);
    const [errors, setErrors] = useState<LoginErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const auth = useAuth();

    function updateField<K extends keyof LoginForm>(key: K, value: LoginForm[K]) {
        const nextForm = { ...form, [key]: value };
        setForm(nextForm);
        setErrors((prevErrors) => ({ ...prevErrors, [key]: undefined }));
        // setErrors(validateLogin(nextForm));
    }

    function submitLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextErrors = validateLogin(form);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        const payload = {
            email: form.email.trim() ? form.email : undefined,
            password: form.password.trim() ? form.password : undefined,
        };

        setLoading(true);
        auth?.login({ email: payload.email, password: payload.password! })
            .then(() => {
                window.location.href = "/dashboard";
            })
            .catch((error) => {
                setErrors({ general: error.message || "Login failed. Please try again." });
            })
            .finally(() => setLoading(false));
    }

    return (
        <main className="min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 h-5 w-5 border-l border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed right-4 top-4 h-5 w-5 border-r border-t border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-5 w-5 border-b border-l border-[#5b5b5b]" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-5 w-5 border-b border-r border-[#5b5b5b]" />

            <div className="pointer-events-none fixed left-1/2 top-[-130px] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-30 blur-3xl" />

            <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-5xl px-5 py-8 md:px-10 lg:grid-cols-[1fr_160px] lg:gap-8">
                <div className="flex min-h-[calc(100vh-64px)] flex-col justify-between lg:max-w-[75%]">
                    <header className="space-y-8">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / LOGIN / 2026</p>
                                <h1 className="mt-3 max-w-[10ch] font-sans text-[42px] uppercase leading-[0.92] tracking-[0.02em] text-white sm:text-[56px]">Return to System</h1>
                            </div>

                            <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] transition-colors active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767] lg:hidden" aria-label="Open login map">
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="h-px w-full bg-[#2e2e2e]" />
                            <div className="h-px w-1/2 bg-[#DEF767]" />
                            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                                <span>01 / credential check</span>
                                <span>AUTH</span>
                            </div>
                        </div>
                    </header>

                    <div className="py-10 md:py-14">
                        <AnimatePresence mode="wait">
                            {!submitted ? (
                                <motion.form key="login-form" onSubmit={submitLogin} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="space-y-8">
                                    <div>
                                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">Access Slab</p>
                                        <h2 className="mt-2 font-sans text-2xl uppercase tracking-[0.04em] text-white">Login</h2>
                                        <p className="mt-3 max-w-md text-[13px] leading-6 text-[#929292]">Enter your registered credentials. The interface stays sparse; validation appears only when needed.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <Field label="Email" error={errors.email}>
                                            <input id="login-email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@domain.com" className="uxism-input" autoComplete="email" />
                                        </Field>

                                        <Field label="Password" error={errors.password}>
                                            <div className="flex border border-[#2e2e2e] bg-[#171717] focus-within:border-[rgba(222,247,103,0.5)]">
                                                <input id="login-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Minimum 8 characters" className="uxism-input border-0" type={showPassword ? "text" : "password"} autoComplete="current-password" />
                                                <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid w-14 place-items-center border-l border-[#2e2e2e] text-[#929292] active:bg-[#ff6a6a] active:text-[#171717]" aria-label={showPassword ? "Hide password" : "Show password"}>
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </Field>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border-y border-[#2e2e2e] py-4">
                                        <button type="button" onClick={() => updateField("remember", !form.remember)} className="flex items-center gap-3 text-left">
                                            <span className={`grid h-5 w-5 place-items-center border ${form.remember ? "border-[#ff6a6a] bg-[#ff6a6a] text-[#171717]" : "border-[#5b5b5b] text-transparent"}`}>
                                                <Check size={13} />
                                            </span>
                                            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">Remember access</span>
                                        </button>

                                        <button type="button" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b] active:text-[#DEF767]">
                                            Forgot key?
                                        </button>
                                    </div>

                                    <footer className="flex items-center justify-between gap-3 border-t border-[#2e2e2e] pt-5">
                                        <button type="button" className="h-11 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                            Create account
                                        </button>

                                        <button type="submit" className={`flex h-11 items-center gap-2 ${loading ? "bg-[#c6bbbb]" : "bg-[#ff6a6a]"} px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717]`}>
                                            Login <ArrowRight size={15} />
                                        </button>
                                    </footer>
                                </motion.form>
                            ) : (
                                <motion.div key="success" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="border border-[#2e2e2e] bg-[#171717] p-6">
                                    <div className="grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] text-[#DEF767]">
                                        <Check size={18} />
                                    </div>
                                    <h2 className="mt-6 font-sans text-2xl uppercase tracking-[0.04em] text-white">Access Captured</h2>
                                    <p className="mt-3 max-w-md text-[13px] leading-6 text-[#929292]">Login payload is ready. Replace the console log with your backend authentication request.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">x:20 / rail:protected / state:dark-first</div>
                </div>

                <aside className="pointer-events-none fixed bottom-6 right-5 hidden flex-col gap-4 lg:flex">
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[#5b5b5b] bg-[#181818] text-[#929292] active:border-[rgba(222,247,103,0.5)]">
                        <Plus size={17} />
                    </button>
                    <button type="button" className="pointer-events-auto grid h-10 w-10 place-items-center rounded-[24px] border border-[rgba(222,247,103,0.5)] bg-[#181818] text-[#DEF767]">
                        <ArrowRight size={17} />
                    </button>
                </aside>
            </section>

            <style jsx global>{`
                .uxism-input {
                    width: 100%;
                    height: 54px;
                    border: 1px solid #2e2e2e;
                    background: #171717;
                    padding: 0 16px;
                    color: #ffffff;
                    font-size: 13px;
                    line-height: 1.5;
                    outline: none;
                }

                .uxism-input::placeholder {
                    color: #5b5b5b;
                }

                .uxism-input:focus {
                    border-color: rgba(222, 247, 103, 0.5);
                }
            `}</style>
        </main>
    );
}

```

---

### File: `app/myteam/page.tsx`

```tsx


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Crown } from "lucide-react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "@/context/token-context";

const GET_MY_TEAM = gql`
  query GetMyTeam($userId: uuid!) {
    team_members(where: { user_id: { _eq: $userId } }) {
      id
      member_type
      team {
        id
        name
        created_at
        created_by
        team_members {
          id
          member_type
          user {
            id
            name
            profile_picture
          }
        }
      }
    }
  }
`;

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return "UX";
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function getImageUrl(imagePath?: string | null) {
  if (!imagePath) return "";
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  return `${backendUrl}/uploads/${imagePath}`;
}

type TeamMember = {
  id: string;
  member_type: string;
  user?: {
    id: string;
    name: string;
    profile_picture: string;
  };
};

type Team = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  team_members: TeamMember[];
};

export default function MyTeamPage() {
  const auth = useAuth();
  const authData = auth?.getData() as { id?: string };
  const userId = authData?.id;

  const { data, loading, error } = useQuery<{
    team_members: { id: string; member_type: string; team: Team }[];
  }>(GET_MY_TEAM, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: "network-only", // <-- always fetch fresh, don't use cache
  });

  console.log("data",data)

  // const myRecord = data?.team_members?.[0];
  // const team = myRecord?.team;
  // const members: TeamMember[] = team?.team_members ?? [];
  const myRecord = data?.team_members?.[0];
// Hasura is returning team as an array (misconfigured as array relationship)
// so we handle both cases defensively
// const team: Team | null = Array.isArray(myRecord?.team)
//   ? myRecord.team[0] ?? null
//   : myRecord?.team ?? null;


  const rawTeam = Array.isArray(myRecord?.team)
  ? myRecord.team[0] ?? null
  : myRecord?.team ?? null;

  const team: Team | null = rawTeam
  ? {
      ...rawTeam,
      team_members: Array.isArray(rawTeam.team_members)
        ? rawTeam.team_members
        : rawTeam.team_members
        ? [rawTeam.team_members]  // fallback if still object
        : [],
    }
  : null;

  console.log("team object:", JSON.stringify(team, null, 2));
// const members: TeamMember[] = Array.isArray(team?.team_members)
//   ? team.team_members
//   : [];

const members: TeamMember[] = team?.team_members ?? [];
  console.log("myRecord",myRecord)
  console.log("team",team)
  console.log("members",members)
  

  // Loading state
  if (loading || !userId) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
          Loading team data…
        </p>
      </main>
    );
  }

  // Error state — show full error message to help debug
  if (error) {
    return (
      <main className="relative min-h-screen bg-[#181818] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a]">
            GraphQL Error
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#929292]">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
      <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

      <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]"
        >
          <ArrowLeft size={14} aria-hidden />
          Dashboard
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
          My Team
        </p>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
        {!team ? (
          <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8 text-center">
            <p className="font-sans text-[20px] uppercase tracking-[0.04em] text-white">
              No Team Found
            </p>
            <p className="mt-2 text-[13px] text-[#929292]">
              You are not currently assigned to any team.
            </p>
            {/* Debug info — remove once working */}
            <p className="mt-4 font-mono text-[10px] text-[#5b5b5b]">
              user_id: {userId} | team_members returned:{" "}
              {data?.team_members?.length ?? 0}
            </p>
          </div>
        ) : (
          <>
            {/* Team Header */}
            <div className="border border-[#2e2e2e] bg-[#171717] px-6 py-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">
                TEAM PROFILE
              </p>
              <h1 className="mt-2 font-sans text-[32px] uppercase tracking-[0.04em] text-white">
                {team.name}
              </h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Created{" "}
                {new Date(team.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Members List */}
            <div className="border border-[#2e2e2e] bg-[#171717]">
              <div className="border-b border-[#2e2e2e] px-6 py-4 flex items-center justify-between">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">
                  Team Members
                </h2>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                  <Users size={14} />
                  <span>{members.length} Members</span>
                </div>
              </div>

              <div className="divide-y divide-[#2e2e2e]">
                {members.map((member) => {
                  const isLeader = member.user?.id === team.created_by;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-5"
                    >
                      <div className="flex items-center gap-4">
                        {member.user?.profile_picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getImageUrl(member.user.profile_picture)}
                            alt=""
                            className="h-12 w-12 border border-[#2e2e2e] object-cover"
                          />
                        ) : (
                          <div className="grid h-12 w-12 place-items-center border border-[#2e2e2e] bg-[#181818] font-mono text-[14px] uppercase tracking-[0.08em] text-[#ff6a6a]">
                            {getInitials(member.user?.name)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-sans text-[18px] uppercase tracking-[0.04em] text-white">
                              {member.user?.name || "Unknown User"}
                            </p>
                            {isLeader && (
                              <Crown
                                size={14}
                                className="text-[#DEF767]"
                                aria-label="Team Leader"
                              />
                            )}
                          </div>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                            {isLeader ? "LEADER" : member.member_type || "MEMBER"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

```

---

### File: `app/page.tsx`

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <div className="pointer-events-none fixed left-4 top-4 h-5 w-5 border-l border-t border-[#5b5b5b] sm:left-6 sm:top-6" />
            <div className="pointer-events-none fixed right-4 top-4 h-5 w-5 border-r border-t border-[#5b5b5b] sm:right-6 sm:top-6" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-5 w-5 border-b border-l border-[#5b5b5b] sm:bottom-6 sm:left-6" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-5 w-5 border-b border-r border-[#5b5b5b] sm:bottom-6 sm:right-6" />

            <div className="pointer-events-none fixed left-1/2 top-[-130px] h-[min(340px,80vw)] w-[min(340px,80vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_30%_30%,#46B1FF,transparent_35%),radial-gradient(circle_at_70%_40%,#A259FF,transparent_35%),radial-gradient(circle_at_50%_70%,#ff6a6a,transparent_38%),radial-gradient(circle_at_80%_80%,#DEF767,transparent_30%)] opacity-30 blur-3xl" />

            <section className="relative z-10 flex min-h-screen items-center justify-center px-5">
                <div className="flex w-full max-w-md flex-col items-center text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXISM / SPLASH / 2026</p>

                    <h1 className="mt-4 font-sans text-[clamp(2.5rem,12vw,4.5rem)] uppercase leading-[0.92] tracking-[0.02em] text-white">
                        UXATHON&apos;26
                    </h1>

                    <p className="mt-4 max-w-[28ch] text-[13px] leading-[1.5] text-[#929292]">
                        Edge AI experience lab. Enter the dashboard to begin.
                    </p>

                    <Link
                        href="/dashboard"
                        className="mt-8 flex h-11 w-full max-w-[240px] items-center justify-center gap-2 bg-[#ff6a6a] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717] sm:w-auto sm:min-w-[200px]"
                    >
                        Go to Dashboard
                        <ArrowRight size={14} aria-hidden />
                    </Link>
                </div>
            </section>
        </main>
    );
}

```

---

### File: `app/profile/page.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { ArrowLeft, Download, Pencil, Save, X } from "lucide-react";
import Field from "@/components/Field";
import { useAuth } from "@/context/token-context";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

const PROFILE_STORAGE_KEY = "uxathon-player-profile";
const UPDATE_PROFILE_MUTATION = gql`
    mutation UpdateProfile($userId: uuid!, $name: String, $email: String, $company: String, $skills: [String!]) {
        update_users_by_pk(pk_columns: { id: $userId }, _set: { name: $name, email: $email, company: $company, skills: $skills }) {
            id
        }
    }
`;

type UpdateProfileMutationData = {
    update_users_by_pk: {
        id: string;
    } | null;
};

type UpdateProfileMutationVariables = {
    userId: string;
    name?: string;
    email?: string;
    company?: string;
    skills?: string[];
};

type PlayerProfile = {
    name: string;
    email: string;
    phone: string;
    company: string;
    skills: string;
    avatarUrl: string;
};

type DecodedUserData = {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    skills?: string[] | string;
    avatarUrl?: string;
    profile_picture?: string;
};

const emptyProfile: PlayerProfile = {
    name: "",
    email: "",
    phone: "",
    company: "",
    skills: "",
    avatarUrl: "",
};

function loadProfile(): PlayerProfile {
    if (typeof window === "undefined") return emptyProfile;
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return emptyProfile;
        return { ...emptyProfile, ...JSON.parse(raw) };
    } catch {
        return emptyProfile;
    }
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "UX";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function parseSkills(skills: string) {
    return skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
}

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function decodeToProfile(data: unknown): Partial<PlayerProfile> {
    const decoded = (data || {}) as DecodedUserData;
    const skills = Array.isArray(decoded.skills) ? decoded.skills.join(", ") : readString(decoded.skills);

    return {
        name: readString(decoded.name),
        email: readString(decoded.email),
        phone: readString(decoded.phone),
        company: readString(decoded.company),
        skills,
        avatarUrl: readString(decoded.avatarUrl) || readString(decoded.profile_picture),
    };
}

export default function ProfilePage() {
    const auth = useAuth();
    const [updateProfile] = useMutation<UpdateProfileMutationData, UpdateProfileMutationVariables>(UPDATE_PROFILE_MUTATION);
    const cardRef = useRef<HTMLDivElement>(null);
    const [profile, setProfile] = useState<PlayerProfile>(emptyProfile);
    const [draft, setDraft] = useState<PlayerProfile>(emptyProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const saved = loadProfile();
        const decoded = decodeToProfile(auth.getData());
        const hasDecodedData = Object.values(decoded).some(Boolean);

        const base = hasDecodedData
            ? {
                  ...saved,
                  ...Object.fromEntries(Object.entries(decoded).filter(([, value]) => Boolean(value))),
              }
            : saved;

        queueMicrotask(() => {
            setProfile(base);
            setDraft(base);
            setHydrated(true);
        });
    }, [auth]);

    function startEditing() {
        setDraft(profile);
        setIsEditing(true);
    }

    function cancelEditing() {
        setDraft(profile);
        setIsEditing(false);
    }

    function getUserId(): string {
        const data = auth.getData() as {
            "https://hasura.io/jwt/claims"?: {
                "x-hasura-user-id"?: string;
            };
        };

        return data?.["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"] || "";
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

    async function saveProfile() {
        const next = {
            ...draft,
            name: draft.name.trim(),
            email: draft.email.trim(),
            phone: draft.phone.trim(),
            company: draft.company.trim(),
            skills: draft.skills.trim(),
            avatarUrl: draft.avatarUrl.trim(),
        };

        const userId = getUserId();
        if (userId) {
            await updateProfile({
                variables: {
                    userId,
                    name: next.name || undefined,
                    email: next.email || undefined,
                    company: next.company || undefined,
                    skills: parseSkills(next.skills),
                },
            });
        }

        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
        setProfile(next);
        setDraft(next);
        setIsEditing(false);
    }

    function updateDraft<K extends keyof PlayerProfile>(key: K, value: PlayerProfile[K]) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    async function downloadCard() {
        if (!cardRef.current || isDownloading) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: "#171717",
            });
            const link = document.createElement("a");
            link.download = "uxathon-player-card.png";
            link.href = dataUrl;
            link.click();
        } catch {
            console.error("Failed to export player card");
        } finally {
            setIsDownloading(false);
        }
    }

    const display = isEditing ? draft : profile;
    const skillTags = parseSkills(display.skills);
    const initials = getInitials(display.name);

    const inputClass = "w-full border border-[#2e2e2e] bg-[#181818] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-[#5b5b5b] focus:border-[rgba(222,247,103,0.5)]";

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:18px_18px]" />

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/95 px-5 py-4 backdrop-blur-[2px]">
                <Link href="/dashboard" className="flex h-10 items-center gap-2 border border-[#2e2e2e] px-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                    <ArrowLeft size={14} aria-hidden />
                    Dashboard
                </Link>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Profile</p>
            </header>

            <section className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
                {!hydrated ? (
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Loading profile…</p>
                ) : (
                    <>
                        <div ref={cardRef} className="border border-[#2e2e2e] bg-[#171717] px-6 py-8" aria-label="Player card">
                            <div className="flex flex-col items-center">
                                {display.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getImageUrl(display.avatarUrl)} alt="" className="h-24 w-24 rounded-full border border-[#2e2e2e] object-cover" />
                                ) : (
                                    <div className="grid h-24 w-24 place-items-center rounded-full border border-[#2e2e2e] bg-[#181818] font-sans text-[28px] uppercase tracking-[0.04em] text-[#ff6a6a]">{initials}</div>
                                )}

                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5b5b5b]">UXATHON / PLAYER CARD</p>
                            </div>

                            <dl className="mt-8 space-y-5">
                                {isEditing ? (
                                    <>
                                        <Field label="Name">
                                            <input type="text" value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="Your name" className={inputClass} />
                                        </Field>
                                        <Field label="Email">
                                            <input type="email" value={draft.email} onChange={(e) => updateDraft("email", e.target.value)} placeholder="you@company.com" className={inputClass} />
                                        </Field>
                                        <Field label="Company">
                                            <input type="text" value={draft.company} onChange={(e) => updateDraft("company", e.target.value)} placeholder="Company name" className={inputClass} />
                                        </Field>
                                        <Field label="Skills">
                                            <input type="text" value={draft.skills} onChange={(e) => updateDraft("skills", e.target.value)} placeholder="UX Research, Figma, Prototyping" className={inputClass} />
                                        </Field>
                                    </>
                                ) : (
                                    <>
                                        <ProfileRow label="Name" value={display.name} />
                                        <ProfileRow label="Email" value={display.email} />
                                        <ProfileRow label="Phone number (10-Digits)" value={display.phone} />
                                        <ProfileRow label="Company" value={display.company} />
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">Skills</dt>
                                            <dd className="mt-2">
                                                {skillTags.length > 0 ? (
                                                    <ul className="flex flex-wrap gap-2">
                                                        {skillTags.map((skill) => (
                                                            <li key={skill} className="border border-[#2e2e2e] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#929292]">
                                                                {skill}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-[13px] text-[#5b5b5b]">—</p>
                                                )}
                                            </dd>
                                        </div>
                                    </>
                                )}
                            </dl>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {isEditing ? (
                                <>
                                    <button type="button" onClick={saveProfile} className="flex h-11 flex-1 items-center justify-center gap-2 bg-[#ff6a6a] font-mono text-[11px] uppercase tracking-[0.14em] text-[#171717]">
                                        <Save size={14} aria-hidden />
                                        Save
                                    </button>
                                    <button type="button" onClick={cancelEditing} className="flex h-11 flex-1 items-center justify-center gap-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                        <X size={14} aria-hidden />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={startEditing} className="flex h-11 flex-1 items-center justify-center gap-2 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] active:border-[rgba(222,247,103,0.5)] active:text-[#DEF767]">
                                    <Pencil size={14} aria-hidden />
                                    Edit
                                </button>
                            )}

                            <button type="button" onClick={downloadCard} disabled={isDownloading || isEditing} className="flex h-11 flex-1 items-center justify-center gap-2 border border-[rgba(222,247,103,0.5)] font-mono text-[11px] uppercase tracking-[0.14em] text-[#DEF767] disabled:cursor-not-allowed disabled:opacity-40">
                                <Download size={14} aria-hidden />
                                {isDownloading ? "Exporting…" : "Download PNG"}
                            </button>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</dt>
            <dd className="mt-1.5 text-[13px] leading-[1.5] text-white">{value.trim() || "—"}</dd>
        </div>
    );
}

```

---

### File: `app/register/page.tsx`

```tsx

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/token-context";
import {
    UserPlus, ShieldCheck, Zap, Briefcase,
    Mail, Lock, Phone, Cpu, Camera
} from "lucide-react";

export default function RegisterPage() {
    const { register } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New state for media upload
    const [avatarBase64, setAvatarBase64] = useState<string>("");
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize random default avatar on mount
    useEffect(() => {
        const loadRandomAvatar = async () => {
            const randomNum = Math.floor(Math.random() * 5) + 1;
            const imagePath = `/profile_pic/profile_pic${randomNum}.png`;

            // Set preview immediately for UX
            setAvatarPreview(imagePath);

            try {
                // Fetch the default image and convert to base64
                const response = await fetch(imagePath);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAvatarBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Failed to load default avatar sequence:", err);
            }
        };

        loadRandomAvatar();
    }, []);

    // Handle user uploading their own image
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setAvatarBase64(base64String);
                setAvatarPreview(base64String); // Update preview to uploaded image
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const phone = formData.get("phone") as string;
        const company = formData.get("company") as string;
        const skillsRaw = formData.get("skills") as string;

        try {
            await register({
                name,
                email,
                password,
                phone,
                company,
                skills: skillsRaw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                image: avatarBase64, // Passed to backend
            });

            // Null check for local player profile.
            const PROFILE_STORAGE_KEY = "uxathon-player-profile";
            if (typeof window !== "undefined") {
                const existingProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
                if (!existingProfile) {
                    const dummyProfile = {
                        name: name || "",
                        email: email || "",
                        phone: phone || "",
                        company: company || "",
                        skills: skillsRaw || "",
                        // Use the base64 avatar for local storage as well
                        avatarUrl: avatarBase64 || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "UX")}`,
                    };
                    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(dummyProfile));
                }
            }

            window.location.href = "/dashboard";
        } catch (err: Error | unknown) {
            setError((err as Error).message || "Registration protocol failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717]">
            {/* UXISM Background System */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(222,247,103,0.05)_0%,rgba(255,106,106,0.03)_50%,transparent_100%)] blur-[100px]" />

                <div className="absolute left-8 top-8 h-6 w-6 border-l border-t border-[#5b5b5b]/40" />
                <div className="absolute right-8 top-8 h-6 w-6 border-r border-t border-[#5b5b5b]/40" />
                <div className="absolute left-8 bottom-8 h-6 w-6 border-l border-b border-[#5b5b5b]/40" />
                <div className="absolute right-8 bottom-8 h-6 w-6 border-r border-b border-[#5b5b5b]/40" />

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 opacity-20">
                    <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[#5b5b5b]" />
                    <div className="absolute left-0 top-1/2 h-[1px] w-full bg-[#5b5b5b]" />
                </div>
            </div>

            <header className="relative z-20 flex items-center justify-between border-b border-[#2e2e2e] bg-[#181818]/80 px-6 py-5 backdrop-blur-md">
                <div className="flex flex-col">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Identity Node</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">SECURE CONNECTION</p>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Registration Node</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292]">V1.0.4</p>
                </div>
            </header>

            <section className="relative z-10 flex min-h-[calc(100-80px)] flex-col items-center justify-center px-6 py-20">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-lg">
                    <div className="mb-10 text-center sm:text-left">
                        <h1 className="font-sans text-4xl uppercase tracking-tight text-white mb-3">
                            Join <span className="text-[#ff6a6a]">UXISM</span>
                        </h1>
                        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[#5b5b5b]">Establish your identity in the network.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="group relative">
                        {/* Unified Slab Construction */}
                        <div className="border border-[#2e2e2e] bg-[#171717] divide-y divide-[#2e2e2e]">

                            {/* Avatar Upload Sector */}
                            <div
                                className="relative group/avatar flex flex-col items-center justify-center px-6 py-8 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg, image/webp"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />

                                <div className="relative h-20 w-20 overflow-hidden rounded-none border border-[#2e2e2e] bg-[#1a1a1a] transition-colors group-hover/avatar:border-[#DEF767]">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Identity Marker"
                                            className="h-full w-full object-cover grayscale opacity-80 group-hover/avatar:grayscale-0 group-hover/avatar:opacity-100 transition-all duration-500"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Camera className="text-[#5b5b5b] group-hover/avatar:text-[#DEF767]" />
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-sm">
                                        <Camera size={20} className="text-[#DEF767]" />
                                    </div>

                                    {/* Crosshair accents on avatar */}
                                    <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-[#DEF767] opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                    <div className="absolute right-0 bottom-0 h-2 w-2 border-r border-b border-[#DEF767] opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                </div>

                                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] group-hover/avatar:text-[#DEF767] transition-colors">
                                    [ Override Visual Identity ]
                                </p>
                            </div>

                            <RegisterInput label="Full Name" name="name" type="text" placeholder="J. DOE" icon={<UserPlus size={16} />} required />
                            <RegisterInput label="Email Address" name="email" type="email" placeholder="YOU@DOMAIN.EXT" icon={<Mail size={16} />} required />
                            <RegisterInput label="Password" name="password" type="password" placeholder="••••••••" icon={<Lock size={16} />} required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#2e2e2e]">
                                <RegisterInput label="Phone Number" name="phone" type="tel" placeholder="987********" icon={<Phone size={16} />} required />
                                <RegisterInput label="Affiliation" name="company" type="text" placeholder="CORPORATION / ORG" icon={<Briefcase size={16} />} required />
                            </div>
                            <RegisterInput label="Skills" name="skills" type="text" placeholder="UI, UX...(COMMA SEPARATED)" icon={<Cpu size={16} />} required />
                        </div>

                        {error && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-6 border border-[#ff6a6a]/30 bg-[#ff6a6a]/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-[#ff6a6a]">
                                <span className="mr-2 opacity-50">ERROR:</span> {error}
                            </motion.div>
                        )}

                        <div className="mt-8 flex flex-col gap-4">
                            <button type="submit" disabled={isLoading} className="relative group flex h-14 w-full items-center justify-center overflow-hidden bg-[#ff6a6a] transition-all hover:bg-[#ff4d4d] disabled:opacity-50">
                                <span className="relative z-10 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.2em] text-[#171717]">
                                    {isLoading ? (
                                        <div className="h-4 w-4 animate-spin border-2 border-[#171717] border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            Initialize Protocol
                                            <ShieldCheck size={18} />
                                        </>
                                    )}
                                </span>
                            </button>

                            <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-[#5b5b5b]">
                                By initializing, you agree to the <span className="text-[#929292]">System Terms</span>
                            </p>
                        </div>
                    </form>
                </motion.div>
            </section>

            {/* Right Rail */}
            <div className="fixed right-0 top-0 bottom-0 w-[25%] pointer-events-none z-30 hidden lg:block">
                <div className="absolute right-8 bottom-8 flex flex-col gap-4 pointer-events-auto">
                    <button className="h-10 w-10 border border-[#5b5b5b] bg-[#181818] text-[#5b5b5b] hover:border-[#DEF767] hover:text-[#DEF767] transition-all flex items-center justify-center">
                        <Zap size={18} />
                    </button>
                </div>
            </div>

            {/* Footer Status Bar */}
            <footer className="fixed bottom-0 left-0 right-0 z-20 flex h-8 items-center justify-between border-t border-[#2e2e2e] bg-[#181818] px-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#DEF767]" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#929292]">ENCRYPTION ACTIVE</span>
                    </div>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#5b5b5b]">COORD: REGISTER_FLOW_V1.0</div>
            </footer>
        </main>
    );
}

function RegisterInput({ label, name, type, placeholder, icon, required }: { label: string; name: string; type: string; placeholder: string; icon: React.ReactNode; required?: boolean }) {
    return (
        <div className="relative group/field px-6 py-5 hover:bg-[#1a1a1a] transition-colors">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b] mb-3 group-focus-within/field:text-[#DEF767] transition-colors">{label}</label>
            <div className="relative flex items-center gap-4">
                <div className="text-[#5b5b5b] group-focus-within/field:text-[#DEF767] transition-colors">{icon}</div>
                <input name={name} type={type} required={required} placeholder={placeholder} className="w-full bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-[#2e2e2e]" />
            </div>
            {/* Focus Indicator Accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-focus-within/field:scale-y-100 transition-transform duration-300 origin-top" />
        </div>
    );
}

```

---

### File: `app/room/[code]/page.tsx`

```tsx
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

```

---

### File: `app/x/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap');

/* ─── UXISM DESIGN TOKENS ─────────────────────────────────── */
:root {
  --base-bg:   #181818;
  --deep-bg:   #171717;
  --border:    #2e2e2e;
  --muted:     #5b5b5b;
  --secondary: #929292;
  --primary:   #ffffff;
  --lime:      #DEF767;
  --coral:     #ff6a6a;

  --font-body: 'Onest', 'Cygre', sans-serif;
  --font-mono: 'Geist Mono', monospace;
  /* GROZEN MEDICAL fallback to a condensed serif */
  --font-display: 'Times New Roman', serif;
}

/* ─── RESET ───────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: var(--base-bg);
  color: var(--primary);
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ─── DOT GRID UNDERLAY ───────────────────────────────────── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.25;
}

/* ─── CORNER CROSSHAIRS ───────────────────────────────────── */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background:
    /* top-left */
    linear-gradient(var(--border), var(--border)) 16px 16px / 16px 1px no-repeat,
    linear-gradient(var(--border), var(--border)) 16px 16px / 1px 16px no-repeat,
    /* top-right */
    linear-gradient(var(--border), var(--border)) calc(100% - 16px) 16px / 16px 1px no-repeat,
    linear-gradient(var(--border), var(--border)) calc(100% - 16px) 16px / 1px 16px no-repeat,
    /* bottom-left */
    linear-gradient(var(--border), var(--border)) 16px calc(100% - 16px) / 16px 1px no-repeat,
    linear-gradient(var(--border), var(--border)) 16px calc(100% - 16px) / 1px 16px no-repeat,
    /* bottom-right */
    linear-gradient(var(--border), var(--border)) calc(100% - 16px) calc(100% - 16px) / 16px 1px no-repeat,
    linear-gradient(var(--border), var(--border)) calc(100% - 16px) calc(100% - 16px) / 1px 16px no-repeat;
}

/* ─── SCROLLBAR ───────────────────────────────────────────── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--deep-bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ─── TYPOGRAPHY ──────────────────────────────────────────── */
.display { font-family: var(--font-display); letter-spacing: 0.02em; }
.mono    { font-family: var(--font-mono); }
.nav-label {
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: var(--font-display);
}
.body-copy  { font-size: 13px; color: var(--secondary); line-height: 1.5; }
.meta       { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }

/* ─── UTILITY ─────────────────────────────────────────────── */
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
}

/* ─── GAME-SPECIFIC GLOBALS ───────────────────────────────── */
.slot-glow {
  box-shadow: 0 0 0 1px var(--lime), 0 0 12px rgba(222,247,103,0.15);
}
.claimed-flash {
  animation: claimedFlash 0.5s ease forwards;
}
@keyframes claimedFlash {
  0%   { opacity: 1; }
  50%  { opacity: 0.3; }
  100% { opacity: 1; }
}

```

---

### File: `app/x/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Context Persona Flow — Multiplayer UX Race',
  description: 'Real-time multiplayer card-swipe game: build the correct 5-step persona flow before your rivals.',
  keywords: ['UX game', 'persona', 'multiplayer', 'card game', 'uxism'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

```

---

### File: `app/x/app/leaderboard/page.tsx`

```tsx
import React from 'react';
import BigScreenLeaderboard from '@/components/views/BigScreenLeaderboard/BigScreenLeaderboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Time Telemetry | Global Assignment Link',
  description: 'Real-time progress of users and teams playing the Persona Flow game.',
};

export default function LeaderboardPage() {
  return <BigScreenLeaderboard />;
}

```

---

### File: `app/x/app/page.module.css`

```css
.shell {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  /* Content in left 75%, FABs in right 25% */
  display: block;
}

```

---

### File: `app/x/app/page.tsx`

```tsx
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

```

---

### File: `app/x/app/persona-flow-test/page.tsx`

```tsx
'use client';
import React from 'react';
import PersonaFlowCard from '@/components/game/PersonaFlowCard/PersonaFlowCard';

const DEMO_CARDS = [
  {
    variant: 'identity' as const,
    baseHexColor: '#FFD700', // Yellow
    heading: 'MARIA',
    centralGraphic: <div style={{ fontSize: '100px' }}>👩‍🏫</div>, // Placeholder avatar
  },
  {
    variant: 'description' as const,
    baseHexColor: '#FFD700',
    heading: 'The Busy Professional',
    subHeading: 'Early Adopter',
    topRightIcon: <span>👤💡</span>,
    sections: [
      { label: 'Demographics', value: '34, Urban, Tech-savvy' },
      { label: 'Goals', value: 'Efficiency, Automation, Speed' },
      { label: 'Pain Points', value: 'Complexity, Lag, Manual steps' },
    ],
  },
  {
    variant: 'scenario' as const,
    baseHexColor: '#FFD700',
    heading: 'Morning Rush',
    topRightIcon: <span>🌐</span>,
    bodyText: 'Maria needs to quickly check her schedule while commuting on a crowded train.',
  },
  {
    variant: 'task' as const,
    baseHexColor: '#FFD700',
    heading: 'Daily Briefing',
    topRightIcon: <span>⏰</span>,
    bodyText: 'Generate a summary of the most important tasks for the day in under 30 seconds.',
  },
  {
    variant: 'taskFlow' as const,
    baseHexColor: '#FFD700',
    heading: 'Task Workflow',
    topRightIcon: <span>📊</span>,
    listItems: [
      'Open AI Assistant app',
      'Voice command: "Brief me"',
      'Review task list',
      'Prioritize top 3 items',
      'Confirm and start focus mode',
    ],
  },
  {
    variant: 'persuasion' as const,
    baseHexColor: '#FFD700',
    heading: 'Social Proof',
    subHeading: 'Framing',
    topRightIcon: <span>📋💰</span>,
    bodyText: 'Join 10,000+ professionals who save 2 hours daily using our briefing tool.',
    bottomGraphic: <div style={{ fontSize: '40px' }}>✨</div>,
  },
];

export default function PersonaFlowTestPage() {
  return (
    <div style={{ padding: '60px', background: '#121212', minHeight: '100vh' }}>
      <h1 style={{ color: 'white', marginBottom: '40px', textAlign: 'center' }}>Persona Flow Variants</h1>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {DEMO_CARDS.map((card, idx) => (
          <div key={idx} style={{ width: '350px', margin: '0 auto' }}>
            <PersonaFlowCard {...card} />
          </div>
        ))}
      </div>
    </div>
  );
}

```

---

### File: `app/x/data/mockData.ts`

```typescript
// // lib/mockData.ts
// // Fully self-contained mock dataset — no Hasura/DB required for the MVP demo.

// import { Domain, Persona, Card, User } from '@/app/x/types/index';

// export const MOCK_USERS: User[] = [
//   { id: 'u1', username: 'PlayerOne', teamName: 'Alpha Squad', teamMembers: ['Alice', 'Bob', 'Charlie'] },
//   { id: 'u2', username: 'NeonRacer', teamName: 'Cyber Punks', teamMembers: ['Dave', 'Eve', 'Frank'] },
//   { id: 'u3', username: 'GridRunner', teamName: 'Velocity', teamMembers: ['Grace', 'Heidi', 'Ivan'] },
//   { id: 'u4', username: 'DataPilot', teamName: 'NeuroNet', teamMembers: ['Jack', 'Karl', 'Liam'] },
// ];

// export const MOCK_DOMAINS: Domain[] = [
//   { id: 'd1', name: 'FinTech', icon: '◈', description: 'Payments, trading, compliance & wealth management' },
//   { id: 'd2', name: 'HealthTech', icon: '⊕', description: 'Clinical workflows, diagnostics, & patient care' },
//   { id: 'd3', name: 'AI Tech', icon: '⊙', description: 'Model training, ethics, & intelligent agents' },
//   { id: 'd4', name: 'GameDev', icon: '🎮', description: 'Mechanics, rendering, & player experience' },
// ];

// export const MOCK_PERSONAS: Persona[] = [
//   { id: 'p01', name: 'MARIA', color_code: '#FFD700', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p02', name: 'JAXON', color_code: '#aed581', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p03', name: 'ELARA', color_code: '#ce93d8', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p04', name: 'KAI', color_code: '#ffb74d', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p05', name: 'ZARA', color_code: '#4db6ac', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p06', name: 'FINN', color_code: '#81d4fa', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p07', name: 'LUNA', color_code: '#f06292', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p08', name: 'NOVA', color_code: '#ba68c8', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p09', name: 'ORION', color_code: '#7986cb', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p10', name: 'REMY', color_code: '#4fc3f7', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p11', name: 'SAGE', color_code: '#4db6ac', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p12', name: 'THEO', color_code: '#dce775', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p13', name: 'VAL', color_code: '#ff8a65', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p14', name: 'WREN', color_code: '#a1887f', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p15', name: 'XER', color_code: '#90a4ae', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p16', name: 'YARA', color_code: '#f48fb1', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p17', name: 'ZANE', color_code: '#9575cd', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p18', name: 'MIRA', color_code: '#64b5f6', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p19', name: 'KOA', color_code: '#81c784', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
//   { id: 'p20', name: 'IRIS', color_code: '#e57373', asset_path: '/assets/avatars/placeholder.svg', status: 'AVAILABLE', claimed_by_user_id: null, claimed_at: null },
// ];


// // ─────────────────────────────────────────────────────────────
// // 6 correct cards per persona — the new design sequence
// // ─────────────────────────────────────────────────────────────
// const HARDCODED_CARDS: Card[] = [
//   // p01 — MARIA
//   { 
//     id: 'c01-id', persona_id: 'p01', domain_id: 'd1', card_type: 'IDENTITY', 
//     heading: 'MARIA', content: 'The Busy Professional' 
//   },
//   { 
//     id: 'c01-desc', persona_id: 'p01', domain_id: 'd1', card_type: 'DESCRIPTION', 
//     heading: 'The Busy Professional', subHeading: 'Early Adopter', content: 'Maria Profile',
//     sections: [
//       { label: 'Demographics', value: '34, Urban, Tech-savvy' },
//       { label: 'Goals', value: 'Efficiency, Automation, Speed' },
//       { label: 'Pain Points', value: 'Complexity, Lag, Manual steps' },
//     ]
//   },
//   { 
//     id: 'c01-scen', persona_id: 'p01', domain_id: 'd1', card_type: 'SCENARIO', 
//     heading: 'Morning Rush', content: 'Scenario Context',
//     bodyText: 'Maria needs to quickly check her schedule while commuting on a crowded train.' 
//   },
//   { 
//     id: 'c01-task', persona_id: 'p01', domain_id: 'd1', card_type: 'TASK', 
//     heading: 'Daily Briefing', content: 'Core Task',
//     bodyText: 'Generate a summary of the most important tasks for the day in under 30 seconds.' 
//   },
//   { 
//     id: 'c01-flow', persona_id: 'p01', domain_id: 'd1', card_type: 'TASK_FLOW', 
//     heading: 'Task Workflow', content: 'Process Steps',
//     listItems: [
//       'Open AI Assistant app',
//       'Voice command: "Brief me"',
//       'Review task list',
//       'Prioritize top 3 items',
//       'Confirm and start focus mode',
//     ]
//   },
//   { 
//     id: 'c01-pers', persona_id: 'p01', domain_id: 'd1', card_type: 'PERSUASION', 
//     heading: 'Social Proof', subHeading: 'Framing', content: 'Tool nudge',
//     bodyText: 'Join 10,000+ professionals who save 2 hours daily using our briefing tool.' 
//   },
// ];

// const generatedCards: Card[] = [];
// MOCK_PERSONAS.forEach(p => {
//   MOCK_DOMAINS.forEach(d => {
//     const hasHardcoded = HARDCODED_CARDS.some(c => c.persona_id === p.id && c.domain_id === d.id);
//     if (!hasHardcoded) {
//       generatedCards.push({ id: `c-${p.id}-${d.id}-id`, persona_id: p.id, domain_id: d.id, card_type: 'IDENTITY', heading: p.name, content: `${p.name} Identity` });
//       generatedCards.push({ 
//         id: `c-${p.id}-${d.id}-desc`, persona_id: p.id, domain_id: d.id, card_type: 'DESCRIPTION', 
//         heading: `${p.name} Profile`, content: 'Description',
//         sections: [{ label: 'Trait', value: 'Archetype Trait' }]
//       });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-scen`, persona_id: p.id, domain_id: d.id, card_type: 'SCENARIO', heading: 'The Scenario', content: 'Scenario', bodyText: `Context for ${p.name}.` });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-task`, persona_id: p.id, domain_id: d.id, card_type: 'TASK', heading: 'The Task', content: 'Task', bodyText: `Task for ${p.name}.` });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-flow`, persona_id: p.id, domain_id: d.id, card_type: 'TASK_FLOW', heading: 'The Flow', content: 'Flow', listItems: ['Action 1', 'Action 2'] });
//       generatedCards.push({ id: `c-${p.id}-${d.id}-pers`, persona_id: p.id, domain_id: d.id, card_type: 'PERSUASION', heading: 'The Tool', content: 'Tool', bodyText: `Nudge for ${p.name}.` });
//     }
//   });
// });

// export const MOCK_CARDS: Card[] = [...HARDCODED_CARDS, ...generatedCards];

// export function buildDeck(_correctCards: Card[], allCards: Card[], domainId: string): Card[] {
//   // Return all cards for this domain, shuffled.
//   // The RuleManager will filter them to show only the relevant next slot.
//   return allCards
//     .filter(c => c.domain_id === domainId)
//     .sort(() => Math.random() - 0.5);
// }

// import { SlotState, SlotKey, SLOT_ORDER } from '@/types';

// export function isFlowComplete(slots: SlotState, correctCards: Card[]): boolean {
//   return SLOT_ORDER.every((slotKey: SlotKey) => {
//     const placed = slots[slotKey];
//     if (!placed) return false;
//     const correct = correctCards.find(c => c.card_type === slotKey);
//     return placed.id === correct?.id;
//   });
// }

// export function getCorrectCards(personaId: string, domainId: string): Card[] {
//   return MOCK_CARDS.filter(c => c.persona_id === personaId && c.domain_id === domainId);
// }







// lib/mockData.ts
// Fully self-contained mock dataset — no Hasura/DB required for the MVP demo.

import { Domain, Persona, Card, User } from '@/app/x/types/index';

export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'PlayerOne', teamName: 'Alpha Squad', teamMembers: ['Alice', 'Bob', 'Charlie'] },
  { id: 'u2', username: 'NeonRacer', teamName: 'Cyber Punks', teamMembers: ['Dave', 'Eve', 'Frank'] },
  { id: 'u3', username: 'GridRunner', teamName: 'Velocity', teamMembers: ['Grace', 'Heidi', 'Ivan'] },
  { id: 'u4', username: 'DataPilot', teamName: 'NeuroNet', teamMembers: ['Jack', 'Karl', 'Liam'] },
];

export const MOCK_DOMAINS: Domain[] = [
  { id: 'd1', name: 'FinTech', icon: '◈', description: 'Payments, trading, compliance & wealth management' },
  { id: 'd2', name: 'HealthTech', icon: '⊕', description: 'Clinical workflows, diagnostics, & patient care' },
  { id: 'd3', name: 'AI Tech', icon: '⊙', description: 'Model training, ethics, & intelligent agents' },
  { id: 'd4', name: 'GameDev', icon: '🎮', description: 'Mechanics, rendering, & player experience' },
];

export const MOCK_PERSONAS: Persona[] = [
  {
    id: "p01",
    name: "Shanti Devi",
    domain_id: "d1",
    color_code: "#FEF102",
    asset_path: "/assets/avatars/ShantiDevi.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "63, female | Goals: Book doctor appointments easily, Access prescriptions and reports, Understand medicines | Pain Points: Difficulty reading English interfaces, Confused by medical terminology",
    scenario: "Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.",
    ux_problems: "Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users, Lack of guided navigation, No offline-first experience",
    ui_problems: "Visual Clutter, Small text sizes, Poor contrast ratios, Non-standard icons, Lack of visual cues",
    cx_problems: "Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance, Inconsistent support experience, Reduced trust after failed payments",
    ai_problems: "Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations, Weak personalization for chronic patients, Inability to detect emotional distress"
  },
  {
    id: "p02",
    name: "Rohit",
    domain_id: "d1",
    color_code: "#CADB2B",
    asset_path: "/assets/avatars/Rohit.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "32, male | Goals: Quick doctor consultations, Fast insurance claims, Smart health tracking | Pain Points: Too many irrelevant notifications, Confusing insurance claim process",
    scenario: "Rohit uses a health app to schedule annual checkups and manage fitness reports but receives irrelevant notifications and duplicate reminders.",
    ux_problems: "Fragmented patient journeys, Repetitive data entry, Poor synchronization across devices, Confusing insurance claim workflow",
    ui_problems: "Cluttered dashboards, Notification overload, Unclear CTAs, Difficult report comparison views",
    cx_problems: "Distrust in hidden healthcare costs, Frustration from delayed customer support, Lack of continuity between hospitals and insurers, Emotional stress during emergencies",
    ai_problems: "Incorrect health risk scoring, Weak predictive alerts, Generic fitness recommendations, Data privacy concerns, Poor integration of wearable data"
  },
  {
    id: "p03",
    name: "Kavya",
    domain_id: "d1",
    color_code: "#72AC22",
    asset_path: "/assets/avatars/Kavya.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "14, female | Goals: Access learning content, Prepare for exams, Learn in Punjabi/Hindi | Pain Points: Poor internet for online learning, Difficult navigation on LMS platforms",
    scenario: "Kavya attends online classes through a state LMS but struggles due to poor internet and difficult navigation.",
    ux_problems: "Complicated course navigation, Lack of progress indicators, Poor mobile optimization, High cognitive load for students",
    ui_problems: "Tiny clickable areas, Poor readability, Non responsive layouts, Excessive text heavy screens",
    cx_problems: "Feeling disconnected from teachers, Low motivation due to isolation, Frustration from technical issues, Reduced confidence after repeated failures",
    ai_problems: "Weak adaptive learning models, Poor language translation quality, Inaccurate student performance prediction, Lack of emotional engagement analysis"
  },
  {
    id: "p04",
    name: "Dr. Meera",
    domain_id: "d1",
    color_code: "#4BB059",
    asset_path: "/assets/avatars/DrMeera.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "45, female | Goals: Manage assignments efficiently, Track student performance, Conduct hybrid classes | Pain Points: Time consuming grading workflows, Overcrowded dashboards",
    scenario: "Dr. Meera uses a university LMS to upload assignments but struggles with grading automation and analytics.",
    ux_problems: "Complex admin workflows, Multi step grading systems, Poor analytics discoverability, Time consuming content uploads",
    ui_problems: "Overcrowded teacher dashboards, Difficult table navigation, Poor accessibility for long sessions, Inconsistent layouts across modules",
    cx_problems: "Burnout due to repetitive tasks, Lack of trust in digital grading, Difficulty maintaining student engagement, Reduced satisfaction from system crashes",
    ai_problems: "Incorrect plagiarism detection, Weak recommendation engines, Bias in automated grading, Poor predictive dropout analysis"
  },
  {
    id: "p05",
    name: "Suresh - Shopkeeper",
    domain_id: "d1",
    color_code: "#319F69",
    asset_path: "/assets/avatars/Suresh.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "40, male | Goals: Manage inventory, Track sales, File GST easily | Pain Points: Complex tax filing, Difficult inventory management, Lack of business insights",
    scenario: "Suresh tries to use a business management app to track his shop's inventory and file GST but finds the interface overwhelming.",
    ux_problems: "Confusing tax filing steps, Lack of bulk inventory updates, Poor data visualization, Non-intuitive navigation",
    ui_problems: "Cluttered data tables, Small fonts, Lack of visual hierarchy, Inconsistent button styles",
    cx_problems: "Anxiety over tax compliance, Frustration with slow support, Lack of trust in data security, Feeling overwhelmed by complex features",
    ai_problems: "Inaccurate sales forecasting, Weak inventory alerts, Generic business advice, Poor tax calculation accuracy"
  }
];

// ─────────────────────────────────────────────────────────────
// 7 correct cards per persona — the new design sequence
// ─────────────────────────────────────────────────────────────
export const HARDCODED_CARDS: Card[] = [
  // p01 — Shanti Devi (Mapped to d1)
  { 
    id: 'c01-avatar', persona_id: 'p01', domain_id: 'd1', card_type: 'AVATAR', 
    heading: 'Shanti Devi', content: 'Elderly Rural Patient' 
  },
  { 
    id: 'c01-persona', persona_id: 'p01', domain_id: 'd1', card_type: 'PERSONA', 
    heading: 'Elderly Rural Patient', subHeading: 'Shanti Devi', content: 'Profile Details',
    sections: [
      { label: 'Demographics', value: '63, female' },
      { label: 'Goals', value: 'Book doctor appointments easily, Access prescriptions' },
      { label: 'Pain Points', value: 'Difficulty reading English, Confused by medical terminology' },
    ]
  },
  { 
    id: 'c01-scenario', persona_id: 'p01', domain_id: 'd1', card_type: 'SCENARIO', 
    heading: 'The Scenario', content: 'Scenario Context',
    bodyText: 'Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.' 
  },
  { 
    id: 'c01-ux', persona_id: 'p01', domain_id: 'd1', card_type: 'UX_PROBLEM', 
    heading: 'UX Challenges', content: 'UX Problem',
    bodyText: 'Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users.' 
  },
  { 
    id: 'c01-ui', persona_id: 'p01', domain_id: 'd1', card_type: 'UI_PROBLEM', 
    heading: 'UI & Interaction', content: 'UI Problem',
    listItems: [
      'Visual Clutter',
      'Small text sizes',
      'Poor contrast ratios',
      'Non-standard icons',
      'Lack of visual cues'
    ]
  },
  { 
    id: 'c01-cx', persona_id: 'p01', domain_id: 'd1', card_type: 'CX_PROBLEM', 
    heading: 'CX & Trust', subHeading: 'Emotional Nudge', content: 'CX Problem',
    bodyText: 'Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance.' 
  },
  { 
    id: 'c01-ai', persona_id: 'p01', domain_id: 'd1', card_type: 'AI_PROBLEM', 
    heading: 'AI Intelligence', content: 'AI Problem',
    bodyText: 'Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations.' 
  },
];

const generatedCards: Card[] = [];
MOCK_PERSONAS.forEach(p => {
  const dId = p.domain_id;
  const hasHardcoded = HARDCODED_CARDS.some(c => c.persona_id === p.id && c.domain_id === dId);
  
  if (!hasHardcoded) {
    // 1. AVATAR
    generatedCards.push({
      id: `c-${p.id}-avatar`, persona_id: p.id, domain_id: dId, card_type: 'AVATAR',
      heading: p.name, content: "Persona Archetype"
    });

    // 2. PERSONA
    const descParts = p.persona_details?.split('|') || [];
    const sections = descParts.map(part => {
      const [label, ...valueParts] = part.split(':');
      if (valueParts.length === 0) return { label: 'Bio', value: label.trim() };
      return {
        label: label?.trim() || "Profile",
        value: valueParts.join(':')?.trim() || part.trim()
      };
    });
    generatedCards.push({
      id: `c-${p.id}-persona`, persona_id: p.id, domain_id: dId, card_type: 'PERSONA',
      heading: "Archetype Profile", subHeading: p.name, content: 'Persona Details',
      sections: sections.length > 0 ? sections : [{ label: 'Trait', value: 'Archetype Trait' }]
    });

    // 3. SCENARIO
    generatedCards.push({
      id: `c-${p.id}-scenario`, persona_id: p.id, domain_id: dId, card_type: 'SCENARIO',
      heading: 'The Scenario', content: 'Scenario',
      bodyText: p.scenario || `Context for ${p.name}.`
    });

    // 4. UX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ux`, persona_id: p.id, domain_id: dId, card_type: 'UX_PROBLEM',
      heading: 'UX Challenges', content: 'UX Problem',
      bodyText: p.ux_problems || `Analyze UX for ${p.name}.`
    });

    // 5. UI_PROBLEM
    const uiList = p.ui_problems?.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'z') || [];
    generatedCards.push({
      id: `c-${p.id}-ui`, persona_id: p.id, domain_id: dId, card_type: 'UI_PROBLEM',
      heading: 'UI & Interaction', content: 'UI Problem',
      listItems: uiList.length > 0 ? uiList : ['Analyze visual hierarchy', 'Review touch targets', 'Check accessibility']
    });

    // 6. CX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-cx`, persona_id: p.id, domain_id: dId, card_type: 'CX_PROBLEM',
      heading: 'CX & Trust', subHeading: 'Emotional Nudge',
      content: 'CX Problem',
      bodyText: p.cx_problems || `Build trust with ${p.name}.`
    });

    // 7. AI_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ai`, persona_id: p.id, domain_id: dId, card_type: 'AI_PROBLEM',
      heading: 'AI Intelligence', content: 'AI Problem',
      bodyText: p.ai_problems || `AI recommendations for ${p.name}.`
    });
  }
});

export const MOCK_CARDS: Card[] = [...HARDCODED_CARDS, ...generatedCards];

export function buildDeck(_correctCards: Card[], allCards: Card[], domainId: string): Card[] {
  // Return all cards for this domain, shuffled.
  // The RuleManager will filter them to show only the relevant next slot.
  return allCards
    .filter(c => c.domain_id === domainId)
    .sort(() => Math.random() - 0.5);
}

import { SlotState, SlotKey, SLOT_ORDER } from '@/app/x/types/index';

export function isFlowComplete(slots: SlotState, correctCards: Card[]): boolean {
  return SLOT_ORDER.every((slotKey: SlotKey) => {
    const placed = slots[slotKey];
    if (!placed) return false;
    const correct = correctCards.find(c => c.card_type === slotKey);
    return placed.id === correct?.id;
  });
}

export function getCorrectCards(personaId: string, domainId: string): Card[] {
  return MOCK_CARDS.filter(c => c.persona_id === personaId && c.domain_id === domainId);
}
```

---

### File: `app/x/debug/DebugPanel/DebugPanel.module.css`

```css
.panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 18, 0.85);
  border: 1px solid var(--border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 44px;
  height: 44px;
}

.panelOpen {
  width: 220px;
  height: auto;
}

.toggle {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: color 0.2s, transform 0.3s;
  flex-shrink: 0;
}

.toggle:hover {
  color: var(--lime);
}

.panelOpen .toggle {
  transform: rotate(90deg);
  position: absolute;
  top: 0;
  right: 0;
}

.content {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--lime);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 2px;
  opacity: 0.8;
}

.label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: color 0.12s;
  padding: 2px 0;
}

.label:hover {
  color: var(--primary);
}

.label input {
  accent-color: var(--lime);
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

```

---

### File: `app/x/debug/DebugPanel/DebugPanel.tsx`

```tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { GameMode } from '@/types';
import styles from './DebugPanel.module.css';

export default function DebugPanel() {
  const { state, dispatch } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const modes: GameMode[] = ['LOCK_ON_FILL', 'REPLACE_ALLOWED', 'SOFT_LOCK'];

  return (
    <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close debug menu' : 'Open debug menu'}
      >
        {isOpen ? '✕' : '⚙'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.content}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.section}>
              <div className={styles.title}>Rule Mode</div>
              {modes.map(m => (
                <label key={m} className={styles.label}>
                  <input
                    type="radio"
                    name="gameMode"
                    checked={state.gameMode === m}
                    onChange={() => dispatch({ type: 'SET_GAME_MODE', payload: m })}
                  />
                  {m}
                </label>
              ))}
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <div className={styles.title}>Visuals</div>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={state.showDeck}
                  onChange={() => dispatch({ type: 'TOGGLE_DECK_VISIBILITY' })}
                />
                Show Deck Block
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

---

### File: `app/x/lib/GameRules/IRuleMode.ts`

```typescript
import { Card, CardType, SlotState } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';

export interface IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean;
  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] };
  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>): void;
}

```

---

### File: `app/x/lib/GameRules/LockMode.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class LockMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    // Flow-wise logic: find the first empty slot in the order
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return false;

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    let remainingPool = [...pool];
    let nextCard = null;
    
    while (remainingPool.length > 0) {
      const candidate = remainingPool.shift()!;
      if (this.canCategorySpawn(candidate.card_type, slots)) {
        nextCard = candidate;
        break;
      }
    }
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    if (slots[slotKey] === null) {
      dispatch({ type: 'PLACE_CARD', payload: { card } });
      const newSlots = { ...slots, [slotKey]: card };
      if (isFlowComplete(newSlots, correctCards)) {
        setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
      } else {
        const isFull = Object.values(newSlots).every(c => c !== null);
        if (isFull) {
          setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
        }
      }
    } else {
      dispatch({ type: 'DISCARD_CARD' });
    }
  }
}

```

---

### File: `app/x/lib/GameRules/ReplaceMode.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class ReplaceMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return true; // If full, allow replacing anything

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    if (pool.length === 0) return { nextCard: null, remainingPool: [] };
    const [nextCard, ...remainingPool] = pool;
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    
    // Always place card, overwriting if needed
    dispatch({ type: 'PLACE_CARD', payload: { card } });
    const newSlots = { ...slots, [slotKey]: card };
    if (isFlowComplete(newSlots, correctCards)) {
      setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
    } else {
      const isFull = Object.values(newSlots).every(c => c !== null);
      if (isFull) {
        setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
      }
    }
  }
}

```

---

### File: `app/x/lib/GameRules/RuleManager.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { LockMode } from './LockMode';
import { ReplaceMode } from './ReplaceMode';
import { SoftLockMode } from './SoftLockMode';
import { Card, SlotState, GameMode } from '@/types';

export class RuleManager {
  private static modes: Record<GameMode, IRuleMode> = {
    LOCK_ON_FILL: new LockMode(),
    REPLACE_ALLOWED: new ReplaceMode(),
    SOFT_LOCK: new SoftLockMode(),
  };

  static getMode(mode: GameMode): IRuleMode {
    return this.modes[mode];
  }

  static rebuildDeck(pool: Card[], slots: SlotState, mode: GameMode): Card[] {
    const strategy = this.getMode(mode);
    const rebuiltDeck: Card[] = [];
    let currentPool = [...pool];

    while (currentPool.length > 0) {
      const { nextCard, remainingPool } = strategy.generateNextCard(currentPool, slots);
      currentPool = remainingPool;
      if (nextCard) {
        rebuiltDeck.push(nextCard);
      }
    }
    return rebuiltDeck;
  }
}

```

---

### File: `app/x/lib/GameRules/SoftLockMode.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class SoftLockMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return true; // If full, allow everything

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    if (pool.length === 0) return { nextCard: null, remainingPool: [] };
    const [first, ...remainingPool] = pool;
    
    const slotKey = CARD_TYPE_SLOT_MAP[first.card_type];
    const isFull = slots[slotKey] !== null;
    
    let nextCard = { ...first };
    if (isFull) {
      nextCard.isUpgraded = true;
    }
    
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    
    if (slots[slotKey] !== null) {
      // Slot is full, trigger confirm popup
      dispatch({ type: 'SHOW_CONFIRM_POPUP', payload: card });
    } else {
      dispatch({ type: 'PLACE_CARD', payload: { card } });
      const newSlots = { ...slots, [slotKey]: card };
      if (isFlowComplete(newSlots, correctCards)) {
        setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
      } else {
        const isFull = Object.values(newSlots).every(c => c !== null);
        if (isFull) {
          setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
        }
      }
    }
  }
}

```

---

### File: `app/x/lib/GameRules/index.ts`

```typescript
export * from './IRuleMode';
export * from './LockMode';
export * from './ReplaceMode';
export * from './SoftLockMode';
export * from './RuleManager';

```

---

### File: `app/x/page.tsx`

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Hash, Play, Info, Shield, Zap, Globe, Cpu, ArrowLeft, Gavel, X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSubscription } from "@apollo/client/react";
import { WATCH_TEAMS } from "@/lib/GameRules/game-queries";
import { useAuth } from "@/context/token-context";
import PersonaGameEvent from "@/components/game/PersonaGameEvent/PersonaGameEvent";

// --- TEMPLATE SYSTEM: Define your events here ---
const EVENTS = [
    {
        id: "persona-race",
        type: "GAME",
        title: "Persona Race",
        tag: "X-04",
        description: "Sort through the architectural archetypes to define your operational stance. Restraint is a value; density is earned.",
        icon: <Zap className="text-[#DEF767]" size={20} />,
        status: "ACTIVE",
        coord: "34.0522° N / 118.2437° W"
    },
    {
        id: "event-bidding",
        type: "BIDDING",
        title: "Event Biddings",
        tag: "X-07",
        description: "Participate in high-stakes auctions to secure elite personnel. Winners gain the right to buy their team members first.",
        icon: <Gavel className="text-[#ff6a6a]" size={20} />,
        status: "LOCKED",
        coord: "51.5074° N / 0.1278° W"
    }
];

export default function EventHubPage() {
    const [activeEventId, setActiveEventId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [transId, setTransId] = useState("");
    const [showAlreadyAssignedPopup, setShowAlreadyAssignedPopup] = useState(false);

    const { getData } = useAuth();
    const { data: teamsData } = useSubscription<{ teams: any[] }>(WATCH_TEAMS);

    useEffect(() => {
        setIsMounted(true);
        setTransId(Math.random().toString(36).substring(7).toUpperCase());
    }, []);

    // Identity verification
    const userData = getData();
    const userId = userData?.sub || (userData as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-user-id"];

    // Logic: If user has a team, they have already won and assigned a persona
    const isAlreadyAssigned = teamsData?.teams?.some((t: any) => String(t.leader_id) === String(userId));

    // Render the specific event component based on selection
    if (activeEventId === "persona-race") {
        return <PersonaGameEvent onBack={() => setActiveEventId(null)} />;
    }

    if (!isMounted) return null;

    return (
        <main className="relative min-h-screen flex flex-col items-center bg-[#181818] text-white selection:bg-[#ff6a6a] selection:text-[#171717] overflow-x-hidden">
            {/* --- GLOBAL VISUAL SHELL --- */}
            <div className="pointer-events-none fixed inset-0 opacity-25 [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="pointer-events-none fixed left-4 top-4 h-6 w-6 border-l border-t border-[#5b5b5b] sm:left-6 sm:top-6" />
            <div className="pointer-events-none fixed right-4 top-4 h-6 w-6 border-r border-t border-[#5b5b5b] sm:right-6 sm:top-6" />
            <div className="pointer-events-none fixed bottom-4 left-4 h-6 w-6 border-b border-l border-[#5b5b5b] sm:bottom-6 sm:left-6" />
            <div className="pointer-events-none fixed bottom-4 right-4 h-6 w-6 border-b border-r border-[#5b5b5b] sm:bottom-6 sm:right-6" />

            <div className="pointer-events-none fixed left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,#ff6a6a,transparent_50%),radial-gradient(circle_at_20%_20%,#46B1FF,transparent_40%)] opacity-10 blur-[100px]" />

            {/* Back Button - Top Left relative to container */}
            <div className="w-full max-w-4xl px-6 sm:px-12 pt-12 flex justify-start">
                <Link
                    href="/dashboard"
                    className="group flex-shrink-0"
                    aria-label="Back to Dashboard"
                >
                    <div className="grid h-10 w-10 place-items-center border border-[#2e2e2e] group-hover:border-[#DEF767] group-hover:bg-[#DEF767] group-hover:text-[#171717] transition-all">
                        <ArrowLeft size={18} />
                    </div>
                </Link>
            </div>

            {/* Header */}
            <header className="relative z-10 pt-4 px-6 sm:px-12 max-w-4xl flex flex-col items-center text-center">
                {/* <div className="flex items-center gap-3 mb-4">
                    <div className="h-[1px] w-12 bg-[#2e2e2e]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b5b5b]">Operational Hub / {transId}</span>
                    <div className="h-[1px] w-12 bg-[#2e2e2e]" />
                </div> */}

                <h1 className="font-serif text-[clamp(2.5rem,8vw,4rem)] uppercase leading-[0.9] tracking-tight">
                    Event <span className="text-[#DEF767]">Terminal</span>
                </h1>

                <p className="mt-8 font-sans text-[13px] leading-relaxed text-[#929292] max-w-[45ch]">
                    Select a module to initiate the protocol. Each event is a singular node in the UXISM architecture.
                </p>
            </header>

            {/* Event Grid */}
            <section className="relative z-10 mt-16 flex-1 px-6 sm:px-12 pb-32 w-full max-w-4xl">
                <div className="grid gap-4">
                    {EVENTS.map((event, index) => (
                        <EventRow
                            key={event.id}
                            event={event}
                            index={index}
                            onSelect={() => {
                                if (event.id === "persona-race" && isAlreadyAssigned) {
                                    setShowAlreadyAssignedPopup(true);
                                    return;
                                }
                                if (event.status === "ACTIVE") {
                                    setActiveEventId(event.id);
                                }
                            }}
                        />
                    ))}
                </div>

                {/* Technical Footnote */}
                <div className="mt-12 font-mono text-[9px] text-[#5b5b5b] uppercase tracking-widest flex items-center justify-center gap-4">
                    <Cpu size={12} />
                    <span>System Status: Optimal / {EVENTS.length} Nodes Online</span>
                </div>
            </section>

            {/* Right Rail FABs */}
            <aside className="fixed right-0 top-0 bottom-0 w-[20%] pointer-events-none hidden lg:flex flex-col items-end justify-end p-12 z-50">
                <div className="flex flex-col gap-4 pointer-events-auto">
                    <button className="group relative grid h-10 w-10 place-items-center rounded-full border border-[#5b5b5b] bg-[#181818] transition-all hover:border-[#DEF767]">
                        <Plus className="text-[#929292] group-hover:text-white" size={18} />
                    </button>
                    <button className="group relative grid h-10 w-10 place-items-center rounded-full border border-[#5b5b5b] bg-[#181818]">
                        <Hash className="text-[#DEF767]" size={18} />
                    </button>
                </div>
            </aside>

            {/* --- ALREADY ASSIGNED POPUP --- */}
            <AnimatePresence>
                {showAlreadyAssignedPopup && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        {/* Overlay backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAlreadyAssignedPopup(false)}
                            className="absolute inset-0 bg-[#181818]/90 backdrop-blur-md"
                        />

                        {/* Dot grid echo in popup */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.1] [background-image:radial-gradient(#5b5b5b_1px,transparent_1px)] [background-size:16px_16px]" />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative max-w-lg w-full bg-[#171717] border border-[#2e2e2e] p-12 overflow-hidden shadow-2xl"
                        >
                            {/* Corner Accents - Technical Aesthetic */}
                            <div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-[#ff6a6a]" />
                            <div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-[#ff6a6a]" />
                            <div className="absolute left-0 bottom-0 h-4 w-4 border-l border-b border-[#ff6a6a]" />
                            <div className="absolute right-0 bottom-0 h-4 w-4 border-r border-b border-[#ff6a6a]" />

                            {/* Close Button - NOTICEABLE CROSS BUTTON */}
                            <button
                                onClick={() => setShowAlreadyAssignedPopup(false)}
                                className="absolute top-4 right-4 h-10 w-10 grid place-items-center border border-[#2e2e2e] text-[#5b5b5b] hover:border-[#ff6a6a] hover:bg-[#ff6a6a] hover:text-[#171717] transition-all group z-10"
                                aria-label="Close popup"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="mb-8 relative">
                                    <div className="absolute inset-0 bg-[#ff6a6a]/20 blur-2xl rounded-full" />
                                    <div className="relative h-20 w-20 border border-[#ff6a6a]/30 grid place-items-center">
                                        <Shield size={40} className="text-[#ff6a6a]" />
                                    </div>
                                </div>

                                <h2 className="font-serif text-[clamp(1.5rem,4vw,2.5rem)] uppercase tracking-tighter leading-none mb-6">
                                    Protocol <span className="text-[#ff6a6a]">Restriction</span>
                                </h2>

                                <div className="space-y-4">
                                    <p className="font-sans text-[15px] text-white font-medium leading-relaxed max-w-sm">
                                        You are already assigned a persona.
                                    </p>
                                    <p className="font-sans text-[13px] text-[#929292] leading-relaxed max-w-sm">
                                        System scan indicates you have already secured a persona unit. Dual deployment within this shard is restricted to prevent architectural dissonance.
                                    </p>
                                    <p className="font-sans text-[12px] text-[#5b5b5b] italic">
                                        Proceed to the dashboard or team view to manage your current unit.
                                    </p>
                                </div>

                                <div className="mt-12 pt-8 border-t border-[#2e2e2e] w-full flex flex-col items-center gap-4">
                                    <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#5b5b5b]">Error_Log: DEPLOYMENT_LOCKED_X04</span>

                                    <button
                                        onClick={() => setShowAlreadyAssignedPopup(false)}
                                        className="h-12 px-10 border border-[#2e2e2e] font-mono text-[11px] uppercase tracking-widest text-[#929292] hover:border-[#DEF767] hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        Acknowledge
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}

function EventRow({ event, index, onSelect }: { event: typeof EVENTS[0], index: number, onSelect: () => void }) {
    const isLocked = event.status === "LOCKED";

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onSelect}
            className={`group relative flex flex-col sm:flex-row sm:items-center gap-6 border border-[#2e2e2e] p-6 cursor-pointer transition-all duration-300 ${isLocked ? "opacity-50 grayscale cursor-not-allowed" : "hover:border-[#DEF767] hover:bg-white/[0.02]"
                }`}
        >
            <div className="flex items-center gap-4 sm:w-1/3">
                <div className="h-10 w-10 grid place-items-center bg-[#171717] border border-[#2e2e2e] group-hover:border-[#DEF767]/50 transition-colors">
                    {event.icon}
                </div>
                <div className="text-left">
                    <div className="font-mono text-[9px] text-[#5b5b5b] mb-1">{event.tag}</div>
                    <h3 className="font-serif text-lg uppercase tracking-wider text-white group-hover:text-[#DEF767] transition-colors">
                        {event.title}
                    </h3>
                </div>
            </div>

            <p className="flex-1 font-sans text-[12px] text-[#929292] leading-relaxed max-w-md text-left">
                {event.description}
            </p>

            <div className="flex items-center justify-between sm:justify-end gap-8 sm:w-1/4">
                <div className="flex flex-col items-end">
                    <span className={`text-[9px] font-mono uppercase tracking-tighter px-2 py-0.5 border ${event.status === "ACTIVE" ? "text-[#DEF767] border-[#DEF767]/30" : "text-[#5b5b5b] border-[#2e2e2e]"
                        }`}>
                        {event.status}
                    </span>
                    <span className="text-[8px] font-mono text-[#5b5b5b] mt-1">{event.coord}</span>
                </div>
                <div className={`h-8 w-8 rounded-full grid place-items-center border transition-all ${isLocked ? "border-[#2e2e2e]" : "border-[#5b5b5b] group-hover:border-[#DEF767] group-hover:bg-[#DEF767] group-hover:text-[#171717]"
                    }`}>
                    <Play size={12} fill={!isLocked ? "currentColor" : "none"} />
                </div>
            </div>

            {/* Visual Accents */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DEF767] scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
        </motion.div>
    );
}
```

---

### File: `app/x/store/gameStore.tsx`

```tsx
// lib/gameStore.ts
// Lightweight React Context-based state store — no Redux needed for MVP.
// Swap persistence layer for Hasura mutations when backend is live.

'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Domain, Persona, Card, SlotState, User, CardType, CARD_TYPE_SLOT_MAP, GameMode } from '@/app/x/types/index';
import { RuleManager } from '@/app/x/lib/GameRules';

// ─── STATE ────────────────────────────────────────────────────
export interface GameState {
  currentUser:    User | null;
  selectedDomain: Domain | null;
  selectedPersona: Persona | null;
  correctCards:   Card[];
  deck:           Card[];
  pool:           Card[];
  discardPile:    Card[];
  slots:          SlotState;
  opponentCount:  number;
  gamePhase: 'USER_SELECT' | 'DOMAIN_SELECT' | 'PERSONA_SELECT' | 'PLAYING' | 'WON' | 'PERSONA_TAKEN' | 'LEADERBOARD';
  personaClaimed: boolean;
  personaTakenBy: string | null;
  gameMode:       GameMode;
  confirmCard:    Card | null;
  showTryAgainPopup: boolean;
  showDeck:       boolean;
  leaderboard:    Array<{
    user: User;
    persona: Persona;
    domain: Domain;
    claimedAt: string;
  }>;
}

const emptySlots: SlotState = { 
  AVATAR:      null, 
  PERSONA:     null, 
  SCENARIO:    null, 
  UX_PROBLEM:  null, 
  UI_PROBLEM:  null, 
  CX_PROBLEM:  null, 
  AI_PROBLEM:  null 
};

const initialState: GameState = {
  currentUser:     null,
  selectedDomain:  null,
  selectedPersona: null,
  correctCards:    [],
  deck:            [],
  pool:            [],
  discardPile:     [],
  slots:           emptySlots,
  opponentCount:   0,
  gamePhase:       'USER_SELECT',
  personaClaimed:  false,
  personaTakenBy:  null,
  gameMode:        'LOCK_ON_FILL',
  confirmCard:     null,
  showTryAgainPopup: false,
  showDeck:        true,
  leaderboard:     [],
};

// ─── ACTIONS ──────────────────────────────────────────────────
export type Action =
  | { type: 'SET_USER';           payload: User }
  | { type: 'SELECT_DOMAIN';      payload: Domain }
  | { type: 'SELECT_PERSONA';     payload: { persona: Persona; correctCards: Card[]; deck: Card[] } }
  | { type: 'PLACE_CARD';         payload: { card: Card } }
  | { type: 'DISCARD_CARD' }
  | { type: 'SET_OPPONENT_COUNT'; payload: number }
  | { type: 'PERSONA_CLAIMED_BY_ME' }
  | { type: 'PERSONA_TAKEN_BY';   payload: string }
  | { type: 'RESET_BOARD' }
  | { type: 'GO_TO_PHASE';        payload: GameState['gamePhase'] }
  | { type: 'SET_GAME_MODE';      payload: GameMode }
  | { type: 'SHOW_CONFIRM_POPUP'; payload: Card }
  | { type: 'CANCEL_CONFIRM' }
  | { type: 'SHOW_TRY_AGAIN' }
  | { type: 'HIDE_TRY_AGAIN' }
  | { type: 'PLACE_CARD_FORCE';   payload: { card: Card } }
  | { type: 'TOGGLE_DECK_VISIBILITY' };

function reducer(state: GameState, action: Action): GameState {
  // Ensure leaderboard exists to prevent HMR or state initialization issues
  const leaderboard = state.leaderboard || [];
  const safeState = { ...state, leaderboard };

  switch (action.type) {
    case 'SET_USER':
      return { ...safeState, currentUser: action.payload, gamePhase: 'DOMAIN_SELECT' };

    case 'SELECT_DOMAIN':
      return { ...safeState, selectedDomain: action.payload, gamePhase: 'PERSONA_SELECT' };

    case 'SELECT_PERSONA': {
      const { persona, correctCards, deck: initialPool } = action.payload;
      const avatarCard = correctCards.find(c => c.card_type === 'AVATAR') || null;
      
      const startingSlots = { 
        ...emptySlots, 
        AVATAR: avatarCard 
      };

      const remainingPool = avatarCard 
        ? initialPool.filter(c => c.id !== avatarCard.id)
        : initialPool;

      const initialDeck = RuleManager.rebuildDeck(remainingPool, startingSlots, state.gameMode);
      
      return {
        ...safeState,
        selectedPersona: persona,
        correctCards:    correctCards,
        pool:            remainingPool,
        discardPile:     [],
        deck:            initialDeck,
        slots:           startingSlots,
        gamePhase:       'PLAYING',
        personaClaimed:  false,
        personaTakenBy:  null,
      };
    }

    case 'PLACE_CARD': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
      };
    }

    case 'DISCARD_CARD': {
      if (state.deck.length === 0) return state;
      const discardedCard = state.deck[0];
      let newPool = state.pool.filter(c => c.id !== discardedCard.id);
      let newDiscardPile = [...state.discardPile, discardedCard];
      
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
      
      // Respawn left-swiped cards if deck is empty
      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
        newDiscardPile = [];
      }
      
      return { ...safeState, pool: newPool, discardPile: newDiscardPile, deck: newDeck };
    }

    case 'SET_OPPONENT_COUNT':
      return { ...safeState, opponentCount: action.payload };

    case 'PERSONA_CLAIMED_BY_ME': {
      const newClaim = {
        user: state.currentUser!,
        persona: state.selectedPersona!,
        domain: state.selectedDomain!,
        claimedAt: new Date().toISOString(),
      };
      return { 
        ...safeState, 
        gamePhase: 'WON', 
        personaClaimed: true,
        leaderboard: [newClaim, ...leaderboard]
      };
    }

    case 'PERSONA_TAKEN_BY':
      return { ...safeState, gamePhase: 'PERSONA_TAKEN', personaTakenBy: action.payload };

    case 'RESET_BOARD': {
      const avatarCard = state.correctCards.find(c => c.card_type === 'AVATAR') || null;
      const startingSlots = { ...emptySlots, AVATAR: avatarCard };
      
      // Collect all cards currently in slots and pool, except the fixed avatar card
      const allCards = [...state.pool, ...Object.values(state.slots).filter(Boolean) as Card[]];
      const newPool = allCards.filter(c => c.id !== avatarCard?.id).sort(() => Math.random() - 0.5);
      
      const newDeck = RuleManager.rebuildDeck(newPool, startingSlots, state.gameMode);
      return {
        ...safeState,
        slots:          startingSlots,
        pool:           newPool,
        discardPile:    [],
        deck:           newDeck,
        gamePhase:      'PLAYING',
        personaClaimed: false,
        personaTakenBy: null,
        showTryAgainPopup: false,
      };
    }

    case 'GO_TO_PHASE':
      return { ...safeState, gamePhase: action.payload };

    case 'SET_GAME_MODE': {
      const newMode = action.payload;
      let newPool = state.pool;
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
        newDiscardPile = [];
      }
      return { ...safeState, gameMode: newMode, deck: newDeck, pool: newPool, discardPile: newDiscardPile };
    }

    case 'SHOW_CONFIRM_POPUP':
      return { ...safeState, confirmCard: action.payload };

    case 'CANCEL_CONFIRM':
      return { ...safeState, confirmCard: null };

    case 'SHOW_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: true };

    case 'HIDE_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: false };

    case 'PLACE_CARD_FORCE': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
        confirmCard: null,
      };
    }

    case 'TOGGLE_DECK_VISIBILITY':
      return { ...safeState, showDeck: !state.showDeck };

    default:
      return state;
  }
}

// ─── CONTEXT ──────────────────────────────────────────────────
const GameContext = createContext<{
  state:    GameState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
```

---

### File: `app/x/types/index.ts`

```typescript
// lib/types.ts — Shared game types

export type CardType = 'AVATAR' | 'PERSONA' | 'SCENARIO' | 'UX_PROBLEM' | 'UI_PROBLEM' | 'CX_PROBLEM' | 'AI_PROBLEM';
export type PersonaStatus = 'AVAILABLE' | 'CLAIMED';
export type GameMode = 'LOCK_ON_FILL' | 'REPLACE_ALLOWED' | 'SOFT_LOCK';

export interface User {
  id: string;
  username: string;
  teamName?: string;
  teamMembers?: string[];
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Persona {
  id: string;
  name: string;
  domain_id: string;
  color_code: string;
  asset_path: string;
  status: PersonaStatus;
  claimed_by_user_id: string | null;
  claimed_at?: string | null; // Added to resolve the mockData build error
  description?: string;
  scenario?: string;
  ux_problems?: string;
  ui_problems?: string;
  cx_problems?: string;
  ai_problems?: string;
  persona_details?: string;
}

export interface Card {
  id: string;
  persona_id: string;
  domain_id: string;
  card_type: CardType;
  content: string;
  isUpgraded?: boolean;
  heading?: string;
  subHeading?: string;
  listItems?: string[];
  sections?: { label: string; value: string }[];
  bodyText?: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  persona_id: string;
  domain_id: string;
  slot_avatar_id: string | null;
  slot_persona_id: string | null;
  slot_scenario_id: string | null;
  slot_ux_problem_id: string | null;
  slot_ui_problem_id: string | null;
  slot_cx_problem_id: string | null;
  slot_ai_problem_id: string | null;
  is_complete: boolean;
}

export type SlotKey = 'AVATAR' | 'PERSONA' | 'SCENARIO' | 'UX_PROBLEM' | 'UI_PROBLEM' | 'CX_PROBLEM' | 'AI_PROBLEM';

export interface SlotState {
  AVATAR: Card | null;
  PERSONA: Card | null;
  SCENARIO: Card | null;
  UX_PROBLEM: Card | null;
  UI_PROBLEM: Card | null;
  CX_PROBLEM: Card | null;
  AI_PROBLEM: Card | null;
}

export const SLOT_ORDER: SlotKey[] = [
  'AVATAR',
  'PERSONA',
  'SCENARIO',
  'UX_PROBLEM',
  'UI_PROBLEM',
  'CX_PROBLEM',
  'AI_PROBLEM'
];

export const SLOT_LABELS: Record<SlotKey, string> = {
  AVATAR: 'Avatar',
  PERSONA: 'Persona',
  SCENARIO: 'Scenario',
  UX_PROBLEM: 'UX Problem',
  UI_PROBLEM: 'UI Problem',
  CX_PROBLEM: 'CX Problem',
  AI_PROBLEM: 'AI Problem',
};

export const CARD_TYPE_SLOT_MAP: Record<CardType, SlotKey> = {
  AVATAR: 'AVATAR',
  PERSONA: 'PERSONA',
  SCENARIO: 'SCENARIO',
  UX_PROBLEM: 'UX_PROBLEM',
  UI_PROBLEM: 'UI_PROBLEM',
  CX_PROBLEM: 'CX_PROBLEM',
  AI_PROBLEM: 'AI_PROBLEM',
};
```

---

### File: `components/AnimatedBanner.tsx`

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TextEffect = "blur-reveal" | "masked-slide" | "highlight" | "marquee" | "scramble";
export type FontType = "sans" | "sans" | "mono" | "display";

interface AnimatedBannerProps {
    text: string;
    effect: TextEffect;
    speed?: number; // Speed multiplier (e.g. 0.5x to 3x, default 1)
    blurStrength?: number; // Blur strength in pixels (default 12)
    font?: FontType; // Optional custom font family override
    fontSize?: number; // Main heading font size override in pixels
    repeat?: boolean; // Infinite repeat option for one-shot effects
    color?: string; // Custom text color hex code
}

const fontStyleMap: Record<FontType, string> = {
    // sans: "Georgia, sans",
    // sans: "var(--font-geist-sans), system-ui, sans-sans",
    sans: "system-ui, -apple-system, sans-sans",
    mono: "var(--font-mono), Courier New, Courier, monospace",
    display: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-sans'
};

export function AnimatedBanner({ text, effect, speed = 1, blurStrength = 12, font, fontSize, repeat = false, color = "#ffffff" }: AnimatedBannerProps) {
    const animSpeed = Math.max(0.1, speed);
    const animBlur = Math.max(0, blurStrength);
    console.log(color)
    // Determine font family: use custom override if provided, otherwise default to effect preferences
    const defaultFont: FontType = effect === "scramble" ? "mono" : effect === "blur-reveal" ? "sans" : "sans";
    const selectedFont = fontStyleMap[font || defaultFont];

    // Calculate Marquee Rotation Speed (duration in seconds)
    const marqueeDuration = Math.max(1, 20 / animSpeed);

    return (
        <div
            className="w-full flex items-center justify-center overflow-hidden border border-[#2e2e2e] p-8 rounded min-h-[140px] relative"
            style={{ backgroundColor: "var(--bg-inset)" }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${text}-${effect}-${animSpeed}-${animBlur}-${selectedFont}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 / animSpeed }}
                    className="w-full flex justify-center items-center"
                >
                    {/* 1. Apple-Style Blur Reveal */}
                    {effect === "blur-reveal" && (
                        <motion.h1
                            initial={{ filter: `blur(${animBlur}px)`, opacity: 0, scale: 0.95 }}
                            animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                            transition={{
                                duration: 1.2 / animSpeed,
                                ease: "easeOut",
                                repeat: repeat ? Infinity : 0,
                                repeatType: "reverse",
                                repeatDelay: 2
                            }}
                            className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white text-center"
                            style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                        >
                            {text}
                        </motion.h1>
                    )}

                    {/* 2. Agency Masked Slide-Up */}
                    {effect === "masked-slide" && (
                        <div className="overflow-hidden py-2">
                            <motion.h1
                                initial={{ y: "100%" }}
                                animate={{ y: "0%" }}
                                transition={{
                                    duration: 0.9 / animSpeed,
                                    ease: [0.16, 1, 0.3, 1],
                                    repeat: repeat ? Infinity : 0,
                                    repeatType: "loop",
                                    repeatDelay: 2
                                }}
                                className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-white text-center tracking-wide"
                                style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                            >
                                {text}
                            </motion.h1>
                        </div>
                    )}

                    {/* 3. SaaS Animated Highlight */}
                    {effect === "highlight" && (
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white text-center" style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}>
                            <span className="relative inline-block px-4 py-1 text-black">
                                <motion.span
                                    className="absolute inset-0 bg-[#DEF767] rounded"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    style={{ originX: 0 }}
                                    transition={{
                                        duration: 0.9 / animSpeed,
                                        delay: 0.2 / animSpeed,
                                        ease: "easeInOut",
                                        repeat: repeat ? Infinity : 0,
                                        repeatType: "reverse",
                                        repeatDelay: 2
                                    }}
                                />
                                <span className="relative z-10">{text}</span>
                            </span>
                        </h1>
                    )}

                    {/* 4. Trendy Infinite Marquee */}
                    {effect === "marquee" && (
                        <div className="relative w-full overflow-hidden whitespace-nowrap py-4">
                            <style>{`
                                @keyframes customMarquee {
                                    0% { transform: translateX(0%); }
                                    100% { transform: translateX(-50%); }
                                }
                                .animate-custom-marquee {
                                    display: inline-block;
                                    white-space: nowrap;
                                }
                            `}</style>
                            <div
                                className="animate-custom-marquee"
                                style={{
                                    animation: `customMarquee ${marqueeDuration}s linear infinite`
                                }}
                            >
                                <span
                                    className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
                                    style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                                >
                                    {text} • {text} • {text} • {text} •
                                </span>
                                <span
                                    className="text-2xl md:text-4xl lg:text-5xl font-black uppercase text-[#DEF767] tracking-wider mx-4"
                                    style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                                >
                                    {text} • {text} • {text} • {text} •
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 5. Hacker Text Scramble / Decode */}
                    {effect === "scramble" && (
                        <h1
                            className="text-xl md:text-3xl lg:text-4xl font-mono text-[#DEF767] text-center tracking-wider"
                            style={{ fontFamily: selectedFont, fontSize: fontSize ? `${fontSize}px` : undefined, color: color }}
                        >
                            <ScrambleText text={text} speed={animSpeed} repeat={repeat} />
                        </h1>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function ScrambleText({ text, speed, repeat }: { text: string; speed: number; repeat?: boolean }) {
    const [displayedText, setDisplayedText] = useState("");
    const [triggerKey, setTriggerKey] = useState(0);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%-=!?";

    useEffect(() => {
        let isMounted = true;
        let iterations = 0;
        const intervalTime = Math.max(8, Math.round(25 / speed));

        const interval = setInterval(() => {
            if (!isMounted) return;

            const result = text
                .split("")
                .map((char, index) => {
                    if (index < iterations) {
                        return text[index];
                    }
                    if (char === " ") return " ";
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            setDisplayedText(result);

            if (iterations >= text.length) {
                clearInterval(interval);
                if (repeat) {
                    setTimeout(() => {
                        if (isMounted) {
                            setTriggerKey((prev) => prev + 1);
                        }
                    }, 3000);
                }
            }
            iterations += speed / 3.5; // Decode pace proportional to speed setting
        }, intervalTime);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [text, speed, triggerKey, repeat]);

    return <span>{displayedText}</span>;
}

```

---

### File: `components/Field 2.tsx`

```tsx
export default function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</span>
            {children}
            {error && <span className="block text-[12px] leading-5 text-[#ff6a6a]">{error}</span>}
        </label>
    );
}

```

---

### File: `components/Field.tsx`

```tsx
export default function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-2">
            <span className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">{label}</span>
            {children}
            {error && <span className="block text-[12px] leading-5 text-[#ff6a6a]">{error}</span>}
        </label>
    );
}

```

---

### File: `components/core/ConfirmPopup/ConfirmPopup.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--deep-bg);
  border: 1px solid var(--lime);
  padding: 24px;
  border-radius: 12px;
  width: min(320px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.title {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--primary);
  margin: 0;
}
.desc {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--secondary);
  margin: 0;
  line-height: 1.4;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.btnCancel {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 8px 16px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
}
.btnConfirm {
  background: var(--lime);
  border: 1px solid var(--lime);
  color: #000;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-weight: bold;
  font-size: 11px;
  cursor: pointer;
}

```

---

### File: `components/core/ConfirmPopup/ConfirmPopup.tsx`

```tsx
'use client';
import { useGame } from '@/store/gameStore';
import { isFlowComplete } from '@/data/mockData';
import { CARD_TYPE_SLOT_MAP, CardType } from '@/types';
import styles from './ConfirmPopup.module.css';

export default function ConfirmPopup() {
  const { state, dispatch } = useGame();
  if (!state.confirmCard) return null;

  const handleConfirm = () => {
    dispatch({ type: 'PLACE_CARD_FORCE', payload: { card: state.confirmCard! } });
    
    // Check if flow complete
    const slotKey = CARD_TYPE_SLOT_MAP[state.confirmCard!.card_type as CardType];
    const newSlots = { ...state.slots, [slotKey]: state.confirmCard };
    if (isFlowComplete(newSlots, state.correctCards)) {
      setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
    } else {
      const isFull = Object.values(newSlots).every(c => c !== null);
      if (isFull) {
        setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
      }
    }
  };

  const handleCancel = () => {
    dispatch({ type: 'CANCEL_CONFIRM' });
    dispatch({ type: 'DISCARD_CARD' }); // discards the top card because they cancelled replacement
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Replace existing card?</h3>
        <p className={styles.desc}>
          You are about to replace your current {state.confirmCard.card_type} with a RARE upgraded version.
        </p>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={handleCancel}>Cancel</button>
          <button className={styles.btnConfirm} onClick={handleConfirm}>Replace</button>
        </div>
      </div>
    </div>
  );
}

```

---

### File: `components/core/FABRail/FABRail.module.css`

```css
.rail {
  position: fixed;
  right: 20px;
  bottom: 32px;
  z-index: 150;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fab {
  width: 40px;
  height: 40px;
  border-radius: 24px;
  background: #181818;
  border: 1px solid var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s ease;
  color: var(--muted);
  font-size: 16px;
  font-family: var(--font-mono);
}

.fab:hover {
  border-color: rgba(222, 247, 103, 0.5);
  color: var(--lime);
}

.fabActive {
  border-color: rgba(222, 247, 103, 0.5) !important;
  color: var(--lime) !important;
}

.icon {
  line-height: 1;
  display: block;
}

```

---

### File: `components/core/FABRail/FABRail.tsx`

```tsx
'use client';
// components/FABRail.tsx — UXISM right 25% rail: Recenter + Explore FABs only
import { useState } from 'react';
import styles from './FABRail.module.css';

export default function FABRail() {
  const [recentered, setRecentered] = useState(false);

  function handleRecenter() {
    setRecentered(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setRecentered(false), 800);
  }

  return (
    <aside className={styles.rail} aria-label="Quick action buttons">
      {/* FAB 1 — Recenter */}
      <button
        id="fab-recenter"
        className={`${styles.fab} ${recentered ? styles.fabActive : ''}`}
        onClick={handleRecenter}
        aria-label="Scroll to top"
        title="Recenter"
      >
        <span className={styles.icon} aria-hidden="true">⌖</span>
      </button>

      {/* FAB 2 — Explore / toggle hint */}
      <button
        id="fab-explore"
        className={styles.fab}
        onClick={() => {}}
        aria-label="Explore personas"
        title="Explore"
      >
        <span className={styles.icon} aria-hidden="true">+</span>
      </button>
    </aside>
  );
}

```

---

### File: `components/core/TopBar/TopBar.module.css`

```css
.bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  background: rgba(24, 24, 24, 0.92);
  backdrop-filter: blur(10px);
}

.back {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  font-family: var(--font-mono);
  transition: color 0.12s;
  line-height: 1;
  flex-shrink: 0;
}
.back:hover { color: var(--primary); }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  min-width: 0;
  overflow: hidden;
}

.domain  { color: var(--muted); flex-shrink: 0; }
.sep     { color: var(--border); flex-shrink: 0; }
.persona {
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Progress pips (center) ── */
.center {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  margin: 0 auto;
}

.pip {
  display: block;
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  transition: background 0.25s ease;
}

.pipFilled {
  background: var(--lime);
  box-shadow: 0 0 5px rgba(222,247,103,0.5);
}

/* ── Right ── */
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.layoutToggle {
  background: none;
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.layoutToggle:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.toggleOff {
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.05);
}

.oppLabel {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.06em;
  white-space: nowrap;
  display: none; /* hidden on very small screens */
}

@media (min-width: 380px) {
  .oppLabel { display: block; }
}

.userChip {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--secondary);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 2px;
  background: var(--deep-bg);
  white-space: nowrap;
}

```

---

### File: `components/core/TopBar/TopBar.tsx`

```tsx
'use client';
import { useGame } from '@/store/gameStore';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { state, dispatch } = useGame();
  const { selectedDomain, selectedPersona, opponentCount, currentUser, slots } = state;
  const filled = Object.values(slots).filter(Boolean).length;

  return (
    <header className={styles.bar} role="banner">
      <button
        id="back-to-persona"
        className={styles.back}
        onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'PERSONA_SELECT' })}
        aria-label="Back to persona selection"
      >
        ←
      </button>

      <div className={styles.breadcrumb}>
        <span className={styles.domain}>{selectedDomain?.name}</span>
        <span className={styles.sep} aria-hidden="true">/</span>
        <span className={styles.persona} style={{ color: selectedPersona?.color_code ?? '#fff' }}>
          {selectedPersona?.name}
        </span>
      </div>

      {/* Progress pips — center */}
      <div className={styles.center} aria-label={`${filled} of 7 slots filled`}>
        {[0,1,2,3,4,5,6].map(i => (
          <span
            key={i}
            className={`${styles.pip} ${i < filled ? styles.pipFilled : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className={styles.right}>
        <span className={styles.oppLabel} aria-live="polite">
          {opponentCount > 0 ? `${opponentCount} rival${opponentCount > 1 ? 's' : ''}` : 'Solo'}
        </span>
        <span className={styles.userChip}>{currentUser?.username}</span>
      </div>
    </header>
  );
}


```

---

### File: `components/core/TryAgainPopup/TryAgainPopup.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--deep-bg);
  border: 1px solid var(--lime);
  padding: 24px;
  border-radius: 12px;
  width: min(320px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.title {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--primary);
  margin: 0;
}
.desc {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--secondary);
  margin: 0;
  line-height: 1.4;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.btnConfirm {
  background: var(--lime);
  border: 1px solid var(--lime);
  color: #000;
  padding: 8px 16px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-weight: bold;
  font-size: 11px;
  cursor: pointer;
}

```

---

### File: `components/core/TryAgainPopup/TryAgainPopup.tsx`

```tsx
'use client';
import { useGame } from '@/store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export default function TryAgainPopup() {
  const { state, dispatch } = useGame();
  
  return (
    <AnimatePresence>
      {state.showTryAgainPopup && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: 'HIDE_TRY_AGAIN' })}
            className="absolute inset-0 bg-[#181818]/90 backdrop-blur-md" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative max-w-md w-full bg-[#171717] border border-[#ff6a6a]/30 p-10 shadow-2xl overflow-hidden"
          >
            {/* Technical Accents */}
            <div className="absolute top-0 left-0 h-4 w-4 border-l border-t border-[#ff6a6a]" />
            <div className="absolute top-0 right-0 h-4 w-4 border-r border-t border-[#ff6a6a]" />
            <div className="absolute bottom-0 left-0 h-4 w-4 border-l border-b border-[#ff6a6a]" />
            <div className="absolute bottom-0 right-0 h-4 w-4 border-r border-b border-[#ff6a6a]" />

            <div className="flex flex-col items-center text-center">
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-[#ff6a6a]/20 blur-2xl rounded-full" />
                <div className="relative h-16 w-16 border border-[#ff6a6a]/30 grid place-items-center text-[#ff6a6a]">
                  <AlertTriangle size={32} />
                </div>
              </div>

              <h3 className="font-serif text-3xl uppercase tracking-tighter text-white mb-4">
                Flow <span className="text-[#ff6a6a]">Dissonance</span>
              </h3>
              
              <p className="font-sans text-[13px] text-[#929292] leading-relaxed mb-10 max-w-[28ch]">
                The current architectural alignment does not match the target persona. Dual-link failure detected.
              </p>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => dispatch({ type: 'RESET_BOARD' })}
                  className="group flex items-center justify-center gap-3 w-full h-12 bg-[#ff6a6a] text-[#171717] font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-white transition-all duration-300"
                >
                  <RotateCcw size={14} className="group-hover:rotate-[-90deg] transition-transform duration-500" />
                  Wipe Board Protocol
                </button>
                
                <button 
                  onClick={() => dispatch({ type: 'HIDE_TRY_AGAIN' })}
                  className="w-full h-12 border border-[#2e2e2e] text-[#5b5b5b] font-mono text-[10px] uppercase tracking-widest hover:border-[#DEF767] hover:text-white transition-all"
                >
                  Dismiss_Warning
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-[#2e2e2e] w-full">
                <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-[#5b5b5b]">Error_Code: SEQUENCE_MISMATCH_X04</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

```

---

### File: `components/game/FlowMiniCard/FlowMiniCard.module.css`

```css
.miniCard {
  width: 100px;
  height: 140px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  padding: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.topRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.stepNum {
  font-family: var(--font-mono);
  font-size: 9px;
  color: rgba(0, 0, 0, 0.4);
  font-weight: 700;
}

.personaIcon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: brightness(0);
  opacity: 0.6;
}

.label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}

.contentWrapper {
  flex: 1;
  display: flex;
  align-items: flex-start;
}

.content {
  font-size: 10px;
  color: #000;
  margin: 0;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.decorative {
  position: absolute;
  bottom: 8px;
  left: 10px;
  right: 10px;
  height: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.line {
  height: 1px;
  background: rgba(0,0,0,0.1);
  width: 100%;
}

.dots {
  height: 2px;
  background-image: radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px);
  background-size: 4px 4px;
  width: 100%;
}

```

---

### File: `components/game/FlowMiniCard/FlowMiniCard.tsx`

```tsx
'use client';
import { motion } from 'framer-motion';
import { Card, Persona } from '@/types';
import styles from './FlowMiniCard.module.css';

interface Props {
  card: Card;
  persona?: Persona;
  index: number;
  label: string;
}

export default function FlowMiniCard({ card, persona, index, label }: Props) {
  const color = persona?.color_code ?? '#2e2e2e';
  
  return (
    <div 
      className={styles.miniCard}
      style={{ backgroundColor: color, borderColor: color } as React.CSSProperties}
    >
      <div className={styles.topRow}>
        <span className={styles.stepNum}>{String(index + 1).padStart(2, '0')}</span>
        {persona && (
          <img src={persona.asset_path} alt="" className={styles.personaIcon} />
        )}
      </div>
      
      <div className={styles.label}>{label}</div>
      
      <div className={styles.contentWrapper}>
        <p className={styles.content}>{card.heading || card.bodyText || ''}</p>
      </div>
      
      <div className={styles.decorative}>
        <div className={styles.line} />
        <div className={styles.dots} />
      </div>
    </div>
  );
}

```

---

### File: `components/game/FlowSlots/FlowSlots.module.css`

```css
.section {
  width: 100%;
  padding: 6px 0;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

.scrollRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  padding: 0 2px;
}

.slotGroup {
  display: flex;
  align-items: center;
  gap: 1px;
}

/* .slot { */
  /* width: 36px; */
  /* height: 50px; */
  /* border-radius: 4px; */
  /* border: 1px solid rgba(255, 255, 255, 0.1); */
  /* background: rgba(255, 255, 255, 0.02); */
  /* display: flex; */
  /* flex-direction: column; */
  /* padding: 2px; */
  /* transition: all 0.3s ease; */
  /* overflow: hidden; */
  /* position: relative; */
  /* flex-shrink: 0; */
/* } */
/*  */
/* .miniCardScale { */
  /* transform: scale(0.36); Scale 100x140 down to 36x50 approx */
  /* transform-origin: top left; */
  /* position: absolute; */
  /* top: 0; */
  /* left: 0; */
/* } */

.slot {
  width: 34px; /* Reduced from 36px */
  height: 48px; /* Reduced from 50px */
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  padding: 2px;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.miniCardScale {
  transform: scale(0.34); /* Matches the new width */
  transform-origin: top left;
  position: absolute;
  top: 0;
  left: 0;
}

.slotEmpty {
  border-style: solid;
}

.stepNum {
  font-family: var(--font-mono);
  font-size: 6px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0px;
}

.slotLabel {
  font-family: var(--font-display);
  font-size: 7px;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1;
}

.arrowWrap {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 50%;
}

```

---

### File: `components/game/FlowSlots/FlowSlots.tsx`

```tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { SLOT_ORDER, SLOT_LABELS, SlotKey } from '@/types';
import { MOCK_PERSONAS } from '@/data/mockData';
import FlowMiniCard from '@/components/game/FlowMiniCard/FlowMiniCard';
import styles from './FlowSlots.module.css';

function FlowArrow({ active }: { active: boolean }) {
  return (
    <div className={styles.arrowWrap} style={{ opacity: active ? 1 : 0.15 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m13 7 5 5-5 5" />
      </svg>
    </div>
  );
}

export default function FlowSlots() {
  const { state } = useGame();
  const { slots } = state;

  return (
    <section className={styles.section} aria-label="Flow sequence">
      <div className={styles.scrollRow}>
        {SLOT_ORDER.map((slotKey: SlotKey, idx) => {
          const card = slots[slotKey];
          const filled = card !== null;
          const persona = card ? MOCK_PERSONAS.find(p => p.id === card.persona_id) : null;
          
          // Arrow is active if current and previous (if any) are filled
          const prevSlotKey = idx > 0 ? SLOT_ORDER[idx - 1] : null;
          const prevFilled = prevSlotKey ? slots[prevSlotKey] !== null : true;
          
          return (
            <div key={slotKey} className={styles.slotGroup}>
              {idx > 0 && <FlowArrow active={prevFilled && filled} />}
              
              {filled ? (
                <div className={styles.slot}>
                  <div className={styles.miniCardScale}>
                    <FlowMiniCard 
                      card={card} 
                      persona={persona || undefined} 
                      index={idx} 
                      label={SLOT_LABELS[slotKey]} 
                    />
                  </div>
                </div>
              ) : (
                <div className={`${styles.slot} ${styles.slotEmpty}`}>
                  <span className={styles.stepNum}>{String(idx + 1).padStart(2, '0')}</span>
                  <span className={styles.slotLabel}>{SLOT_LABELS[slotKey]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}


```

---

### File: `components/game/GameBoard/GameBoard.module.css`

```css
.board {
  position: relative;
  z-index: 2;
  height: 100svh;            /* fixed viewport height */
  overflow: hidden;          /* prevent scrolling */
  display: flex;
  flex-direction: column;
  touch-action: none;        /* prevent pull-to-refresh and bounce */
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding-top: 52px;
  overflow: hidden;
}

/* Flow slots get a fixed height band */
.flowWrapper {
  flex-shrink: 0;
  padding: 8px 0 0;
}

/* Deck takes remaining space, centered */
.deckWrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 24px;
}

/* ── Waterfall Mode (Mode 2) ── */
.content.waterfallMode {
  flex-direction: row;
  justify-content: space-between;
  padding-top: 60px;
  overflow: hidden;
}

.content.waterfallMode .flowWrapper {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.content.waterfallMode .deckWrapper {
  flex: 0 0 45%;
  justify-content: flex-start;
  padding-top: 32px;
  padding-right: 16px;
}

```

---

### File: `components/game/GameBoard/GameBoard.tsx`

```tsx
'use client';
import { useGame } from '@/store/gameStore';
import TopBar from '@/components/core/TopBar/TopBar';
import FlowSlots from '@/components/game/FlowSlots/FlowSlots';
import SwipeDeck from '@/components/game/SwipeDeck/SwipeDeck';
import WinScreen from '@/components/views/WinScreen/WinScreen';
import PersonaTakenScreen from '@/components/views/PersonaTakenScreen/PersonaTakenScreen';
import DebugPanel from '@/debug/DebugPanel/DebugPanel';
import ConfirmPopup from '@/components/core/ConfirmPopup/ConfirmPopup';
import TryAgainPopup from '@/components/core/TryAgainPopup/TryAgainPopup';
import { useEffect } from 'react';
import { useSubscription } from '@apollo/client/react';
import { WATCH_TEAMS } from '@/lib/GameRules/game-queries';
import styles from './GameBoard.module.css';

export default function GameBoard() {
  const { state, dispatch } = useGame();

  const { data } = useSubscription<{ teams: any[] }>(WATCH_TEAMS, {
    skip: !state.selectedPersona || state.gamePhase === 'WON' || state.gamePhase === 'PERSONA_TAKEN',
  });

  console.log("using")

  useEffect(() => {
    if (!data || !state.selectedPersona || !state.currentUser) return;
    const rivalTeam = data.teams.find(
      (team: any) => team.color === state.selectedPersona?.color_code
    );
    if (rivalTeam && rivalTeam.leader_id !== state.currentUser.id) {
      dispatch({
        type: 'PERSONA_TAKEN_BY',
        payload: rivalTeam.user?.name || 'Another player'
      });
    }
  }, [data, state.selectedPersona, state.currentUser, dispatch]);

  return (
    <main className={styles.board} aria-label="Game board">
      <TopBar />

      <div className={styles.content}>
        {/* ── Middle: 5 flow slots ── */}
        <div className={styles.flowWrapper}>
          <FlowSlots />
        </div>

        {/* ── Bottom: swipe deck ── */}
        <div className={styles.deckWrapper}>
          <SwipeDeck />
        </div>
      </div>

      {/* Overlays */}
      {state.gamePhase === 'WON' && <WinScreen userId={state.currentUser?.id}/>}
      {state.gamePhase === 'PERSONA_TAKEN' && <PersonaTakenScreen />}

      <DebugPanel />
      <ConfirmPopup />
      <TryAgainPopup />
    </main>
  );
}


```

---

### File: `components/game/HandFan/HandFan.module.css`

```css
.container {
  position: absolute;
  bottom: 80px; /* Moved further upward */
  left: 0;
  width: 100%;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  overflow: visible;
  pointer-events: none;
  z-index: 40;
}

.fanArea {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.cardWrapper {
  position: absolute;
  width: 60px;
  height: 80px;
  bottom: 0;
  pointer-events: auto;
  filter: drop-shadow(0 -2px 8px rgba(0,0,0,0.5));
  transition: transform 0.2s ease;
}

.cardWrapper:hover {
  transform: translateY(-10px) scale(1.1) !important;
  z-index: 100 !important;
}

.cardScale {
  width: 100%;
  height: 100%;
  transform-origin: bottom center;
}

```

---

### File: `components/game/HandFan/HandFan.tsx`

```tsx
'use client';
import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { SLOT_ORDER } from '@/types';
import { MOCK_PERSONAS } from '@/data/mockData';
import styles from './HandFan.module.css';

import FlowMiniCard from '@/components/game/FlowMiniCard/FlowMiniCard';
import { SLOT_LABELS } from '@/types';

export default function HandFan() {
  const { state } = useGame();
  const { slots } = state;

  // Filter slots to get an array of filled cards in order
  const filledSlots = SLOT_ORDER
    .map(key => ({ key, card: slots[key] }))
    .filter(item => item.card !== null);

  if (filledSlots.length === 0) return null;

  const totalCards = filledSlots.length;
  // Reduced spread angle to keep cards within screen bounds
  const spreadAngle = 70; 
  const angleStep = totalCards > 1 ? spreadAngle / (totalCards - 1) : 0;
  const startAngle = -(spreadAngle / 2);

  return (
    <div className={styles.container}>
      <div className={styles.fanArea}>
        {filledSlots.map((item, idx) => {
          const { key, card } = item;
          const persona = MOCK_PERSONAS.find(p => p.id === card!.persona_id);
          const rotation = startAngle + (idx * angleStep);
          
          return (
            <Fragment key={card!.id}>
              <motion.div
                className={styles.cardWrapper}
                initial={{ opacity: 0, scale: 0.5, y: 100 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  rotate: rotation,
                  zIndex: idx + 10,
                }}
                style={{
                  transformOrigin: '50% 200%', 
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <div className={styles.cardScale}>
                  <FlowMiniCard
                    card={card!}
                    persona={persona}
                    index={SLOT_ORDER.indexOf(key)}
                    label={SLOT_LABELS[key]}
                  />
                </div>
              </motion.div>

              {/* Progress Arrow between cards */}
              {idx < totalCards - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3, rotate: startAngle + (idx * angleStep) + (angleStep / 2) }}
                  className="absolute bottom-10 h-10 w-4 flex items-center justify-center pointer-events-none"
                  style={{
                    transformOrigin: '50% 400%', // Position it in the arc
                  }}
                >
                   <span className="text-white text-[10px]">→</span>
                </motion.div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

```

---

### File: `components/game/PersonaFlowCard/DecorativeLines.tsx`

```tsx
'use client';
import React from 'react';
import styles from './PersonaFlowCard.module.css';

interface DecorativeLinesProps {
  variant: string;
}

export default function DecorativeLines({ variant }: DecorativeLinesProps) {
  return (
    <svg className={styles.decorativeLayer} viewBox="0 0 350 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Identity Variant Lines */}
      {variant === 'identity' && (
        <>
          <path 
            d="M350 50 C280 50, 175 100, 175 160" 
            stroke="black" 
            strokeWidth="2" 
            strokeDasharray="6 6" 
          />
          <circle cx="175" cy="165" r="4" fill="black" />
        </>
      )}

      {/* Description Variant Lines */}
      {variant === 'description' && (
        <>
          <path d="M0 60 C50 60, 80 80, 100 80" stroke="black" strokeWidth="2" />
          <path d="M100 80 L92 75 L92 85 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle right */}
          
          <path d="M350 40 C300 40, 250 60, 200 60" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
        </>
      )}

      {/* Scenario Variant Lines */}
      {variant === 'scenario' && (
        <>
          <path d="M0 50 C40 50, 60 70, 80 70" stroke="black" strokeWidth="2" />
          <path d="M80 70 L72 65 L72 75 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle right */}
          
          <path d="M175 350 C175 400, 250 450, 350 450" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="175" cy="345" r="4" fill="black" />
        </>
      )}

      {/* Task Variant Lines */}
      {variant === 'task' && (
        <>
          <path d="M350 60 C300 60, 250 80, 200 80" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
          
          <path d="M40 500 C40 450, 60 420, 175 420" stroke="black" strokeWidth="2" />
          <path d="M175 420 L170 428 L180 428 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle up */}
        </>
      )}

      {/* Task Flow Variant Lines */}
      {variant === 'taskFlow' && (
        <>
          <path d="M0 60 C50 60, 80 80, 100 80" stroke="black" strokeWidth="2" />
          <path d="M100 80 L92 75 L92 85 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle right */}
          
          <path d="M175 460 C230 460, 280 470, 350 480" stroke="black" strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="175" cy="460" r="4" fill="black" />
        </>
      )}

      {/* Persuasion Variant Lines */}
      {variant === 'persuasion' && (
        <>
          <path d="M40 500 C40 450, 80 420, 175 420" stroke="black" strokeWidth="2" />
          <path d="M175 420 L170 428 L180 428 Z" fill="none" stroke="black" strokeWidth="1.5" /> {/* Triangle up */}
        </>
      )}
    </svg>
  );
}

```

---

### File: `components/game/PersonaFlowCard/PersonaFlowCard.module.css`

```css
.cardContainer {
  position: relative;
  width: 100%;
  aspect-ratio: 350 / 500;
  border-radius: 40px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px 25px 40px;
  box-sizing: border-box;
  color: #000;
  font-family: var(--font-display, 'Inter', sans-serif);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.cardContainer * {
  z-index: 1;
}

.logoWrapper {
  position: absolute;
  bottom: 25px;
  right: 15px;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  z-index: 2;
}

.topRightIconWrapper {
  position: absolute;
  top: 30px;
  right: 15px;
  width: 40px;
  height: 40px;
  z-index: 2;
}




/* Typography */
.heading {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.05;
  text-align: left;
  margin: 0;
  letter-spacing: -0.02em;
}

.subHeading {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  opacity: 0.5;
  text-align: left;
  margin-top: 6px;
}

.bodyText {
  font-size: 1rem;
  line-height: 1.4;
  text-align: left;
  font-weight: 500;
  margin: 20px 0 0;
  color: rgba(0, 0, 0, 0.85);
}

/* Variant Specific Styles */

/* Identity Variant */
.identityContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-top: 10px;
  gap: 5px;
}

.avatarCircle {
  position: relative;
  width: 200px;
  height: 200px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.avatarGraphic {
  width: 110%;
  height: 110%;
  object-fit: contain;
}

/* Description Variant */
.descriptionContent {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
  flex: 1;
}

.textSection {
  padding: 3px 0;
  border-bottom: none;
}

.textSection:last-child {
  border-bottom: none;
}

.sectionLabel {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 2px;
  opacity: 0.4;
  letter-spacing: 0.05em;
}

.sectionValue {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

/* Task Flow Variant (List) */
.numberedList {
  list-style: none;
  padding: 0;
  margin: 15px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  flex: 1;
}

.listItem {
  display: flex;
  gap: 10px;
  font-size: 1rem;
  font-weight: 600;
  align-items: flex-start;
  line-height: 1.3;
  color: rgba(0, 0, 0, 0.85);
}

.listNumber {
  opacity: 0.2;
  font-weight: 800;
  font-size: 1.1rem;
}

/* Persuasion Variant */
.persuasionContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding-top: 10px;
  gap: 5px;
}

.framingLabel {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.5;
  margin-bottom: -15px;
}

.bottomGraphicWrapper {
  width: 80px;
  height: 80px;
  margin-top: 10px;
}
```

---

### File: `components/game/PersonaFlowCard/PersonaFlowCard.tsx`

```tsx
'use client';
import React from 'react';
import styles from './PersonaFlowCard.module.css';
import DecorativeLines from './DecorativeLines';

export type CardVariant = 'identity' | 'description' | 'scenario' | 'task' | 'taskFlow' | 'persuasion';

interface PersonaFlowCardProps {
  variant: CardVariant;
  baseHexColor: string;
  logoSvg?: React.ReactNode;
  topRightIcon?: React.ReactNode;
  centralGraphic?: React.ReactNode;
  bottomGraphic?: React.ReactNode;
  
  // Dynamic Text Props
  heading?: string;
  subHeading?: string;
  bodyText?: string;
  listItems?: string[]; // For taskFlow
  sections?: { label: string; value: string }[]; // For description
}

export default function PersonaFlowCard({
  variant,
  baseHexColor,
  logoSvg,
  topRightIcon,
  centralGraphic,
  bottomGraphic,
  heading,
  subHeading,
  bodyText,
  listItems,
  sections,
}: PersonaFlowCardProps) {
  
  const renderContent = () => {
    switch (variant) {
      case 'identity':
        return (
          <div className={styles.identityContent}>
            <div className={styles.avatarCircle}>
              {centralGraphic}
            </div>
            <h1 className={styles.heading}>{heading}</h1>
          </div>
        );

      case 'description':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
              <p className={styles.subHeading}>{subHeading}</p>
            </header>
            <div className={styles.descriptionContent}>
              {sections?.map((section, idx) => (
                <div key={idx} className={styles.textSection}>
                  <div className={styles.sectionLabel}>{section.label}</div>
                  <div className={styles.sectionValue}>{section.value}</div>
                </div>
              ))}
            </div>
          </>
        );

      case 'scenario':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <div className={styles.bodyText}>{bodyText}</div>
          </>
        );

      case 'task':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <div className={styles.bodyText}>{bodyText}</div>
          </>
        );

      case 'taskFlow':
        return (
          <>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <ol className={styles.numberedList}>
              {listItems?.map((item, idx) => (
                <li key={idx} className={styles.listItem}>
                  <span className={styles.listNumber}>{idx + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </>
        );

      case 'persuasion':
        return (
          <div className={styles.persuasionContent}>
            <header>
              <h1 className={styles.heading}>{heading}</h1>
            </header>
            <div className={styles.framingLabel}>{subHeading}</div>
            <div className={styles.bodyText}>{bodyText}</div>
            <div className={styles.bottomGraphicWrapper}>
              {bottomGraphic}
            </div>
          </div>
        );

      default:
        return null;
    }
  };
  
  return (
    <div 
      className={styles.cardContainer} 
      style={{ backgroundColor: baseHexColor }}
    >
      {topRightIcon && (
        <div className={styles.topRightIconWrapper}>
          {topRightIcon}
        </div>
      )}

      {renderContent()}
    </div>
  );
}



```

---

### File: `components/game/PersonaGameEvent/PersonaGameEvent.tsx`

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { GET_USER_CLAIM } from "@/lib/GameRules/game-queries";

// Auth & Game Store Integration
import { useAuth } from "@/context/token-context";
import { GameProvider, useGame } from "@/store/gameStore";

// Game Phase Components
import DomainSelect from "@/components/onboarding/DomainSelect/DomainSelect";
import PersonaSelect from "@/components/onboarding/PersonaSelect/PersonaSelect";
import GameBoard from "@/components/game/GameBoard/GameBoard";
import Leaderboard from "@/components/views/Leaderboard/Leaderboard";
import { ArrowLeft } from "lucide-react";

function GameOrchestrator({ onBack }: { onBack: () => void }) {
    const { state, dispatch } = useGame();
    const { getData } = useAuth();
    const router = useRouter();
    const [isInitializing, setIsInitializing] = useState(true);

    const userPayload = getData();
    const userId = userPayload?.sub;

    const { data: claimData, loading: claimLoading } = useQuery<{ personas: any[] }>(GET_USER_CLAIM, {
        variables: { userId },
        skip: !userId,
    });

    useEffect(() => {
        if (claimData?.personas && claimData.personas.length > 0) {
            router.push("/dashboard");
            return;
        }

        if (state.gamePhase === "USER_SELECT") {
            if (userPayload) {
            console.log("userPayload in personaGameEvent", userPayload)
            console.log("userPayload.id in personaGameEvent", userPayload.id)
                dispatch({
                    type: "SET_USER",
                    payload: {
                        id: userPayload.id || "fuckkk",
                        username: (userPayload.name as string) || "Authorized Player",
                        teamName: "UXISM Team"
                    }
                });
                dispatch({ type: "GO_TO_PHASE", payload: "DOMAIN_SELECT" });
            }
        }

        if (!claimLoading) {
            setTimeout(() => setIsInitializing(false), 100);
        }
    }, [userPayload, state.gamePhase, dispatch, claimData, claimLoading, router]);

    if (isInitializing || claimLoading) {
        return (
            <div className="flex-1 flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.14em] text-[#5b5b5b]">
                Syncing Neural Link...
            </div>
        );
    }

    if (state.gamePhase === "USER_SELECT") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#ff6a6a] mb-4">
                    Access Denied: Unauthenticated
                </p>
                <h2 className="font-serif text-2xl uppercase text-white mb-6">
                    Identity Not Found
                </h2>
                <a
                    href="/login"
                    className="border border-[#2e2e2e] bg-[#171717] px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#929292] hover:border-[#DEF767] hover:text-[#DEF767] transition-colors"
                >
                    Return to Login
                </a>
            </div>
        );
    }

    return (
        <div className="relative z-20 flex-1 w-full flex flex-col">
            {/* Back to Events Navigation - Only show on Domain Select */}
            {state.gamePhase === "DOMAIN_SELECT" && (
                <div className="px-6 pt-8 sm:px-12">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-[#5b5b5b] hover:text-white font-mono text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Back to Hub
                    </button>
                </div>
            )}

            {state.gamePhase === "DOMAIN_SELECT" && <DomainSelect />}
            {state.gamePhase === "PERSONA_SELECT" && <PersonaSelect />}
            {(state.gamePhase === "PLAYING" ||
                state.gamePhase === "WON" ||
                state.gamePhase === "PERSONA_TAKEN") && <GameBoard />}
        </div>
    );
}

export default function PersonaGameEvent({ onBack }: { onBack: () => void }) {
    return (
        <GameProvider>
            <GameOrchestrator onBack={onBack} />
        </GameProvider>
    );
}

```

---

### File: `components/game/PersonaMiniCard/PersonaMiniCard.module.css`

```css
.miniCard {
  width: 140px;
  height: 200px;
  background: var(--accent);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
  color: #000;
}


.pill {
  display: inline-block;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 20px;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.5);
  width: fit-content;
}

.iconWrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.icon {
  width: 64px;
  height: 64px;
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.content {
  margin-top: auto;
  display: flex;
  flex-direction: column;
}

.name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.1;
}

.status {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 8px;
  margin-top: 8px;
  text-align: center;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.4);
}
```

---

### File: `components/game/PersonaMiniCard/PersonaMiniCard.tsx`

```tsx
'use client';
import { Persona } from '@/types';
import styles from './PersonaMiniCard.module.css';

interface Props {
  persona: Persona;
}

export default function PersonaMiniCard({ persona }: Props) {
  return (
    <div 
      className={styles.miniCard}
      style={{ '--accent': persona.color_code } as React.CSSProperties}
    >
      <div className={styles.pill}>PERSONA</div>
      
      <div className={styles.iconWrapper}>
        <img src={persona.asset_path} alt="" className={styles.icon} />
      </div>

      <div className={styles.content}>
        <div className={styles.name}>{persona.name}</div>
        <div className={styles.status}>Locked by you</div>
      </div>
    </div>
  );
}

```

---

### File: `components/game/SwipeDeck/SwipeDeck.module.css`

```css
.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 0;
  position: relative;
  overflow: hidden;
  min-height: 580px;
}

.deckAndActiveContainer {
  position: relative;
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
}

.deckBackdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.horizontalDeck {
  position: relative;
  width: 95%;
  max-width: 280px;
  height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.staticCard {
  position: absolute;
  width: 85%;
  max-width: 220px;
  height: 310px;
  border-radius: 20px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.staticCard img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activeZone {
  position: relative;
  z-index: 10;
  width: 90%;
  max-width: 260px;
  height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cardWrapper {
  position: absolute;
  width: 100%;
  max-width: 260px;
  height: 360px;
  cursor: grab;
  user-select: none;
  will-change: transform;
}

.cardWrapper:active {
  cursor: grabbing;
}

.personaCardScale {
  width: 100%;
  height: 100%;
  display: flex;
}

.hint {
  position: absolute;
  top: 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  border: 1.5px solid rgba(0, 0, 0, 0.35);
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.12);
  color: rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 20;
}

.hintL {
  left: 14px;
}

.hintR {
  right: 14px;
}

.cue {
  font-family: var(--font-mono);
  font-size: 9px;
  color: rgba(0, 0, 0, 0.4);
  letter-spacing: 0.07em;
  border-top: 1px solid rgba(0, 0, 0, 0.14);
  padding-top: 8px;
  margin: 0;
  text-align: center;
  width: 100%;
}

.btns {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-top: -30px;
  /* Move them up into the deck area */
  z-index: 30;
  position: relative;
}

.btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.btn:active {
  transform: scale(0.9) translateY(2px);
}

.btnL {
  background: var(--coral);
  color: #000;
  border-color: rgba(0, 0, 0, 0.1);
}

.btnL:hover {
  background: #ff6b6b;
  transform: translateY(-2px);
}

.btnR {
  background: var(--lime);
  color: #000;
  border-color: rgba(0, 0, 0, 0.1);
}

.btnR:hover {
  background: #e1ff80;
  transform: translateY(-2px);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.emptyText {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
}

.resetBtn {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--secondary);
  border: 1px solid var(--border);
  background: transparent;
  padding: 8px 18px;
  border-radius: 4px;
  cursor: pointer;
}
```

---

### File: `components/game/SwipeDeck/SwipeDeck.tsx`

```tsx
'use client';
import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { CardType } from '@/types';
import { RuleManager } from '@/lib/GameRules';
import { MOCK_PERSONAS } from '@/data/mockData';
import styles from './SwipeDeck.module.css';

const THRESHOLD = 70;

import { Card } from '@/types';
import PersonaFlowCard, { CardVariant } from '@/components/game/PersonaFlowCard/PersonaFlowCard';
import HandFan from '@/components/game/HandFan/HandFan';

const VARIANT_MAP: Record<CardType, CardVariant> = {
  AVATAR: 'identity',
  PERSONA: 'description',
  SCENARIO: 'scenario',
  UX_PROBLEM: 'task',
  UI_PROBLEM: 'taskFlow',
  CX_PROBLEM: 'persuasion',
  AI_PROBLEM: 'task',
};

// ── Horizontal Deck static assets ──────────────────────────────
function HorizontalDeck({ count }: { count: number }) {
  // Use the 6 static SVGs as a backdrop
  const assetIndices = [1, 2, 3, 4, 5, 6];

  return (
    <div className={styles.horizontalDeck}>
      {assetIndices.map((assetIdx, i) => {
        // Calculate a dynamic position that 'circles' as count changes
        const logicalIdx = (i + count) % 6;
        const offset = (logicalIdx - 2.5) * 45;
        const rotation = (logicalIdx - 2.5) * 6;
        const scale = 0.8 + (Math.sin(logicalIdx / 6 * Math.PI) * 0.15);

        const depthFactor = (logicalIdx / 5);
        const baseOpacity = i < count ? (0.1 + depthFactor * 0.7) : 0;

        return (
          <motion.div
            key={assetIdx}
            className={styles.staticCard}
            animate={{
              x: offset,
              rotate: rotation,
              scale: scale,
              opacity: baseOpacity,
              zIndex: Math.floor(logicalIdx * 10),
            }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <img src={`/assets/graphics/topCard${assetIdx}.svg`} alt="" />
          </motion.div>
        );
      })}
    </div>
  );
}

interface CardHandle { swipeLeft(): Promise<void>; swipeRight(): Promise<void>; }
interface DraggableCardProps {
  card: Card;
  onLeft(): void;
  onRight(): void;
  x: any;
}

const DraggableCard = forwardRef<CardHandle, DraggableCardProps>(function DraggableCard({ card, onLeft, onRight, x }, ref) {
  const controls = useAnimation();
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const lOp = useTransform(x, [-THRESHOLD, 0], [1, 0]);
  const rOp = useTransform(x, [0, THRESHOLD], [0, 1]);

  const persona = MOCK_PERSONAS.find(p => p.id === card.persona_id);
  const bg = persona?.color_code ?? '#FFD700';

  useEffect(() => {
    controls.start({ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } });
  }, [controls]);

  const doLeft = useCallback(async () => {
    await controls.start({ x: -600, rotate: -30, opacity: 0, transition: { duration: 0.3, ease: 'circIn' } });
    onLeft();
  }, [controls, onLeft]);

  const doRight = useCallback(async () => {
    await controls.start({ y: -600, scale: 0.2, opacity: 0, transition: { duration: 0.4, ease: 'circIn' } });
    onRight();
  }, [controls, onRight]);

  useImperativeHandle(ref, () => ({ swipeLeft: doLeft, swipeRight: doRight }));

  return (
    <motion.div
      className={styles.cardWrapper}
      style={{ x, rotate, touchAction: 'none' }}
      animate={controls}
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={async (_, info) => {
        if (info.offset.x < -THRESHOLD) await doLeft();
        else if (info.offset.x > THRESHOLD) await doRight();
        else controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 450, damping: 35 } });
      }}
    >
      <motion.span className={`${styles.hint} ${styles.hintL}`} style={{ opacity: lOp }}>DISCARD</motion.span>
      <motion.span className={`${styles.hint} ${styles.hintR}`} style={{ opacity: rOp }}>SELECT</motion.span>

      <div className={styles.personaCardScale}>
        <PersonaFlowCard
          variant={VARIANT_MAP[card.card_type]}
          baseHexColor={bg}
          heading={card.heading}
          subHeading={card.subHeading}
          bodyText={card.bodyText}
          listItems={card.listItems}
          sections={card.sections}
          topRightIcon={<img src="/assets/icons/placeholder.svg" alt="" style={{ width: '100%', height: '100%', opacity: 0.6 }} />}
          logoSvg={<img src="/assets/UXism_Logo.svg" alt="UXISM" className="h-full w-full invert opacity-20" />}
        // centralGraphic={card.card_type === 'AVATAR' && persona ? <img src={persona.asset_path} alt={persona.name} className="h-full w-full object-contain" /> : null}
        />
      </div>

      <p className={styles.cue}>← discard · select →</p>
    </motion.div>
  );
});

export default function SwipeDeck() {
  const { state, dispatch } = useGame();
  const { deck, slots, correctCards } = state;
  const top = deck[0] ?? null;
  const cardRef = useRef<CardHandle>(null);

  const x = useMotionValue(0);

  const onLeft = useCallback(() => {
    dispatch({ type: 'DISCARD_CARD' });
    x.set(0);
  }, [dispatch, x]);

  const onRight = useCallback(() => {
    if (!top) return;
    RuleManager.getMode(state.gameMode).handleSwipeRight(top, slots, correctCards, dispatch);
    x.set(0);
  }, [top, slots, correctCards, state.gameMode, dispatch, x]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') cardRef.current?.swipeLeft();
      if (e.key === 'ArrowRight') cardRef.current?.swipeRight();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <section className={styles.wrap}>
      <div className={styles.deckAndActiveContainer}>
        <div className={styles.deckBackdrop}>
          <HorizontalDeck count={Math.min(6, deck.length)} />
        </div>

        <div className={styles.activeZone}>
          <AnimatePresence mode="wait">
            {top ? (
              <DraggableCard
                key={top.id}
                ref={cardRef}
                card={top}
                onLeft={onLeft}
                onRight={onRight}
                x={x}
              />
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.empty}>
                <p className={styles.emptyText}>Sequence Pending</p>
                <button
                  onClick={() => dispatch({ type: 'RESET_BOARD' })}
                  className={styles.resetBtn}
                >
                  Restart Protocol
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {top && (
        <div className={styles.btns}>
          <button
            onClick={() => cardRef.current?.swipeLeft()}
            className={`${styles.btn} ${styles.btnL}`}
            aria-label="Discard Node"
          >
            ✕
          </button>

          <button
            onClick={() => cardRef.current?.swipeRight()}
            className={`${styles.btn} ${styles.btnR}`}
            aria-label="Select Protocol"
          >
            ✓
          </button>
        </div>
      )}

      <HandFan />
    </section>
  );
}


```

---

### File: `components/multiplayer/GameWrapper.tsx`

```tsx
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

```

---

### File: `components/multiplayer/Lobby.tsx`

```tsx
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

```

---

### File: `components/onboarding/DomainSelect/DomainSelect.module.css`

```css
.container {
  position: relative;
  z-index: 2;
  padding: 40px 20px;
  min-height: 100svh;
}
.header {
  margin-bottom: 32px;
}
.backButton {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-decoration: none;
  transition: color 0.15s ease;
}
.backButton:hover {
  color: var(--coral);
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.player { color: var(--coral); }
.sep    { color: var(--border); }
.heading {
  font-family: var(--font-display);
  font-size: clamp(22px, 5vw, 36px);
  color: var(--primary);
  margin-bottom: 8px;
}
.sub {
  font-size: 11px;
  color: var(--secondary);
  margin-bottom: 32px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 480px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 24px 20px 20px;
  background: var(--deep-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease;
  text-align: left;
  color: var(--primary);
  -webkit-tap-highlight-color: transparent;
}
.card:active, .card:hover { border-color: var(--secondary); }
.card:active .badge, .card:hover .badge { color: var(--coral); }
.icon {
  font-size: 18px;
  color: var(--muted);
  font-family: var(--font-mono);
}
.name {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--primary);
}
.desc {
  font-size: 10px;
  color: var(--secondary);
  line-height: 1.4;
}
.badge {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--muted);
  transition: color 0.12s;
}

```

---

### File: `components/onboarding/DomainSelect/DomainSelect.tsx`

```tsx
'use client';
import { useGame } from '@/store/gameStore';
import { MOCK_DOMAINS } from '@/data/mockData';
import { Domain } from '@/types';
import styles from './DomainSelect.module.css';

export default function DomainSelect() {
  const { state, dispatch } = useGame();

  function pick(d: Domain) {
    dispatch({ type: 'SELECT_DOMAIN', payload: d });
  }

  return (
    <div className={styles.container}>
      <div className={styles.eyebrow}>
        <span className={styles.player}>{state.currentUser?.username}</span>
        <span className={styles.sep}>/</span>
        <span>01 · DOMAIN</span>
      </div>
      <h1 className={styles.heading}>Select Domain</h1>
      <p className={styles.sub}>Choose your industry arena to begin.</p>
      <div className={styles.grid}>
        {MOCK_DOMAINS.map(d => {
          return (
            <button
              key={d.id}
              id={`domain-${d.id}`}
              className={styles.card}
              onClick={() => pick(d)}
              aria-label={`Select ${d.name} domain`}
            >
              <span className={styles.icon} aria-hidden="true">{d.icon}</span>
              <span className={styles.name}>{d.name}</span>
              <span className={styles.desc}>{d.description}</span>
              <span className={styles.badge} aria-hidden="true">SELECT →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


```

---

### File: `components/onboarding/PersonaSelect/PersonaSelect.module.css`

```css
.container {
  position: relative;
  z-index: 2;
  padding: 40px 20px;
  min-height: 100svh;
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.domain {
  color: var(--secondary);
}

.sep {
  color: var(--border);
}

.heading {
  font-family: var(--font-display);
  font-size: clamp(24px, 7vw, 44px);
  color: var(--primary);
  margin-bottom: 8px;
}

.sub {
  font-size: 13px;
  color: var(--secondary);
  margin-bottom: 4px;
}

.hint {
  color: var(--muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 32px;
}

@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 24px;
  }
}

.personaCard {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 24px;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
  padding: 24px 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.personaCard:hover:not(.claimed) {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.3);
}

.personaCard:active:not(.claimed) {
  transform: scale(0.95) translateY(-4px);
}

.personaCard.claimed {
  cursor: not-allowed;
  filter: grayscale(0.5);
  opacity: 0.6;
}

.assetContainer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  margin-bottom: 8px;
  width: 100%;
}

.asset {
  width: 200%;
  height: auto;
  z-index: 2;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15));
}

.personaCard:hover .asset {
  transform: scale(1.1);
}

.cardName {
  font-family: var(--font-display);
  font-size: 15px;
  line-height: 1.1;
  color: #000;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  z-index: 2;
  text-shadow: none;
  text-align: center;
}

.claimedOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}

.claimedStamp {
  border: 2px solid #ef5350;
  color: #ef5350;
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transform: rotate(-15deg);
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(239, 83, 80, 0.4);
}

/* Scanner Loading Screen */
.scannerOverlay {
  position: fixed;
  inset: 0;
  background: #181818;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  overflow: hidden;
}

.scanLine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #DEF767, transparent);
  box-shadow: 0 0 20px #DEF767;
  animation: scan 3s linear infinite;
  opacity: 0.5;
  z-index: 1;
}

@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}

.technicalInfo {
  text-align: center;
  z-index: 2;
  max-width: 80%;
}

.flicker {
  font-family: var(--font-mono);
  font-size: 10px;
  color: #DEF767;
  letter-spacing: 0.3em;
  animation: flicker 0.5s infinite alternate;
}

@keyframes flicker {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 0.8; }
}

.coordinates {
  font-family: var(--font-mono);
  font-size: 9px;
  color: #5b5b5b;
  letter-spacing: 0.2em;
  margin-top: 12px;
  display: block;
}

/* Header & Back Button */
.header {
  margin-bottom: 24px;
}

.backButton {
  background: none;
  border: none;
  color: #929292;
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.backButton:hover {
  color: #DEF767;
}
```

---

### File: `components/onboarding/PersonaSelect/PersonaSelect.tsx`

```tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useSubscription } from '@apollo/client/react';
import { useGame } from '@/store/gameStore';
import { WATCH_TEAMS } from '@/lib/GameRules/game-queries';
import { getCorrectCards, buildDeck, MOCK_CARDS as ALL_CARDS, MOCK_PERSONAS, MOCK_DOMAINS } from '@/data/mockData';
import { Persona } from '@/types';
import styles from './PersonaSelect.module.css';

export default function PersonaSelect() {
  const { state, dispatch } = useGame();
  const domain = state.selectedDomain;

  const { data, loading, error } = useSubscription<{ teams: any[] }>(WATCH_TEAMS);
  const activeTeams = data?.teams || [];

  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    // Auto bypass after 6 seconds if still loading
    const autoTimer = setTimeout(() => setIsBypassed(true), 3000);
    return () => clearTimeout(autoTimer);
  }, []);

  // Filter personas to only show those that have cards for the selected domain
  const availablePersonas = MOCK_PERSONAS
    .filter(p => !domain || getCorrectCards(p.id, domain.id).length > 0)
    .map(persona => {
      const claimingTeam = activeTeams.find((t: any) => t.color === persona.color_code);
      return {
        ...persona,
        status: (claimingTeam ? 'CLAIMED' : 'AVAILABLE') as 'CLAIMED' | 'AVAILABLE',
        claimed_by_leader: claimingTeam?.user?.name || null
      };
    });

  function pick(persona: Persona) {
    if (persona.status === 'CLAIMED') return;
    if (!domain) return;

    const correctCards = getCorrectCards(persona.id, domain.id);
    const deck = buildDeck(correctCards, ALL_CARDS, domain.id);

    dispatch({ type: 'SELECT_PERSONA', payload: { persona, correctCards, deck } });
  }

  if (loading && !data && !error && !isBypassed) {
    return (
      <div className={styles.container}>
        <div className={styles.eyebrow}>
          <span>Auth_Protocol_Alpha</span>
          <span className={styles.sep}>/</span>
          <span>Syncing Nodes</span>
        </div>
        <h1 className={styles.heading}>Synchronizing...</h1>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.eyebrow}>
        <span>{state.currentUser?.username}</span>
        <span className={styles.sep}>/</span>
        <span className={styles.domain}>{domain?.name}</span>
        <span className={styles.sep}>/</span>
        <span>02 · PERSONA</span>
      </div>
      <h1 className={styles.heading}>Choose Your Persona</h1>
      <p className={styles.sub}>
        {availablePersonas.length} Archetypes available for {domain?.name}.
      </p>

      <div className={styles.grid}>
        {availablePersonas.length === 0 ? (
          <div className={styles.empty}>
            <p>No archetypes found for this domain yet.</p>
            <button onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'DOMAIN_SELECT' })}>
              Change Domain
            </button>
          </div>
        ) : (
          availablePersonas.map(p => (
            <button
              key={p.id}
              id={`persona-${p.id}`}
              className={`${styles.personaCard} ${p.status === 'CLAIMED' ? styles.claimed : ''}`}
              style={{ backgroundColor: p.color_code }}
              onClick={() => pick(p)}
              disabled={p.status === 'CLAIMED'}
              aria-label={`${p.name} — ${p.status}`}
            >
              <div className={styles.assetContainer}>
                <img src={p.asset_path} alt="" className={styles.asset} />
              </div>
              <span className={styles.cardName}>{p.name}</span>
              {p.status === 'CLAIMED' && (
                <div className={styles.claimedOverlay}>
                  <span className={styles.claimedStamp}>CLAIMED</span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

---

### File: `components/onboarding/UserSelect/UserSelect.module.css`

```css
.container {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 40px 20px 40px;
  max-width: 520px;
  min-height: 100svh;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.heading {
  font-family: var(--font-display);
  font-size: clamp(28px, 8vw, 52px);
  color: var(--primary);
  letter-spacing: 0.01em;
  margin-bottom: 8px;
}
.sub {
  font-size: 13px;
  color: var(--secondary);
  margin-bottom: 32px;
}
.list {
  list-style: none;
  width: 100%;
  border-top: 1px solid var(--border);
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 72px;
  padding: 0 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--primary);
  cursor: pointer;
  transition: background 0.12s ease;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.row:active { background: var(--deep-bg); }
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--muted);
  background: var(--deep-bg);
  flex-shrink: 0;
  text-transform: uppercase;
}
.username {
  flex: 1;
  font-size: 16px;
  color: var(--primary);
  font-family: var(--font-display);
  letter-spacing: 0.02em;
}
.arrow {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--muted);
}
.row:active .arrow { color: var(--coral); }

```

---

### File: `components/onboarding/UserSelect/UserSelect.tsx`

```tsx
'use client';
// components/UserSelect.tsx — Step 0: Choose a mocked user
import { useGame } from '@/store/gameStore';
import { MOCK_USERS } from '@/data/mockData';
import { User } from '@/types';
import styles from './UserSelect.module.css';

export default function UserSelect() {
  const { dispatch } = useGame();

  function pick(u: User) {
    dispatch({ type: 'SET_USER', payload: u });
  }

  return (
    <div className={styles.container}>
      <div className={styles.eyebrow} aria-label="step indicator">00 / IDENTIFY</div>
      <h1 className={styles.heading}>Who are you?</h1>
      <p className={styles.sub}>Select a player to continue.</p>
      <ul className={styles.list} role="list">
        {MOCK_USERS.map(u => (
          <li key={u.id}>
            <button
              id={`user-${u.id}`}
              className={styles.row}
              onClick={() => pick(u)}
              aria-label={`Select player ${u.username}`}
            >
              <span className={styles.avatar} aria-hidden="true">
                {u.username[0]}
              </span>
              <span className={styles.username}>{u.username}</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

```

---

### File: `components/views/BigScreenLeaderboard/BigScreenLeaderboard.module.css`

```css
.container {
  min-height: 100vh;
  padding: 40px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 60px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 20px;
}

.headerLeft {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.statsPanel {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.statLabel {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.statValue {
  font-family: var(--font-display);
  font-size: 2rem;
  color: var(--lime);
  display: flex;
  position: relative;
  overflow: hidden;
  height: 2.2rem;
}

.totalNumber {
  position: absolute;
  right: 0;
}

.title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  letter-spacing: 6px;
  color: var(--primary);
  text-transform: uppercase;
}

.liveIndicator {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--lime);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--lime);
  box-shadow: 0 0 10px var(--lime);
  animation: pulsing 1.5s infinite ease-in-out;
}

@keyframes pulsing {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  flex: 1;
}

.domainColumn {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.domainHeader {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.domainIcon {
  font-size: 1.5rem;
  color: var(--secondary);
}

.domainName {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--primary);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.personaList {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.personaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--border);
  background: var(--base-bg);
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.personaRowClaimed {
  background: var(--coral);
  border-color: var(--coral);
  color: var(--deep-bg);
}

/* 3 pieces of info */
.infoLabel {
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex: 1;
}

.infoIcon {
  font-family: var(--font-mono);
  font-size: 20px;
  width: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.iconClaimed {
  transform: rotate(45deg);
}

.infoBody {
  font-family: var(--font-body);
  font-size: 13px;
  text-align: right;
  flex: 1;
  text-transform: uppercase;
}

/* When claimed, color inverts to #171717 */
.personaRow .infoLabel,
.personaRow .infoBody {
  color: var(--secondary);
}

.personaRowClaimed .infoLabel,
.personaRowClaimed .infoBody,
.personaRowClaimed .infoIcon {
  color: var(--deep-bg);
  font-weight: 500;
}

```

---

### File: `components/views/BigScreenLeaderboard/BigScreenLeaderboard.tsx`

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_PERSONAS, MOCK_DOMAINS, MOCK_CARDS, MOCK_USERS } from '@/data/mockData';
import styles from './BigScreenLeaderboard.module.css';
import { Persona, User } from '@/types';

type LivePersona = Persona & {
  domain_id: string;
  claimed_by_user?: User | null;
  active_competitors: number;
};

export default function BigScreenLeaderboard() {
  const [personas, setPersonas] = useState<LivePersona[]>([]);

  // Initialize personas with domain mapping and initial competitors
  useEffect(() => {
    const initialized: LivePersona[] = MOCK_PERSONAS.map(p => {
      const card = MOCK_CARDS.find(c => c.persona_id === p.id);
      return {
        ...p,
        domain_id: card ? card.domain_id : MOCK_DOMAINS[0].id,
        status: 'AVAILABLE',
        claimed_by_user: null,
        active_competitors: Math.floor(Math.random() * 6), // 0 to 5 competitors initially
      };
    });
    setPersonas(initialized);
  }, []);

  // Simulate real-time claims and competitor fluctuations
  useEffect(() => {
    if (personas.length === 0) return;

    // Interval for claims
    const claimInterval = setInterval(() => {
      setPersonas(current => {
        const available = current.filter(p => p.status === 'AVAILABLE');
        if (available.length === 0) {
          clearInterval(claimInterval);
          return current;
        }

        const randomPersona = available[Math.floor(Math.random() * available.length)];
        const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

        return current.map(p => {
          if (p.id === randomPersona.id) {
            return {
              ...p,
              status: 'CLAIMED',
              claimed_by_user: randomUser,
              claimed_at: new Date().toISOString(),
              active_competitors: 0 // Nobody competing anymore since it's claimed
            };
          }
          return p;
        });
      });
    }, 6000); // Claim one every 6 seconds

    // Interval for competitor fluctuations
    const fluctuateInterval = setInterval(() => {
      setPersonas(current => {
        return current.map(p => {
          if (p.status === 'CLAIMED') return p;
          // Randomly change competitors by -1, 0, or +1
          const change = Math.floor(Math.random() * 3) - 1;
          const currentCount = p.active_competitors || 0;
          const newCount = Math.max(0, Math.min(15, currentCount + change));
          return { ...p, active_competitors: newCount };
        });
      });
    }, 1500); // Fluctuate every 1.5 seconds

    return () => {
      clearInterval(claimInterval);
      clearInterval(fluctuateInterval);
    };
  }, [personas.length]);

  const totalPlayers = personas.reduce((sum, p) => sum + (p.active_competitors || 0), 0) || 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>GLOBAL ASSIGNMENT LINK</h1>
          <div className={styles.liveIndicator}>
            <div className={styles.pulse} />
            REAL-TIME TELEMETRY
          </div>
        </div>
        <div className={styles.statsPanel}>
          <div className={styles.statLabel}>ACTIVE PLAYERS</div>
          <div className={styles.statValue}>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={totalPlayers}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={styles.totalNumber}
              >
                {String(totalPlayers)}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className={styles.grid}>
        {MOCK_DOMAINS.map((domain, index) => {
          const domainPersonas = personas.filter(p => p.domain_id === domain.id);

          return (
            <motion.div 
              key={domain.id} 
              className={styles.domainColumn}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className={styles.domainHeader}>
                <span className={styles.domainIcon}>{domain.icon}</span>
                <h2 className={styles.domainName}>{domain.name}</h2>
              </div>
              
              <div className={styles.personaList}>
                <AnimatePresence>
                  {domainPersonas.map((p, pIndex) => {
                    const isClaimed = p.status !== 'AVAILABLE';
                    
                    return (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: pIndex * 0.05 }}
                        className={`${styles.personaRow} ${isClaimed ? styles.personaRowClaimed : ''}`}
                      >
                        <span className={styles.infoLabel}>{p.name}</span>
                        <span className={`${styles.infoIcon} ${isClaimed ? styles.iconClaimed : ''}`}>
                          +
                        </span>
                        <span className={styles.infoBody}>
                          {isClaimed 
                            ? `CLAIMED: ${p.claimed_by_user?.username}` 
                            : p.active_competitors > 0 
                              ? `${p.active_competitors} COMPETING` 
                              : 'AVAILABLE'}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

```

---

### File: `components/views/Leaderboard/Leaderboard.module.css`

```css
.container {
  min-height: 100vh;
  background: var(--base-bg);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  width: 100%;
  max-width: 1000px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.title {
  font-family: var(--font-display);
  font-size: 2rem;
  letter-spacing: 4px;
  color: var(--primary);
  margin: 0;
}

.backBtn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--secondary);
  padding: 8px 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.backBtn:hover {
  border-color: var(--lime);
  color: var(--lime);
}

.tableWrapper {
  width: 100%;
  max-width: 1000px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.table th {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 2px;
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: top;
}

.row:hover {
  background: rgba(255, 255, 255, 0.01);
}

.userInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-weight: 700;
  color: var(--primary);
  font-size: 1.1rem;
}

.teamName {
  color: var(--lime);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
}

.members {
  font-size: 0.75rem;
  color: var(--secondary);
  opacity: 0.7;
}

.domainInfo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--primary);
}

.domainIcon {
  font-size: 1.2rem;
  opacity: 0.8;
}

.personaTag {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid var(--color);
  color: var(--color);
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 4px;
  text-transform: uppercase;
  background: rgba(var(--color-rgb), 0.1);
  box-shadow: inset 0 0 10px var(--color);
}

.timestamp {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--secondary);
}

.empty {
  text-align: center;
  padding: 60px;
  color: var(--secondary);
  font-style: italic;
}

```

---

### File: `components/views/Leaderboard/Leaderboard.tsx`

```tsx
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

```

---

### File: `components/views/PersonaTakenScreen/PersonaTakenScreen.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24,24,24,0.96);
}

.card {
  width: min(440px, 90vw);
  padding: 36px 32px;
  border: 1px solid var(--coral);
  background: var(--deep-bg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--coral);
  text-transform: uppercase;
}

.personaBadge {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid;
  padding: 5px 12px;
  width: fit-content;
  opacity: 0.6;
}

.personaDot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.personaName {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--secondary);
}

.heading {
  font-family: var(--font-display);
  font-size: clamp(22px, 3vw, 32px);
  color: var(--primary);
}

.takenBy {
  font-size: 13px;
  color: var(--secondary);
}

.takenByUser {
  color: var(--coral);
  font-family: var(--font-mono);
}

.sub {
  font-size: 13px;
  color: var(--muted);
}

.actions { margin-top: 8px; }

.primaryBtn {
  width: 100%;
  padding: 14px 20px;
  background: transparent;
  border: 1px solid var(--coral);
  color: var(--coral);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.primaryBtn:hover {
  background: var(--coral);
  color: var(--base-bg);
}

```

---

### File: `components/views/PersonaTakenScreen/PersonaTakenScreen.tsx`

```tsx
'use client';
// components/PersonaTakenScreen.tsx — Race-loss overlay
import { motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import styles from './PersonaTakenScreen.module.css';

export default function PersonaTakenScreen() {
  const { state, dispatch } = useGame();
  const { selectedPersona, personaTakenBy } = state;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-modal="true"
      role="alertdialog"
      aria-label="Persona claimed by another player"
    >
      <motion.div
        className={styles.card}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }}
      >
        <div className={styles.tag} aria-hidden="true">PERSONA TAKEN</div>

        <div className={styles.personaBadge} style={{ borderColor: selectedPersona?.color_code }}>
          <span
            className={styles.personaDot}
            style={{ background: selectedPersona?.color_code }}
            aria-hidden="true"
          />
          <span className={styles.personaName}>{selectedPersona?.name}</span>
        </div>

        <h1 className={styles.heading}>You were outpaced.</h1>

        {personaTakenBy && (
          <p className={styles.takenBy} aria-live="assertive">
            <span className={styles.takenByUser}>{personaTakenBy}</span> claimed it first.
          </p>
        )}

        <p className={styles.sub}>Choose a different persona and keep racing.</p>

        <div className={styles.actions}>
          <button
            id="taken-pick-another"
            className={styles.primaryBtn}
            onClick={() => dispatch({ type: 'GO_TO_PHASE', payload: 'PERSONA_SELECT' })}
          >
            Pick Another Persona
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

```

---

### File: `components/views/WinScreen/WinScreen.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(24,24,24,0.96);
}

.blob {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.6;
  filter: blur(80px);
  animation: blobPulse 4s ease-in-out infinite alternate;
}

@keyframes blobPulse {
  from { transform: scale(1); }
  to   { transform: scale(1.08); }
}

.card {
  position: relative;
  z-index: 1;
  width: min(480px, 90vw);
  padding: 40px 36px;
  border: 1px solid var(--border);
  background: var(--deep-bg);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--lime);
  text-transform: uppercase;
}

.personaShowcase {
  display: flex;
  justify-content: center;
  margin: 12px 0;
}


.heading {
  font-family: var(--font-display);
  font-size: clamp(24px, 3.5vw, 36px);
  color: var(--primary);
  line-height: 1.2;
}

.sub {
  font-size: 13px;
  color: var(--secondary);
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.primaryBtn {
  padding: 14px 20px;
  background: transparent;
  border: 1px solid var(--lime);
  color: var(--lime);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.primaryBtn:hover {
  background: var(--lime);
  color: var(--base-bg);
}

.secondaryBtn {
  padding: 12px 20px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}

.secondaryBtn:hover {
  border-color: var(--secondary);
  color: var(--primary);
}

```

---

### File: `components/views/WinScreen/WinScreen.tsx`

```tsx
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { useGame } from '@/store/gameStore';
import PersonaMiniCard from '@/components/game/PersonaMiniCard/PersonaMiniCard';
import { CREATE_TEAM, ADD_TEAM_MEMBER } from '@/lib/GameRules/game-queries';
import styles from './WinScreen.module.css';


type WinScreenProps = {
  userId?: string;
};

export default function WinScreen({ userId }: WinScreenProps) {
  const { state, dispatch } = useGame();
  const { selectedPersona, currentUser } = state;
  const [claimStatus, setClaimStatus] = useState<'VERIFYING' | 'WON' | 'LOST'>('VERIFYING');

  const [createTeam] = useMutation(CREATE_TEAM);
  const [addTeamMember] = useMutation(ADD_TEAM_MEMBER);
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

```

---

### File: `context/token-context.tsx`

```tsx
"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type LoginInput = {
    phone?: string;
    email?: string;
    password: string;
};

type RegisterInput = {
    name: string;
    email: string;
    password: string;
    phone: string;
    company: string;
    skills: string[];
    image?: string;
};

type LoginResponse = {
    data: {
        "jwt-token": string;
        "refresh-token": string;
    };
};

type JwtPayload = {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
};

type AuthContextType = {
    login: (input: LoginInput) => Promise<void>;

    getJwt: () => string | null;
    getRefreshToken: () => string | null;
    getData: () => JwtPayload | null;

    logout: () => void;
    register: (input: RegisterInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const JWT_KEY = "jwt-token";
const REFRESH_KEY = "refresh-token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [, setRefresh] = useState(0);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    const _startRefreshInterval = (delay: number) => {
        if (refreshInterval) clearInterval(refreshInterval);
        const interval = setTimeout(() => refresh(), delay);
        setRefreshInterval(interval);
    };

    const login = async (input: LoginInput) => {
        const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error("Login failed");
        const data: LoginResponse = await response.json();
        console.log("Login successful, received tokens:", data);
        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
        if (typeof window !== "undefined") {
        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
    }
        setRefresh((v) => v + 1);
        _startRefreshInterval(1000 * 60); // every one minute
    };

    const register = async (input: RegisterInput) => {
        const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error("Registration failed");
        console.log("in token-context.tsx response:", response)
        const data = await response.json();
        console.log("in token-context.tsx data:", data)

        localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
        localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
        setRefresh((v) => v + 1);
        _startRefreshInterval(1000 * 60); // every one minute
    };

    // const getJwt = () => localStorage.getItem(JWT_KEY);
    const getJwt = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(JWT_KEY);
};
    // const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
    const getRefreshToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
};
    const getData = (): JwtPayload | null => {
        const token = getJwt();
        if (!token) return null;
        try {
            const payload = token.split(".")[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    };


    // const refresh = async () => {
    //     const refreshToken = getRefreshToken();
    //     if (!refreshToken) return;
    //     const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/refresh-token", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ refresh_token: refreshToken }),
    //     });
    //     if (!response.ok) {
    //         logout();
    //         return;
    //     }
    //     const data: LoginResponse = await response.json();
    //     localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
    //     localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
    //     setRefresh((v) => v + 1);
    //     _startRefreshInterval(1000 * 60); // every one minute
    // };

    const refresh = async () => {
        // 1. Isolate the core logic
        const performRefresh = async () => {
            // IMPORTANT: We call getRefreshToken() INSIDE the lock.
            // This ensures that if another tab just finished refreshing the token, 
            // this tab will grab the newly updated token from localStorage, 
            // rather than using a stale one.
            const refreshToken = getRefreshToken();
            if (!refreshToken) return;

            const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/users/refresh-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!response.ok) {
                logout();
                return;
            }

            const data: LoginResponse = await response.json();

            localStorage.setItem(JWT_KEY, data.data["jwt-token"]);
            localStorage.setItem(REFRESH_KEY, data.data["refresh-token"]);
            setRefresh((v) => v + 1);
            _startRefreshInterval(1000 * 60); // every one minute
        };

        // 2. Wrap execution using the exact same lock name as your register/login functions
        if (navigator.locks) {
            await navigator.locks.request("auth-lock", async () => {
                await performRefresh();
            });
        } else {
            // Fallback for unsupported browsers
            console.warn("Web Locks API not supported. Running refresh without a lock.");
            await performRefresh();
        }
    };



    const logout = () => {
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem(REFRESH_KEY);
        setRefresh((v) => v + 1);
    };

    useEffect(() => {
        console.log("AuthProvider mounted");
        if (getRefreshToken()) refresh();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                login,
                register,
                getJwt,
                getRefreshToken,
                getData,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}

```

---

### File: `data/mockData.ts`

```typescript
// lib/mockData.ts
// Fully self-contained mock dataset — no Hasura/DB required for the MVP demo.

import { Domain, Persona, Card, User } from '@/app/x/types/index';

export const MOCK_USERS: User[] = [
  { id: 'u1', username: 'PlayerOne', teamName: 'Alpha Squad', teamMembers: ['Alice', 'Bob', 'Charlie'] },
  { id: 'u2', username: 'NeonRacer', teamName: 'Cyber Punks', teamMembers: ['Dave', 'Eve', 'Frank'] },
  { id: 'u3', username: 'GridRunner', teamName: 'Velocity', teamMembers: ['Grace', 'Heidi', 'Ivan'] },
  { id: 'u4', username: 'DataPilot', teamName: 'NeuroNet', teamMembers: ['Jack', 'Karl', 'Liam'] },
];

export const MOCK_DOMAINS: Domain[] = [
  { id: 'd1', name: 'FinTech', icon: '◈', description: 'Payments, trading, compliance & wealth management' },
  { id: 'd2', name: 'HealthTech', icon: '⊕', description: 'Clinical workflows, diagnostics, & patient care' },
  { id: 'd3', name: 'AI Tech', icon: '⊙', description: 'Model training, ethics, & intelligent agents' },
  { id: 'd4', name: 'GameDev', icon: '🎮', description: 'Mechanics, rendering, & player experience' },
];

export const MOCK_PERSONAS: Persona[] = [
  {
    id: "p01",
    name: "Shanti Devi",
    domain_id: "d1",
    color_code: "#FEF102",
    asset_path: "/assets/avatars/ShantiDevi.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "63, female | Goals: Book doctor appointments easily, Access prescriptions and reports, Understand medicines | Pain Points: Difficulty reading English interfaces, Confused by medical terminology",
    scenario: "Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.",
    ux_problems: "Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users, Lack of guided navigation, No offline-first experience",
    ui_problems: "Visual Clutter, Small text sizes, Poor contrast ratios, Non-standard icons, Lack of visual cues",
    cx_problems: "Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance, Inconsistent support experience, Reduced trust after failed payments",
    ai_problems: "Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations, Weak personalization for chronic patients, Inability to detect emotional distress"
  },
  {
    id: "p02",
    name: "Rohit",
    domain_id: "d1",
    color_code: "#CADB2B",
    asset_path: "/assets/avatars/Rohit.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "32, male | Goals: Quick doctor consultations, Fast insurance claims, Smart health tracking | Pain Points: Too many irrelevant notifications, Confusing insurance claim process",
    scenario: "Rohit uses a health app to schedule annual checkups and manage fitness reports but receives irrelevant notifications and duplicate reminders.",
    ux_problems: "Fragmented patient journeys, Repetitive data entry, Poor synchronization across devices, Confusing insurance claim workflow",
    ui_problems: "Cluttered dashboards, Notification overload, Unclear CTAs, Difficult report comparison views",
    cx_problems: "Distrust in hidden healthcare costs, Frustration from delayed customer support, Lack of continuity between hospitals and insurers, Emotional stress during emergencies",
    ai_problems: "Incorrect health risk scoring, Weak predictive alerts, Generic fitness recommendations, Data privacy concerns, Poor integration of wearable data"
  },
  {
    id: "p03",
    name: "Kavya",
    domain_id: "d1",
    color_code: "#72AC22",
    asset_path: "/assets/avatars/Kavya.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "14, female | Goals: Access learning content, Prepare for exams, Learn in Punjabi/Hindi | Pain Points: Poor internet for online learning, Difficult navigation on LMS platforms",
    scenario: "Kavya attends online classes through a state LMS but struggles due to poor internet and difficult navigation.",
    ux_problems: "Complicated course navigation, Lack of progress indicators, Poor mobile optimization, High cognitive load for students",
    ui_problems: "Tiny clickable areas, Poor readability, Non responsive layouts, Excessive text heavy screens",
    cx_problems: "Feeling disconnected from teachers, Low motivation due to isolation, Frustration from technical issues, Reduced confidence after repeated failures",
    ai_problems: "Weak adaptive learning models, Poor language translation quality, Inaccurate student performance prediction, Lack of emotional engagement analysis"
  },
  {
    id: "p04",
    name: "Dr. Meera",
    domain_id: "d1",
    color_code: "#4BB059",
    asset_path: "/assets/avatars/DrMeera.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "45, female | Goals: Manage assignments efficiently, Track student performance, Conduct hybrid classes | Pain Points: Time consuming grading workflows, Overcrowded dashboards",
    scenario: "Dr. Meera uses a university LMS to upload assignments but struggles with grading automation and analytics.",
    ux_problems: "Complex admin workflows, Multi step grading systems, Poor analytics discoverability, Time consuming content uploads",
    ui_problems: "Overcrowded teacher dashboards, Difficult table navigation, Poor accessibility for long sessions, Inconsistent layouts across modules",
    cx_problems: "Burnout due to repetitive tasks, Lack of trust in digital grading, Difficulty maintaining student engagement, Reduced satisfaction from system crashes",
    ai_problems: "Incorrect plagiarism detection, Weak recommendation engines, Bias in automated grading, Poor predictive dropout analysis"
  },
  {
    id: "p05",
    name: "Suresh - Shopkeeper",
    domain_id: "d1",
    color_code: "#319F69",
    asset_path: "/assets/avatars/Suresh.svg",
    status: "AVAILABLE",
    claimed_by_user_id: null,
    claimed_at: null,
    persona_details: "40, male | Goals: Manage inventory, Track sales, File GST easily | Pain Points: Complex tax filing, Difficult inventory management, Lack of business insights",
    scenario: "Suresh tries to use a business management app to track his shop's inventory and file GST but finds the interface overwhelming.",
    ux_problems: "Confusing tax filing steps, Lack of bulk inventory updates, Poor data visualization, Non-intuitive navigation",
    ui_problems: "Cluttered data tables, Small fonts, Lack of visual hierarchy, Inconsistent button styles",
    cx_problems: "Anxiety over tax compliance, Frustration with slow support, Lack of trust in data security, Feeling overwhelmed by complex features",
    ai_problems: "Inaccurate sales forecasting, Weak inventory alerts, Generic business advice, Poor tax calculation accuracy"
  }
];

// ─────────────────────────────────────────────────────────────
// 7 correct cards per persona — the new design sequence
// ─────────────────────────────────────────────────────────────
export const HARDCODED_CARDS: Card[] = [
  // p01 — Shanti Devi (Mapped to d1)
  { 
    id: 'c01-avatar', persona_id: 'p01', domain_id: 'd1', card_type: 'AVATAR', 
    heading: 'Shanti Devi', content: 'Elderly Rural Patient' 
  },
  { 
    id: 'c01-persona', persona_id: 'p01', domain_id: 'd1', card_type: 'PERSONA', 
    heading: 'Elderly Rural Patient', subHeading: 'Shanti Devi', content: 'Profile Details',
    sections: [
      { label: 'Demographics', value: '63, female' },
      { label: 'Goals', value: 'Book doctor appointments easily, Access prescriptions' },
      { label: 'Pain Points', value: 'Difficulty reading English, Confused by medical terminology' },
    ]
  },
  { 
    id: 'c01-scenario', persona_id: 'p01', domain_id: 'd1', card_type: 'SCENARIO', 
    heading: 'The Scenario', content: 'Scenario Context',
    bodyText: 'Shanti Devi needs to consult a doctor for diabetes follow-up. She attempts to use a telemedicine app but struggles to upload reports and locate the consultation button.' 
  },
  { 
    id: 'c01-ux', persona_id: 'p01', domain_id: 'd1', card_type: 'UX_PROBLEM', 
    heading: 'UX Challenges', content: 'UX Problem',
    bodyText: 'Complex appointment booking flows, Too many steps for report uploads, Poor onboarding for elderly users.' 
  },
  { 
    id: 'c01-ui', persona_id: 'p01', domain_id: 'd1', card_type: 'UI_PROBLEM', 
    heading: 'UI & Interaction', content: 'UI Problem',
    listItems: [
      'Visual Clutter',
      'Small text sizes',
      'Poor contrast ratios',
      'Non-standard icons',
      'Lack of visual cues'
    ]
  },
  { 
    id: 'c01-cx', persona_id: 'p01', domain_id: 'd1', card_type: 'CX_PROBLEM', 
    heading: 'CX & Trust', subHeading: 'Emotional Nudge', content: 'CX Problem',
    bodyText: 'Fear of wrong diagnosis, Anxiety during online consultations, Lack of human reassurance.' 
  },
  { 
    id: 'c01-ai', persona_id: 'p01', domain_id: 'd1', card_type: 'AI_PROBLEM', 
    heading: 'AI Intelligence', content: 'AI Problem',
    bodyText: 'Poor regional language understanding, Inaccurate symptom prediction, Biased health recommendations.' 
  },
];

const generatedCards: Card[] = [];
MOCK_PERSONAS.forEach(p => {
  const dId = p.domain_id;
  const hasHardcoded = HARDCODED_CARDS.some(c => c.persona_id === p.id && c.domain_id === dId);
  
  if (!hasHardcoded) {
    // 1. AVATAR
    generatedCards.push({
      id: `c-${p.id}-avatar`, persona_id: p.id, domain_id: dId, card_type: 'AVATAR',
      heading: p.name, content: "Persona Archetype"
    });

    // 2. PERSONA
    const descParts = p.persona_details?.split('|') || [];
    const sections = descParts.map(part => {
      const [label, ...valueParts] = part.split(':');
      if (valueParts.length === 0) return { label: 'Bio', value: label.trim() };
      return {
        label: label?.trim() || "Profile",
        value: valueParts.join(':')?.trim() || part.trim()
      };
    });
    generatedCards.push({
      id: `c-${p.id}-persona`, persona_id: p.id, domain_id: dId, card_type: 'PERSONA',
      heading: "Archetype Profile", subHeading: p.name, content: 'Persona Details',
      sections: sections.length > 0 ? sections : [{ label: 'Trait', value: 'Archetype Trait' }]
    });

    // 3. SCENARIO
    generatedCards.push({
      id: `c-${p.id}-scenario`, persona_id: p.id, domain_id: dId, card_type: 'SCENARIO',
      heading: 'The Scenario', content: 'Scenario',
      bodyText: p.scenario || `Context for ${p.name}.`
    });

    // 4. UX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ux`, persona_id: p.id, domain_id: dId, card_type: 'UX_PROBLEM',
      heading: 'UX Challenges', content: 'UX Problem',
      bodyText: p.ux_problems || `Analyze UX for ${p.name}.`
    });

    // 5. UI_PROBLEM
    const uiList = p.ui_problems?.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'z') || [];
    generatedCards.push({
      id: `c-${p.id}-ui`, persona_id: p.id, domain_id: dId, card_type: 'UI_PROBLEM',
      heading: 'UI & Interaction', content: 'UI Problem',
      listItems: uiList.length > 0 ? uiList : ['Analyze visual hierarchy', 'Review touch targets', 'Check accessibility']
    });

    // 6. CX_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-cx`, persona_id: p.id, domain_id: dId, card_type: 'CX_PROBLEM',
      heading: 'CX & Trust', subHeading: 'Emotional Nudge',
      content: 'CX Problem',
      bodyText: p.cx_problems || `Build trust with ${p.name}.`
    });

    // 7. AI_PROBLEM
    generatedCards.push({
      id: `c-${p.id}-ai`, persona_id: p.id, domain_id: dId, card_type: 'AI_PROBLEM',
      heading: 'AI Intelligence', content: 'AI Problem',
      bodyText: p.ai_problems || `AI recommendations for ${p.name}.`
    });
  }
});

export const MOCK_CARDS: Card[] = [...HARDCODED_CARDS, ...generatedCards];

export function buildDeck(_correctCards: Card[], allCards: Card[], domainId: string): Card[] {
  // Return all cards for this domain, shuffled.
  // The RuleManager will filter them to show only the relevant next slot.
  return allCards
    .filter(c => c.domain_id === domainId)
    .sort(() => Math.random() - 0.5);
}

import { SlotState, SlotKey, SLOT_ORDER } from '@/app/x/types/index';

export function isFlowComplete(slots: SlotState, correctCards: Card[]): boolean {
  return SLOT_ORDER.every((slotKey: SlotKey) => {
    const placed = slots[slotKey];
    if (!placed) return false;
    const correct = correctCards.find(c => c.card_type === slotKey);
    return placed.id === correct?.id;
  });
}

export function getCorrectCards(personaId: string, domainId: string): Card[] {
  return MOCK_CARDS.filter(c => c.persona_id === personaId && c.domain_id === domainId);
}
```

---

### File: `debug/DebugPanel/DebugPanel.module.css`

```css
.panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: rgba(18, 18, 18, 0.85);
  border: 1px solid var(--border);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 44px;
  height: 44px;
}

.panelOpen {
  width: 220px;
  height: auto;
}

.toggle {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: color 0.2s, transform 0.3s;
  flex-shrink: 0;
}

.toggle:hover {
  color: var(--lime);
}

.panelOpen .toggle {
  transform: rotate(90deg);
  position: absolute;
  top: 0;
  right: 0;
}

.content {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--lime);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 2px;
  opacity: 0.8;
}

.label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: color 0.12s;
  padding: 2px 0;
}

.label:hover {
  color: var(--primary);
}

.label input {
  accent-color: var(--lime);
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

```

---

### File: `debug/DebugPanel/DebugPanel.tsx`

```tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import { GameMode } from '@/types';
import styles from './DebugPanel.module.css';

export default function DebugPanel() {
  const { state, dispatch } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const modes: GameMode[] = ['LOCK_ON_FILL', 'REPLACE_ALLOWED', 'SOFT_LOCK'];

  return (
    <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close debug menu' : 'Open debug menu'}
      >
        {isOpen ? '✕' : '⚙'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.content}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.section}>
              <div className={styles.title}>Rule Mode</div>
              {modes.map(m => (
                <label key={m} className={styles.label}>
                  <input
                    type="radio"
                    name="gameMode"
                    checked={state.gameMode === m}
                    onChange={() => dispatch({ type: 'SET_GAME_MODE', payload: m })}
                  />
                  {m}
                </label>
              ))}
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <div className={styles.title}>Visuals</div>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={state.showDeck}
                  onChange={() => dispatch({ type: 'TOGGLE_DECK_VISIBILITY' })}
                />
                Show Deck Block
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```

---

### File: `dump_.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const EXCLUDED_DIRS: string[] = ['node_modules', '.next', '.git', 'out', 'build', 'public'];
const ALLOWED_EXTENSIONS: string[] = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];
const EXCLUDED_FILES: string[] = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
const OUTPUT_FILE: string = 'project-code-dump.md'; // Updated to .md

// Helper to map file extensions to Markdown language tags for syntax highlighting
const getMarkdownLang = (ext: string): string => {
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json',
  };
  return langMap[ext] || '';
};

/**
 * Recursively walks through the directory and dumps code into a single Markdown file.
 */
function generateCodeDump(rootDir: string, outputFile: string): void {
  const outputPath = path.join(rootDir, outputFile);

  // Clear previous dump if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Write the initial document header
  fs.writeFileSync(outputPath, '# Project Code Dump\n\n', 'utf-8');

  function walk(currentDir: string): void {
    const files: string[] = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath: string = path.join(currentDir, file);
      const stats: fs.Stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(file)) {
          walk(filePath);
        }
      } else {
        const ext: string = path.extname(file);
        const fileName: string = path.basename(filePath);

        // Filter files to include
        const isAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
        const isExcludedFile = EXCLUDED_FILES.includes(fileName);
        const isOutputFile = fileName === OUTPUT_FILE;

        if (isAllowedExtension && !isExcludedFile && !isOutputFile) {
          try {
            const content: string = fs.readFileSync(filePath, 'utf-8');
            const relativePath: string = path.relative(rootDir, filePath);
            const langTag: string = getMarkdownLang(ext);
            
            // Format the output as proper Markdown with headers and syntax-highlighted code blocks
            const markdownBlock = `### File: \`${relativePath}\`\n\n\`\`\`${langTag}\n${content}\n\`\`\`\n\n---\n\n`;
            
            fs.appendFileSync(outputPath, markdownBlock, 'utf-8');
          } catch (err) {
            console.error(`⚠️ Skipped ${filePath} due to read error.`);
          }
        }
      }
    }
  }

  console.log('Generating Markdown code dump...');
  walk(rootDir);
  console.log(`✅ Markdown code dump successfully generated at: ./${outputFile}`);
}

// Execute the script
generateCodeDump(process.cwd(), OUTPUT_FILE);

```

---

### File: `dump_updated.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const EXCLUDED_DIRS: string[] = [
  'node_modules',
  '.next',
  '.git',
  'out',
  'build',
  'public',
  '.antigravitycli', // <- added
];

const ALLOWED_EXTENSIONS: string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.json',
];

const EXCLUDED_FILES: string[] = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

const OUTPUT_FILE: string = 'project-code-dump.md';

// Helper to map file extensions to Markdown language tags
const getMarkdownLang = (ext: string): string => {
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json',
  };

  return langMap[ext] || '';
};

/**
 * Recursively walks through the directory and dumps code into a single Markdown file.
 */
function generateCodeDump(rootDir: string, outputFile: string): void {
  const outputPath = path.join(rootDir, outputFile);

  // Clear previous dump
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  // Write initial markdown header
  fs.writeFileSync(outputPath, '# Project Code Dump\n\n', 'utf-8');

  function walk(currentDir: string): void {
    let files: string[];

    // Safely read directory
    try {
      files = fs.readdirSync(currentDir);
    } catch (err) {
      console.error(`⚠️ Failed to read directory: ${currentDir}`);
      return;
    }

    for (const file of files) {
      const filePath: string = path.join(currentDir, file);

      let stats: fs.Stats;

      // Safely stat file
      try {
        stats = fs.statSync(filePath);
      } catch (err) {
        console.warn(`⚠️ Skipping missing/inaccessible file: ${filePath}`);
        continue;
      }

      // Handle directories
      if (stats.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(file)) {
          walk(filePath);
        }

        continue;
      }

      const ext: string = path.extname(file);
      const fileName: string = path.basename(filePath);

      const isAllowedExtension = ALLOWED_EXTENSIONS.includes(ext);
      const isExcludedFile = EXCLUDED_FILES.includes(fileName);
      const isOutputFile = fileName === OUTPUT_FILE;

      if (!isAllowedExtension || isExcludedFile || isOutputFile) {
        continue;
      }

      try {
        const content: string = fs.readFileSync(filePath, 'utf-8');
        const relativePath: string = path.relative(rootDir, filePath);
        const langTag: string = getMarkdownLang(ext);

        const markdownBlock = `### File: \`${relativePath}\`\n\n\`\`\`${langTag}
${content}
\`\`\`\n\n---\n\n`;

        fs.appendFileSync(outputPath, markdownBlock, 'utf-8');
      } catch (err) {
        console.error(`⚠️ Skipped ${filePath} due to read error.`);
      }
    }
  }

  console.log('Generating Markdown code dump...');
  walk(rootDir);
  console.log(`✅ Markdown code dump successfully generated at: ./${outputFile}`);
}

// Execute the script
generateCodeDump(process.cwd(), OUTPUT_FILE);

```

---

### File: `lib/GameRules/IRuleMode.ts`

```typescript
import { Card, CardType, SlotState } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';

export interface IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean;
  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] };
  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>): void;
}

```

---

### File: `lib/GameRules/LockMode.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class LockMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    // Flow-wise logic: find the first empty slot in the order
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return false;

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    let remainingPool = [...pool];
    let nextCard = null;
    
    while (remainingPool.length > 0) {
      const candidate = remainingPool.shift()!;
      if (this.canCategorySpawn(candidate.card_type, slots)) {
        nextCard = candidate;
        break;
      }
    }
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    if (slots[slotKey] === null) {
      dispatch({ type: 'PLACE_CARD', payload: { card } });
      const newSlots = { ...slots, [slotKey]: card };
      if (isFlowComplete(newSlots, correctCards)) {
        setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
      } else {
        const isFull = Object.values(newSlots).every(c => c !== null);
        if (isFull) {
          setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
        }
      }
    } else {
      dispatch({ type: 'DISCARD_CARD' });
    }
  }
}

```

---

### File: `lib/GameRules/ReplaceMode.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class ReplaceMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return true; // If full, allow replacing anything

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    if (pool.length === 0) return { nextCard: null, remainingPool: [] };
    const [nextCard, ...remainingPool] = pool;
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    
    // Always place card, overwriting if needed
    dispatch({ type: 'PLACE_CARD', payload: { card } });
    const newSlots = { ...slots, [slotKey]: card };
    if (isFlowComplete(newSlots, correctCards)) {
      setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
    } else {
      const isFull = Object.values(newSlots).every(c => c !== null);
      if (isFull) {
        setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
      }
    }
  }
}

```

---

### File: `lib/GameRules/RuleManager.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { LockMode } from './LockMode';
import { ReplaceMode } from './ReplaceMode';
import { SoftLockMode } from './SoftLockMode';
import { Card, SlotState, GameMode } from '@/types';

export class RuleManager {
  private static modes: Record<GameMode, IRuleMode> = {
    LOCK_ON_FILL: new LockMode(),
    REPLACE_ALLOWED: new ReplaceMode(),
    SOFT_LOCK: new SoftLockMode(),
  };

  static getMode(mode: GameMode): IRuleMode {
    return this.modes[mode];
  }

  static rebuildDeck(pool: Card[], slots: SlotState, mode: GameMode): Card[] {
    const strategy = this.getMode(mode);
    const rebuiltDeck: Card[] = [];
    let currentPool = [...pool];

    while (currentPool.length > 0) {
      const { nextCard, remainingPool } = strategy.generateNextCard(currentPool, slots);
      currentPool = remainingPool;
      if (nextCard) {
        rebuiltDeck.push(nextCard);
      }
    }
    return rebuiltDeck;
  }
}

```

---

### File: `lib/GameRules/SoftLockMode.ts`

```typescript
import { IRuleMode } from './IRuleMode';
import { Card, CardType, SlotState, CARD_TYPE_SLOT_MAP, SLOT_ORDER } from '@/types';
import type { Action } from '@/store/gameStore';
import React from 'react';
import { isFlowComplete } from '@/data/mockData';

export class SoftLockMode implements IRuleMode {
  canCategorySpawn(category: CardType, slots: SlotState): boolean {
    const nextSlotKey = SLOT_ORDER.find(key => slots[key] === null);
    if (!nextSlotKey) return true; // If full, allow everything

    const slotKey = CARD_TYPE_SLOT_MAP[category];
    return slotKey === nextSlotKey;
  }

  generateNextCard(pool: Card[], slots: SlotState): { nextCard: Card | null, remainingPool: Card[] } {
    if (pool.length === 0) return { nextCard: null, remainingPool: [] };
    const [first, ...remainingPool] = pool;
    
    const slotKey = CARD_TYPE_SLOT_MAP[first.card_type];
    const isFull = slots[slotKey] !== null;
    
    let nextCard = { ...first };
    if (isFull) {
      nextCard.isUpgraded = true;
    }
    
    return { nextCard, remainingPool };
  }

  handleSwipeRight(card: Card, slots: SlotState, correctCards: Card[], dispatch: React.Dispatch<Action>) {
    const slotKey = CARD_TYPE_SLOT_MAP[card.card_type];
    
    if (slots[slotKey] !== null) {
      // Slot is full, trigger confirm popup
      dispatch({ type: 'SHOW_CONFIRM_POPUP', payload: card });
    } else {
      dispatch({ type: 'PLACE_CARD', payload: { card } });
      const newSlots = { ...slots, [slotKey]: card };
      if (isFlowComplete(newSlots, correctCards)) {
        setTimeout(() => dispatch({ type: 'PERSONA_CLAIMED_BY_ME' }), 500);
      } else {
        const isFull = Object.values(newSlots).every(c => c !== null);
        if (isFull) {
          setTimeout(() => dispatch({ type: 'SHOW_TRY_AGAIN' }), 500);
        }
      }
    }
  }
}

```

---

### File: `lib/GameRules/game-queries.ts`

```typescript
import { gql } from '@apollo/client';

export const WATCH_TEAMS = gql`
  subscription WatchTeams {
    teams(where: { leader_id: { _is_null: false } }) {
      id
      name
      color
      leader_id
      user {       # <--- Using the relation from your image!
        name
      }
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($name: String!, $color: String!, $userId: uuid!) {
    insert_teams_one(
      object: {
        name: $name,
        color: $color,
        created_by: $userId
      }
    ) {
      id
      color
      created_by
    }
  }
`;


export const ADD_TEAM_MEMBER = gql`
  mutation AddTeamMember($teamId: uuid!, $userId: uuid!, $memberType: String!) {
    insert_team_members_one(
      object: {
        team_id: $teamId,
        user_id: $userId,
        member_type: $memberType
      }
    ) {
      id
      team_id
      user_id
      member_type
    }
  }
`;

export const GET_USER_CLAIM = gql`
  query GetUserClaim($userId: String!) {
    teams(where: { leader_id: { _eq: $userId } }) {
      id
      name
    }
  }
`;

```

---

### File: `lib/GameRules/index.ts`

```typescript
export * from './IRuleMode';
export * from './LockMode';
export * from './ReplaceMode';
export * from './SoftLockMode';
export * from './RuleManager';

```

---

### File: `lib/apollo-client.ts`

```typescript
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

export function makeApolloClient(token: string) {
  const httpUri = process.env.NEXT_PUBLIC_HASURA_HTTP || 'http://localhost:8080/v1/graphql'
  const wsUri = process.env.NEXT_PUBLIC_HASURA_WS || 'ws://localhost:8080/v1/graphql'

  // Server-side / static export safe check
  const isServer = typeof window === 'undefined'

  const httpLink = new HttpLink({
    uri: httpUri,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  // Only initialize WebSocket link on the client
  let splitLink;
  
  if (!isServer) {
    const wsLink = new GraphQLWsLink(
      createClient({
        url: wsUri,
        connectionParams: {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        },
      })
    )

    // Subscriptions go over WS, everything else over HTTP
    splitLink = split(
      ({ query }) => {
        const def = getMainDefinition(query)
        return (
          def.kind === 'OperationDefinition' &&
          def.operation === 'subscription'
        )
      },
      wsLink,
      httpLink
    )
  } else {
    splitLink = httpLink
  }

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  })
}

```

---

### File: `lib/apollo-provider.tsx`

```tsx
'use client'

import { ApolloProvider } from '@apollo/client/react'
import { makeApolloClient } from './apollo-client'
import { useMemo, useEffect } from 'react'

export function ApolloClientProvider({
  children,
  token,
}: {
  children: React.ReactNode
  token: string
}) {
  const client = useMemo(() => makeApolloClient(token), [token])

  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt-token', token)
    } else {
      localStorage.removeItem('jwt-token')
    }
  }, [token])

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}

```

---

### File: `lib/auth.ts`

```typescript
import { randomUUID } from 'crypto'
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { hasuraAdminRequest } from './hasura'

async function upsertUser(email: string, name?: string | null, avatarUrl?: string | null) {
  const generatedId = randomUUID()
  const now = new Date().toISOString()
  const data = await hasuraAdminRequest<{
    insert_users_one: { id: string }
  }>(
    `mutation UpsertUser(
      $id: uuid!, 
      $email: String!, 
      $name: String, 
      $avatarUrl: String, 
      $createdAt: timestamptz!, 
      $updatedAt: timestamptz!
    ) {
      insert_users_one(
        object: { 
          id: $id, 
          email: $email, 
          name: $name, 
          profile_picture: $profile_picture, 
          created_at: $createdAt, 
          updated_at: $updatedAt 
        }
        on_conflict: {
          constraint: users_email_key
          update_columns: [name, profile_picture, updated_at]
        }
      ) { id }
    }`,
    { id: generatedId, email, name, avatarUrl, createdAt: now, updatedAt: now }
  )
  return data.insert_users_one
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-client-secret',
    }),
    CredentialsProvider({
      name: 'Test Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test1@example.com" },
        name: { label: "Name", type: "text", placeholder: "Gamer Pro" },
        avatar: { label: "Avatar URL (Optional)", type: "text", placeholder: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gamer" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        
        try {
          // Synchronize user with the Postgres DB immediately during authorization
          const dbUser = await upsertUser(
            credentials.email,
            credentials.name,
            credentials.avatar
          )
          return {
            id: dbUser.id, // Return the real database UUID
            email: credentials.email,
            name: credentials.name || 'Anonymous Gamer',
            image: credentials.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${credentials.name || 'Gamer'}`
          }
        } catch (err) {
          console.error('[NextAuth Credentials Auth Error]:', err)
          // Fallback to email as ID so dev login doesn't crash completely if DB is offline
          return {
            id: credentials.email,
            email: credentials.email,
            name: credentials.name || 'Anonymous Gamer',
            image: credentials.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${credentials.name || 'Gamer'}`
          }
        }
      }
    })
  ],

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'local-secret-key-32-chars-long-for-testing',

  callbacks: {
    // Runs when JWT is created or refreshed
    async jwt({ token, user, account }) {
      if (user) {
        // If user.id is already a valid UUID (which is true for our Credentials provider), use it directly.
        // Otherwise (e.g. Google OAuth), upsert the user to get their PostgreSQL UUID.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
        if (isUuid) {
          token.dbUserId = user.id
        } else if (user.email) {
          try {
            const dbUser = await upsertUser(
              user.email,
              user.name,
              user.image
            )
            token.dbUserId = dbUser.id
          } catch (err) {
            console.error('[NextAuth JWT Sync Error]:', err)
          }
        }
      }
      return token
    },

    // Runs when session is accessed (getServerSession / useSession)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.dbUserId ?? token.sub!
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
  },
}

```

---

### File: `lib/graphql/mutations.ts`

```typescript
# Host: create initialize the card game session for a room
export const CREATE_CARD_GAME_SESSION = gql`
mutation CreateCardGameSession($roomId: uuid!, $domainId: uuid!, $startedBy: uuid!, $personaIds: [room_card_game_personas_insert_input!]!) {
  insert_room_card_game_sessions_one(
    object: {
      room_id: $roomId
      selected_domain_id: $domainId
      status: "active"
      started_by: $startedBy
      started_at: "now()"
      room_card_game_personas: { data: $personaIds }
    }
    on_conflict: { constraint: room_card_game_sessions_room_id_key, update_columns: [selected_domain_id, status, started_at, started_by] }
  ) {
    id
    status
  }
}
`
# Player: place a card into a slot
export const UPSERT_PLAYER_SLOT = gql`mutation UpsertPlayerSlot($sessionId: uuid!, $userId: uuid!, $personaId: uuid!, $slotType: card_flow_type!, $flowCardId: uuid!) {
  insert_room_card_game_player_slots_one(
    object: {
      session_id: $sessionId
      user_id: $userId
      persona_id: $personaId
      slot_type: $slotType
      flow_card_id: $flowCardId
      placed_at: "now()"
    }
    on_conflict: {
      constraint: room_card_game_player_slots_session_id_user_id_persona_id_slot_type_key
      update_columns: [flow_card_id, placed_at]
    }
  ) { id }
}
`
# Player: claim a persona (atomic — only succeeds if not already claimed)
export const CLAIM_PERSONA = gql`mutation ClaimPersona($sessionPersonaId: uuid!, $userId: uuid!) {
  update_room_card_game_personas(
    where: {
      id: { _eq: $sessionPersonaId }
      is_claimed: { _eq: false }
    }
    _set: {
      is_claimed: true
      claimed_by: $userId
      claimed_at: "now()"
    }
  ) {
    affected_rows
    returning { id persona_id claimed_by is_claimed }
  }
}
`

```

---

### File: `lib/graphql/queries.ts`

```typescript
import { gql } from '@apollo/client'

export const GET_ROOM_BY_CODE = gql`
  query GetRoomByCode($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      host_user_id
    }
  }
`

export const GET_GAME_STATE = gql`
  query GetGameState($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      host_user_id
      max_players
      room_players(order_by: { joined_at: asc }) {
        joined_at
        user {
          id
          name
          profile_picture
        }
      }
      game_state {
        room_id
        state
        updated_at
      }
    }
  }
`

```

---

### File: `lib/graphql/subscriptions.ts`

```typescript
import { gql } from '@apollo/client'

// Used in the lobby — fires whenever any player joins or leaves,
// or when the host changes room status (waiting → in_game)
export const LOBBY_SUBSCRIPTION = gql`
  subscription LobbyPlayers($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      host_user_id
      max_players
      room_players(order_by: { joined_at: asc }) {
        joined_at
        user {
          id
          name
          profile_picture
        }
      }
    }
  }
`

export const GAME_STATE_SUBSCRIPTION = gql`
  subscription GameStateSubscription($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      host_user_id
      max_players
      room_players(order_by: { joined_at: asc }) {
        joined_at
        user {
          id
          name
          profile_picture
        }
      }
      game_state {
        room_id
        state
        updated_at
      }
    }
  }
`



export const CARD_GAME_SESSION_SUBSCRIPTION = gql`
subscription CardGameSessionSub($sessionId: uuid!) {
  room_card_game_sessions_by_pk(id: $sessionId) {
    id
    status
    selected_domain_id
    game_mode
    started_at
    room_card_game_personas(order_by: { persona: { title: asc } }) {
      id
      persona_id
      is_claimed
      claimed_by
      claimed_at
      persona {
        id
        title
        description
        image_url
        domain_id
      }
    }
  }
}
`


export const PLAYER_SLOTS_SUBSCRIPTION = gql`
subscription PlayerSlotsSub($sessionId: uuid!, $userId: uuid!, $personaId: uuid!) {
  room_card_game_player_slots(
    where: {
      session_id: { _eq: $sessionId }
      user_id: { _eq: $userId }
      persona_id: { _eq: $personaId }
    }
  ) {
    slot_type
    flow_card_id
    placed_at
    flow_card {
      id
      type
      title
      description
      sort_order
    }
  }
}
`




export const ALL_PLAYER_SLOTS_SUBSCRIPTION = gql`
subscription AllPlayerSlotsSub($sessionId: uuid!, $personaId: uuid!) {
  room_card_game_player_slots(
    where: {
      session_id: { _eq: $sessionId }
      persona_id: { _eq: $personaId }
    }
    order_by: { placed_at: asc }
  ) {
    user_id
    slot_type
    flow_card_id
    placed_at
  }
}
`

```

---

### File: `lib/hasura-token.ts`

```typescript
import jwt from 'jsonwebtoken'

export function generateHasuraToken(userId: string): string {
  const secret = process.env.HASURA_JWT_SECRET || 'local-hasura-secret-key-32-chars-long-for-testing'
  return jwt.sign(
    {
      sub: userId,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['user'],
        'x-hasura-default-role': 'user',
        'x-hasura-user-id': userId,
      },
    },
    secret,
    { expiresIn: '1h' }
  )
}

```

---

### File: `lib/hasura.ts`

```typescript
const ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8100/v1/graphql'
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'secret'

export async function hasuraAdminRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!ENDPOINT) {
    throw new Error('HASURA_GRAPHQL_ENDPOINT is not configured.')
  }

  // Normal database operation
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()

  if (json.errors) {
    console.error('Hasura error:', json.errors)
    throw new Error(json.errors[0].message)
  }

  return json.data
}

```

---

### File: `lib/multiplayer/graphql.ts`

```typescript
import { gql } from '@apollo/client'

export const MULTIPLAYER_LOBBY_SUBSCRIPTION = gql`
  subscription LobbyPlayers($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      game_id
      host_user_id
      max_players
      room_players(order_by: { joined_at: asc }) {
        joined_at
        user {
          id
          name
          profile_picture
        }
      }
    }
  }
`

export const MULTIPLAYER_GAME_STATE_SUBSCRIPTION = gql`
  subscription GameStateSubscription($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      code
      status
      game_id
      host_user_id
      max_players
      room_players(order_by: { joined_at: asc }) {
        joined_at
        user {
          id
          name
          profile_picture
        }
      }
      game_state {
        room_id
        state
        updated_at
      }
    }
  }
`

export const GET_ROOM_BY_CODE = gql`
  query GetRoomByCode($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      game_id
      host_user_id
    }
  }
`

```

---

### File: `lib/multiplayer/jwt.ts`

```typescript
import jwt from 'jsonwebtoken'

export function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.decode(token) as any
    const claims = decoded?.['https://hasura.io/jwt/claims']
    return claims?.['x-hasura-user-id'] || decoded?.sub || null
  } catch (err) {
    console.error('[JWT Decode Error]:', err)
    return null
  }
}

```

---

### File: `lib/multiplayer/types.ts`

```typescript
export interface MultiplayerPlayer {
  joined_at: string;
  user: {
    id: string;
    name: string;
    profile_picture: string;
  };
}

export interface MultiplayerRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: 'waiting' | 'in_game' | 'finished';
  game_id: string;
  max_players: number;
  room_players: MultiplayerPlayer[];
  game_state?: {
    state: any;
  };
}

```

---

### File: `lib/multiplayer/useMultiplayer.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSubscription } from '@apollo/client/react'
import { MULTIPLAYER_GAME_STATE_SUBSCRIPTION } from './graphql'
import { MultiplayerRoom } from './types'

function getUserIdFromLocalStorage(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('jwt-token')
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const decoded = JSON.parse(jsonPayload)
    const claims = decoded?.['https://hasura.io/jwt/claims']
    return claims?.['x-hasura-user-id'] || decoded?.sub || null
  } catch (e) {
    return null
  }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('jwt-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function useMultiplayer(roomCodeFromUrl?: string) {
  // Read code from parameter or fallback gracefully to active tracking string
  const [activeCode, setActiveCode] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [pollingData, setPollingData] = useState<any>(null)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    setUserId(getUserIdFromLocalStorage())
    const standardCode = roomCodeFromUrl || localStorage.getItem('active-room-code') || ''
    setActiveCode(standardCode.toUpperCase().trim())
  }, [roomCodeFromUrl])

  const { data: subData, loading: subLoading, error: subError } = useSubscription<any>(
    MULTIPLAYER_GAME_STATE_SUBSCRIPTION,
    {
      variables: { code: activeCode },
      skip: pollingActive || !activeCode,
    }
  )

  useEffect(() => {
    if (subError && activeCode) {
      setPollingActive(true)
    }
  }, [subError, activeCode])

  useEffect(() => {
    if (!pollingActive || !activeCode) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/multiplayer/game-state?code=${activeCode}`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setPollingData(data)
          setPollingError(null)
        }
      } catch (err) {
        setPollingError('Database pipeline disconnected')
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 1500)
    return () => clearInterval(interval)
  }, [pollingActive, activeCode])

  const room: MultiplayerRoom | undefined = pollingActive
    ? pollingData?.rooms?.[0]
    : subData?.rooms?.[0]

  const isHost = room?.host_user_id === userId

  const startGame = async (gameId: string, initialState?: any) => {
    if (!activeCode) return false
    try {
      const res = await fetch('/api/multiplayer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: activeCode, gameId, initialState }),
      })
      return res.ok
    } catch (err) {
      return false
    }
  }

  const updateGameState = async (stateUpdate: any) => {
    if (updating || !activeCode) return
    setUpdating(true)
    try {
      await fetch('/api/multiplayer/game-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: activeCode, state: stateUpdate }),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const leaveRoom = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('active-room-code')
      window.location.href = '/dashboard'
    }
  }

  return {
    userId,
    room,
    gameState: room?.game_state?.state ?? null,
    loading: pollingActive ? !pollingData && !pollingError : subLoading,
    error: pollingError || (subError && !pollingActive ? subError.message : null),
    isHost,
    isWS: !pollingActive,
    activeRoomCode: activeCode,
    startGame,
    updateGameState,
    leaveRoom,
  }
}

```

---

### File: `lib/room-code.ts`

```typescript
// No ambiguous characters (0/O, 1/I/l)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateRoomCode(): string {
  return Array.from(
    { length: 6 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}

```

---

### File: `lib/session-provider.tsx`

```tsx
'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export default function NextAuthProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}

```

---

### File: `next-env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.

```

---

### File: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins:['192.168.200.108']
    // ["http://localhost:3000", "http://192.168.1.14:3000"],
    /* config options here */
};

export default nextConfig;

```

---

### File: `package.json`

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@apollo/client": "^4.1.9",
    "@apollo/client-integration-nextjs": "^0.14.5",
    "canvas-confetti": "^1.9.4",
    "framer-motion": "^12.38.0",
    "graphql": "^16.14.0",
    "graphql-ws": "^6.0.8",
    "html-to-image": "^1.11.13",
    "jsonwebtoken": "^9.0.3",
    "lucide-react": "^1.16.0",
    "next": "16.2.6",
    "next-auth": "^4.24.14",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}

```

---

### File: `store/gameStore.tsx`

```tsx
// lib/gameStore.ts
// Lightweight React Context-based state store — no Redux needed for MVP.
// Swap persistence layer for Hasura mutations when backend is live.

'use client';
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Domain, Persona, Card, SlotState, User, CardType, CARD_TYPE_SLOT_MAP, GameMode } from '@/app/x/types/index';
import { RuleManager } from '@/app/x/lib/GameRules';

// ─── STATE ────────────────────────────────────────────────────
export interface GameState {
  currentUser:    User | null;
  selectedDomain: Domain | null;
  selectedPersona: Persona | null;
  correctCards:   Card[];
  deck:           Card[];
  pool:           Card[];
  discardPile:    Card[];
  slots:          SlotState;
  opponentCount:  number;
  gamePhase: 'USER_SELECT' | 'DOMAIN_SELECT' | 'PERSONA_SELECT' | 'PLAYING' | 'WON' | 'PERSONA_TAKEN' | 'LEADERBOARD';
  personaClaimed: boolean;
  personaTakenBy: string | null;
  gameMode:       GameMode;
  confirmCard:    Card | null;
  showTryAgainPopup: boolean;
  showDeck:       boolean;
  leaderboard:    Array<{
    user: User;
    persona: Persona;
    domain: Domain;
    claimedAt: string;
  }>;
}

const emptySlots: SlotState = { 
  AVATAR:      null, 
  PERSONA:     null, 
  SCENARIO:    null, 
  UX_PROBLEM:  null, 
  UI_PROBLEM:  null, 
  CX_PROBLEM:  null, 
  AI_PROBLEM:  null 
};

const initialState: GameState = {
  currentUser:     null,
  selectedDomain:  null,
  selectedPersona: null,
  correctCards:    [],
  deck:            [],
  pool:            [],
  discardPile:     [],
  slots:           emptySlots,
  opponentCount:   0,
  gamePhase:       'USER_SELECT',
  personaClaimed:  false,
  personaTakenBy:  null,
  gameMode:        'LOCK_ON_FILL',
  confirmCard:     null,
  showTryAgainPopup: false,
  showDeck:        true,
  leaderboard:     [],
};

// ─── ACTIONS ──────────────────────────────────────────────────
export type Action =
  | { type: 'SET_USER';           payload: User }
  | { type: 'SELECT_DOMAIN';      payload: Domain }
  | { type: 'SELECT_PERSONA';     payload: { persona: Persona; correctCards: Card[]; deck: Card[] } }
  | { type: 'PLACE_CARD';         payload: { card: Card } }
  | { type: 'DISCARD_CARD' }
  | { type: 'SET_OPPONENT_COUNT'; payload: number }
  | { type: 'PERSONA_CLAIMED_BY_ME' }
  | { type: 'PERSONA_TAKEN_BY';   payload: string }
  | { type: 'RESET_BOARD' }
  | { type: 'GO_TO_PHASE';        payload: GameState['gamePhase'] }
  | { type: 'SET_GAME_MODE';      payload: GameMode }
  | { type: 'SHOW_CONFIRM_POPUP'; payload: Card }
  | { type: 'CANCEL_CONFIRM' }
  | { type: 'SHOW_TRY_AGAIN' }
  | { type: 'HIDE_TRY_AGAIN' }
  | { type: 'PLACE_CARD_FORCE';   payload: { card: Card } }
  | { type: 'TOGGLE_DECK_VISIBILITY' };

function reducer(state: GameState, action: Action): GameState {
  // Ensure leaderboard exists to prevent HMR or state initialization issues
  const leaderboard = state.leaderboard || [];
  const safeState = { ...state, leaderboard };

  switch (action.type) {
    case 'SET_USER':
      return { ...safeState, currentUser: action.payload, gamePhase: 'DOMAIN_SELECT' };

    case 'SELECT_DOMAIN':
      return { ...safeState, selectedDomain: action.payload, gamePhase: 'PERSONA_SELECT' };

    case 'SELECT_PERSONA': {
      const { persona, correctCards, deck: initialPool } = action.payload;
      const avatarCard = correctCards.find(c => c.card_type === 'AVATAR') || null;
      
      const startingSlots = { 
        ...emptySlots, 
        AVATAR: avatarCard 
      };

      const remainingPool = avatarCard 
        ? initialPool.filter(c => c.id !== avatarCard.id)
        : initialPool;

      const initialDeck = RuleManager.rebuildDeck(remainingPool, startingSlots, state.gameMode);
      
      return {
        ...safeState,
        selectedPersona: persona,
        correctCards:    correctCards,
        pool:            remainingPool,
        discardPile:     [],
        deck:            initialDeck,
        slots:           startingSlots,
        gamePhase:       'PLAYING',
        personaClaimed:  false,
        personaTakenBy:  null,
      };
    }

    case 'PLACE_CARD': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
      };
    }

    case 'DISCARD_CARD': {
      if (state.deck.length === 0) return state;
      const discardedCard = state.deck[0];
      let newPool = state.pool.filter(c => c.id !== discardedCard.id);
      let newDiscardPile = [...state.discardPile, discardedCard];
      
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
      
      // Respawn left-swiped cards if deck is empty
      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, state.gameMode);
        newDiscardPile = [];
      }
      
      return { ...safeState, pool: newPool, discardPile: newDiscardPile, deck: newDeck };
    }

    case 'SET_OPPONENT_COUNT':
      return { ...safeState, opponentCount: action.payload };

    case 'PERSONA_CLAIMED_BY_ME': {
      const newClaim = {
        user: state.currentUser!,
        persona: state.selectedPersona!,
        domain: state.selectedDomain!,
        claimedAt: new Date().toISOString(),
      };
      return { 
        ...safeState, 
        gamePhase: 'WON', 
        personaClaimed: true,
        leaderboard: [newClaim, ...leaderboard]
      };
    }

    case 'PERSONA_TAKEN_BY':
      return { ...safeState, gamePhase: 'PERSONA_TAKEN', personaTakenBy: action.payload };

    case 'RESET_BOARD': {
      const avatarCard = state.correctCards.find(c => c.card_type === 'AVATAR') || null;
      const startingSlots = { ...emptySlots, AVATAR: avatarCard };
      
      // Collect all cards currently in slots and pool, except the fixed avatar card
      const allCards = [...state.pool, ...Object.values(state.slots).filter(Boolean) as Card[]];
      const newPool = allCards.filter(c => c.id !== avatarCard?.id).sort(() => Math.random() - 0.5);
      
      const newDeck = RuleManager.rebuildDeck(newPool, startingSlots, state.gameMode);
      return {
        ...safeState,
        slots:          startingSlots,
        pool:           newPool,
        discardPile:    [],
        deck:           newDeck,
        gamePhase:      'PLAYING',
        personaClaimed: false,
        personaTakenBy: null,
        showTryAgainPopup: false,
      };
    }

    case 'GO_TO_PHASE':
      return { ...safeState, gamePhase: action.payload };

    case 'SET_GAME_MODE': {
      const newMode = action.payload;
      let newPool = state.pool;
      let newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, state.slots, newMode);
        newDiscardPile = [];
      }
      return { ...safeState, gameMode: newMode, deck: newDeck, pool: newPool, discardPile: newDiscardPile };
    }

    case 'SHOW_CONFIRM_POPUP':
      return { ...safeState, confirmCard: action.payload };

    case 'CANCEL_CONFIRM':
      return { ...safeState, confirmCard: null };

    case 'SHOW_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: true };

    case 'HIDE_TRY_AGAIN':
      return { ...safeState, showTryAgainPopup: false };

    case 'PLACE_CARD_FORCE': {
      const { card } = action.payload;
      const slotKey = CARD_TYPE_SLOT_MAP[card.card_type as CardType];
      const newSlots = { ...state.slots, [slotKey]: card };
      let newPool = state.pool.filter(c => c.id !== card.id);
      let newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
      let newDiscardPile = state.discardPile;

      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        newPool = [...newPool, ...newDiscardPile].sort(() => Math.random() - 0.5);
        newDeck = RuleManager.rebuildDeck(newPool, newSlots, state.gameMode);
        newDiscardPile = [];
      }

      return {
        ...safeState,
        slots: newSlots,
        pool: newPool,
        deck: newDeck,
        discardPile: newDiscardPile,
        confirmCard: null,
      };
    }

    case 'TOGGLE_DECK_VISIBILITY':
      return { ...safeState, showDeck: !state.showDeck };

    default:
      return state;
  }
}

// ─── CONTEXT ──────────────────────────────────────────────────
const GameContext = createContext<{
  state:    GameState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
```

---

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

---

### File: `types/index.ts`

```typescript
// 
// lib/types.ts — Shared game types

// export type CardType = 'IDENTITY' | 'DESCRIPTION' | 'SCENARIO' | 'TASK' | 'TASK_FLOW' | 'PERSUASION';
// export type PersonaStatus = 'AVAILABLE' | 'CLAIMED';
// export type GameMode = 'LOCK_ON_FILL' | 'REPLACE_ALLOWED' | 'SOFT_LOCK';

// export interface User {
//   id: string;
//   username: string;
//   teamName?: string;
//   teamMembers?: string[];
// }

// export interface Domain {
//   id: string;
//   name: string;
//   description: string;
//   icon: string;
// }

// // export interface Persona {
//   // id: string;
//   // name: string;
//   // color_code: string;
//   // asset_path: string;
//   // status: PersonaStatus;
//   // claimed_by_user_id: string | null;
//   // claimed_at: string | null;
// // }

// export interface Persona {
//   id: string;
//   name: string;
//   domain_id: string; 
//   color_code: string;
//   asset_path: string;
//   status: PersonaStatus;
//   claimed_by_user_id: string | null;
//   claimed_at?: string | null; // <--- Add this line back
//   description?: string;
//   scenario?: string;
//   ux_problems?: string;
//   ui_problems?: string;
//   cx_problems?: string;
//   ai_problems?: string;
//   persona_details?: string; 
// }



// export interface Card {
//   id: string;
//   persona_id: string;
//   domain_id: string;
//   card_type: CardType;
//   content: string;
//   isUpgraded?: boolean;
//   // New fields to support the rich card design
//   heading?: string;
//   subHeading?: string;
//   listItems?: string[];
//   sections?: { label: string; value: string }[];
// }

// export interface GameSession {
//   id: string;
//   user_id: string;
//   persona_id: string;
//   domain_id: string;
//   slot_identity_id: string | null;
//   slot_description_id: string | null;
//   slot_scenario_id: string | null;
//   slot_task_id: string | null;
//   slot_task_flow_id: string | null;
//   slot_persuasion_id: string | null;
//   is_complete: boolean;
// }

// export type SlotKey = 'IDENTITY' | 'DESCRIPTION' | 'SCENARIO' | 'TASK' | 'TASK_FLOW' | 'PERSUASION';

// export interface SlotState {
//   IDENTITY:    Card | null;
//   DESCRIPTION: Card | null;
//   SCENARIO:    Card | null;
//   TASK:        Card | null;
//   TASK_FLOW:   Card | null;
//   PERSUASION:  Card | null;
// }

// export const SLOT_ORDER: SlotKey[] = [
//   'IDENTITY', 
//   'DESCRIPTION', 
//   'SCENARIO', 
//   'TASK', 
//   'TASK_FLOW', 
//   'PERSUASION'
// ];

// export const SLOT_LABELS: Record<SlotKey, string> = {
//   IDENTITY:    'Identity',
//   DESCRIPTION: 'Persona',
//   SCENARIO:    'Scenario',
//   TASK:        'Task',
//   TASK_FLOW:   'Flow',
//   PERSUASION:  'Tool',
// };

// export const CARD_TYPE_SLOT_MAP: Record<CardType, SlotKey> = {
//   IDENTITY:    'IDENTITY',
//   DESCRIPTION: 'DESCRIPTION',
//   SCENARIO:    'SCENARIO',
//   TASK:        'TASK',
//   TASK_FLOW:   'TASK_FLOW',
//   PERSUASION:  'PERSUASION',
// };



// lib/types.ts — Shared game types

export type CardType = 'AVATAR' | 'PERSONA' | 'SCENARIO' | 'UX_PROBLEM' | 'UI_PROBLEM' | 'CX_PROBLEM' | 'AI_PROBLEM';
export type PersonaStatus = 'AVAILABLE' | 'CLAIMED';
export type GameMode = 'LOCK_ON_FILL' | 'REPLACE_ALLOWED' | 'SOFT_LOCK';

export interface User {
  id: string;
  username: string;
  teamName?: string;
  teamMembers?: string[];
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Persona {
  id: string;
  name: string;
  domain_id: string;
  color_code: string;
  asset_path: string;
  status: PersonaStatus;
  claimed_by_user_id: string | null;
  claimed_at?: string | null; // Added to resolve the mockData build error
  description?: string;
  scenario?: string;
  ux_problems?: string;
  ui_problems?: string;
  cx_problems?: string;
  ai_problems?: string;
  persona_details?: string;
}

export interface Card {
  id: string;
  persona_id: string;
  domain_id: string;
  card_type: CardType;
  content: string;
  isUpgraded?: boolean;
  heading?: string;
  subHeading?: string;
  listItems?: string[];
  sections?: { label: string; value: string }[];
  bodyText?: string;
}

export interface GameSession {
  id: string;
  user_id: string;
  persona_id: string;
  domain_id: string;
  slot_avatar_id: string | null;
  slot_persona_id: string | null;
  slot_scenario_id: string | null;
  slot_ux_problem_id: string | null;
  slot_ui_problem_id: string | null;
  slot_cx_problem_id: string | null;
  slot_ai_problem_id: string | null;
  is_complete: boolean;
}

export type SlotKey = 'AVATAR' | 'PERSONA' | 'SCENARIO' | 'UX_PROBLEM' | 'UI_PROBLEM' | 'CX_PROBLEM' | 'AI_PROBLEM';

export interface SlotState {
  AVATAR: Card | null;
  PERSONA: Card | null;
  SCENARIO: Card | null;
  UX_PROBLEM: Card | null;
  UI_PROBLEM: Card | null;
  CX_PROBLEM: Card | null;
  AI_PROBLEM: Card | null;
}

export const SLOT_ORDER: SlotKey[] = [
  'AVATAR',
  'PERSONA',
  'SCENARIO',
  'UX_PROBLEM',
  'UI_PROBLEM',
  'CX_PROBLEM',
  'AI_PROBLEM'
];

export const SLOT_LABELS: Record<SlotKey, string> = {
  AVATAR: 'Avatar',
  PERSONA: 'Persona',
  SCENARIO: 'Scenario',
  UX_PROBLEM: 'UX Problem',
  UI_PROBLEM: 'UI Problem',
  CX_PROBLEM: 'CX Problem',
  AI_PROBLEM: 'AI Problem',
};

export const CARD_TYPE_SLOT_MAP: Record<CardType, SlotKey> = {
  AVATAR: 'AVATAR',
  PERSONA: 'PERSONA',
  SCENARIO: 'SCENARIO',
  UX_PROBLEM: 'UX_PROBLEM',
  UI_PROBLEM: 'UI_PROBLEM',
  CX_PROBLEM: 'CX_PROBLEM',
  AI_PROBLEM: 'AI_PROBLEM',
};
```

---

### File: `types/next-auth.d.ts`

```typescript
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string        // our DB UUID, not the provider's ID
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    dbUserId?: string   // stored in the encrypted session cookie
  }
}

```

---

