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
