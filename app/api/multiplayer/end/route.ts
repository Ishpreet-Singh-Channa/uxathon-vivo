import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

type EndGameBody = {
  code: string
  reason?: string
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: EndGameBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!body.code) {
    return Response.json({ error: 'Room code required' }, { status: 400 })
  }

  const code = body.code.toUpperCase().trim()

  try {
    const data = await hasuraAdminRequest<{
      rooms: Array<{
        id: string
        code: string
        status: string
        game_id: string
        host_user_id: string
        game_state?: {
          state: any
        } | null
      }>
    }>(
      `query GetRoomForEndGame($code: String!) {
        rooms(where: { code: { _eq: $code } }, limit: 1) {
          id
          code
          status
          game_id
          host_user_id
          game_state {
            state
          }
        }
      }`,
      { code }
    )

    const room = data.rooms?.[0]

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.host_user_id !== userId) {
      return Response.json({ error: 'Only the host can end the game' }, { status: 403 })
    }

    if (room.status === 'finished') {
      return Response.json({ success: true, alreadyFinished: true })
    }

    const previousState = room.game_state?.state || {}

    const endedAt = new Date().toISOString()

    const nextState = {
      ...previousState,
      endedByHost: true,
      endedAt,
      endReason: body.reason || 'Host ended the game',
      logs: [
        `Host ended ${room.game_id} at ${endedAt}.`,
        ...(Array.isArray(previousState.logs) ? previousState.logs : []),
      ].slice(0, 50),
    }

    if (room.game_id === 'persona-flow') {
      nextState.personaFlow = {
        ...(previousState.personaFlow || {}),
        ended: true,
        endedByHost: true,
        readyForBidding: true,
      }
    }

    if (room.game_id === 'bidding') {
      nextState.bidding = {
        ...(previousState.bidding || {}),
        phase: 'finished',
        endedAt,
        endedByHost: true,
      }
    }

    await hasuraAdminRequest(
      `mutation EndCurrentGame($roomId: uuid!, $state: jsonb!) {
        update_rooms_by_pk(
          pk_columns: { id: $roomId }
          _set: { status: "finished" }
        ) {
          id
          status
        }

        insert_game_state_one(
          object: {
            room_id: $roomId
            state: $state
          }
          on_conflict: {
            constraint: game_state_pkey
            update_columns: [state, updated_at]
          }
        ) {
          room_id
          state
          updated_at
        }
      }`,
      {
        roomId: room.id,
        state: nextState,
      }
    )

    return Response.json({
      success: true,
      status: 'finished',
      gameId: room.game_id,
    })
  } catch (err: any) {
    console.error('End game error:', err)
    return Response.json(
      { error: err.message || 'Failed to end game' },
      { status: 500 }
    )
  }
}
