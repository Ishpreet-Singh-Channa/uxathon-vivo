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

          room_persona_claims(order_by: { claimed_at: asc }) {
          id
          room_id
          user_id
          domain_id
          domain_name
          domain_description
          domain_icon
          persona_id
          persona_name
          persona_hex
          persona_asset_path
          claimed_at
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
