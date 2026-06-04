import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

type ClaimBody = {
  code: string
  domain: {
    id: string
    name: string
    description?: string
    icon?: string
  }
  persona: {
    id: string
    name: string
    color_code: string
    asset_path?: string
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ClaimBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!body.code || !body.domain || !body.persona) {
    return Response.json({ error: 'Missing code, domain, or persona' }, { status: 400 })
  }

  const code = body.code.toUpperCase().trim()

  try {
    const roomData = await hasuraAdminRequest<{
    rooms: Array<{
      id: string
      status: string
      game_id: string
      host_user_id: string
      room_players: Array<{ user_id: string }>
      game_state?: {
        state: any
      } | null
    }>
  }>(
      `query GetPersonaRoom($code: String!) {
        rooms(where: { code: { _eq: $code } }) {
          id
          status
          game_id
          host_user_id
          room_players {
            user_id
          }
          game_state {
            state
          }
        }
      }  `,
      { code }
    )

    const room = roomData.rooms?.[0]

    if (!room) {
      return Response.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'in_game' || room.game_id !== 'persona-flow') {
      return Response.json({ error: 'Persona Flow is not active in this room' }, { status: 400 })
    }

    if (room.host_user_id === userId) {
      return Response.json({ error: 'Host cannot claim a persona' }, { status: 403 })
    }

    const isPlayer = room.room_players.some((p) => p.user_id === userId)
    if (!isPlayer) {
      return Response.json({ error: 'You are not a player in this room' }, { status: 403 })
    }

    const claimResult = await hasuraAdminRequest<{
      insert_room_persona_claims: {
        affected_rows: number
        returning: Array<{
          id: string
          room_id: string
          user_id: string
          persona_id: string
          persona_name: string
          persona_hex: string
          domain_id: string
          domain_name: string
          claimed_at: string
        }>
      }
    }>(
      `mutation TryClaimPersona(
        $roomId: uuid!
        $userId: uuid!
        $domainId: String!
        $domainName: String!
        $domainDescription: String
        $domainIcon: String
        $personaId: String!
        $personaName: String!
        $personaHex: String!
        $personaAssetPath: String
      ) {
        insert_room_persona_claims(
          objects: [{
            room_id: $roomId
            user_id: $userId
            domain_id: $domainId
            domain_name: $domainName
            domain_description: $domainDescription
            domain_icon: $domainIcon
            persona_id: $personaId
            persona_name: $personaName
            persona_hex: $personaHex
            persona_asset_path: $personaAssetPath
          }]
          on_conflict: {
            constraint: room_persona_claims_room_persona_key
            update_columns: []
          }
        ) {
          affected_rows
          returning {
            id
            room_id
            user_id
            persona_id
            persona_name
            persona_hex
            domain_id
            domain_name
            claimed_at
          }
        }
      }`,
      {
        roomId: room.id,
        userId,
        domainId: body.domain.id,
        domainName: body.domain.name,
        domainDescription: body.domain.description ?? null,
        domainIcon: body.domain.icon ?? null,
        personaId: body.persona.id,
        personaName: body.persona.name,
        personaHex: body.persona.color_code,
        personaAssetPath: body.persona.asset_path ?? null,
      }
    )

    const insertedClaim = claimResult.insert_room_persona_claims.returning[0]

    if (!insertedClaim) {
      const existing = await hasuraAdminRequest<{
        room_persona_claims: Array<{
          user_id: string
          persona_name: string
          domain_name: string
          user?: { name?: string | null }
        }>
      }>(
        `query ExistingPersonaClaim($roomId: uuid!, $personaId: String!) {
          room_persona_claims(
            where: {
              room_id: { _eq: $roomId }
              persona_id: { _eq: $personaId }
            }
            limit: 1
          ) {
            user_id
            persona_name
            domain_name
            user {
              name
            }
          }
        }`,
        {
          roomId: room.id,
          personaId: body.persona.id,
        }
      )

      const takenBy = existing.room_persona_claims[0]

      return Response.json(
        {
          won: false,
          error: 'Persona already claimed',
          takenBy: takenBy?.user?.name || 'Another player',
        },
        { status: 409 }
      )
    }

    const teamName = `${body.persona.name} — ${body.domain.name}`

    const teamResult = await hasuraAdminRequest<{
      insert_teams_one: { id: string } | null
    }>(
      `mutation CreatePersonaTeam(
        $name: String!
        $color: String!
        $userId: uuid!
        $roomId: uuid!
        $domainId: String!
        $domainName: String!
        $domainDescription: String
        $personaId: String!
        $personaName: String!
        $personaHex: String!
      ) {
        insert_teams_one(
          object: {
            name: $name
            color: $color
            created_by: $userId
            leader_id: $userId
            room_id: $roomId
            domain_id: $domainId
            domain_name: $domainName
            domain_description: $domainDescription
            persona_id: $personaId
            persona_name: $personaName
            persona_hex: $personaHex
          }
          on_conflict: {
            constraint: teams_room_id_persona_id_key
            update_columns: [
              name
              color
              created_by
              leader_id
              domain_id
              domain_name
              domain_description
              persona_name
              persona_hex
            ]
          }
        ) {
          id
        }
      }`,
      {
        name: teamName,
        color: body.persona.color_code,
        userId,
        roomId: room.id,
        domainId: body.domain.id,
        domainName: body.domain.name,
        domainDescription: body.domain.description ?? '',
        personaId: body.persona.id,
        personaName: body.persona.name,
        personaHex: body.persona.color_code,
      }
    )
    console.log('[Persona Claim Team Result]', {
      roomId: room.id,
      userId,
      personaId: body.persona.id,
      teamResult,
    })

    if (teamResult.insert_teams_one?.id) {
      await hasuraAdminRequest(
        `mutation AddPersonaTeamLeader($teamId: uuid!, $userId: uuid!) {
          insert_team_members_one(
            object: {
              team_id: $teamId
              user_id: $userId
              member_type: "LEADER"
            }
            on_conflict: {
              constraint: team_members_pkey
              update_columns: []
            }
          ) {
            id
          }
        }`,
        {
          teamId: teamResult.insert_teams_one.id,
          userId,
        }
      )
    }

    const countData = await hasuraAdminRequest<{
      room_persona_claims_aggregate: { aggregate: { count: number } }
    }>(
      `query CountRoomClaims($roomId: uuid!) {
        room_persona_claims_aggregate(where: { room_id: { _eq: $roomId } }) {
          aggregate {
            count
          }
        }
      }`,
      { roomId: room.id }
    )

    const claimCount = countData.room_persona_claims_aggregate.aggregate.count
    const gameEnded = claimCount >= 20

    const previousState = room.game_state?.state || {}


    await hasuraAdminRequest(
      `mutation SyncPersonaGameState($roomId: uuid!, $state: jsonb!, $status: String!) {
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
        }

        update_rooms_by_pk(
          pk_columns: { id: $roomId }
          _set: { status: $status }
        ) {
          id
          status
        }
      }`,
      {
        roomId: room.id,
        status: 'in_game',
        state: {
        ...previousState,
          personaFlow: {
            ...(previousState.personaFlow || {}),
            claimCount,
            totalPersonas: 20,
            ended: gameEnded,
            readyForBidding: gameEnded,
            lastClaim: insertedClaim,
          },
          logs: [
            `${body.persona.name} claimed by player ${userId.slice(0, 8)} in ${body.domain.name}`,
            ...(Array.isArray(previousState.logs) ? previousState.logs : []),
          ].slice(0, 50),
        },
      }
    )

    return Response.json({
      won: true,
      gameEnded,
      claimCount,
      claim: insertedClaim,
    })
  } catch (err: any) {
    console.error('Persona claim error:', err)
    return Response.json({ error: err.message || 'Failed to claim persona' }, { status: 500 })
  }
}
