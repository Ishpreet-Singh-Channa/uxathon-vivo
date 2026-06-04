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

    // if (room.room_players_aggregate.aggregate.count >= room.max_players) {
    //   return Response.json({ error: 'Room is full' }, { status: 400 })
    // }

    // NULL max_players = unlimited
    if (
      typeof room.max_players === 'number' &&
      room.room_players_aggregate.aggregate.count >= room.max_players
    ) {
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
