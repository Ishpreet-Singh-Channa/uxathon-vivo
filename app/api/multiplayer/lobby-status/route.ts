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
