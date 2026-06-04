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
