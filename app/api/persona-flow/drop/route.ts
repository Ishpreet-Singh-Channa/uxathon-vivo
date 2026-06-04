import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let teamId: string | undefined

  try {
    const body = await req.json()
    teamId = body.teamId
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!teamId) {
    return Response.json({ error: 'teamId is required' }, { status: 400 })
  }

  try {
    const teamData = await hasuraAdminRequest<{
      teams_by_pk: {
        id: string
        room_id: string | null
        persona_id: string | null
        created_by: string | null
        leader_id: string | null
      } | null
    }>(
      `query GetPersonaTeam($teamId: uuid!) {
        teams_by_pk(id: $teamId) {
          id
          room_id
          persona_id
          created_by
          leader_id
        }
      }`,
      { teamId }
    )

    const team = teamData.teams_by_pk

    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.room_id || !team.persona_id) {
      return Response.json(
        { error: 'This team is not linked to a Persona Flow claim' },
        { status: 400 }
      )
    }

    const ownsTeam = team.created_by === userId || team.leader_id === userId

    if (!ownsTeam) {
      return Response.json(
        { error: 'You can only drop your own persona' },
        { status: 403 }
      )
    }

    await hasuraAdminRequest(
      `mutation DropPersona(
        $teamId: uuid!
        $roomId: uuid!
        $personaId: String!
        $userId: uuid!
      ) {
        delete_team_members(
          where: {
            team_id: { _eq: $teamId }
          }
        ) {
          affected_rows
        }

        delete_teams_by_pk(id: $teamId) {
          id
        }

        delete_room_persona_claims(
          where: {
            room_id: { _eq: $roomId }
            persona_id: { _eq: $personaId }
            user_id: { _eq: $userId }
          }
        ) {
          affected_rows
        }
      }`,
      {
        teamId,
        roomId: team.room_id,
        personaId: team.persona_id,
        userId,
      }
    )

    return Response.json({
      success: true,
      dropped: true,
    })
  } catch (err: any) {
    console.error('Drop persona error:', err)
    return Response.json(
      { error: err.message || 'Failed to drop persona' },
      { status: 500 }
    )
  }
}
