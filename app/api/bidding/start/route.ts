import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

const DEFAULT_STARTING_TOKENS = 1_000_000
const DEFAULT_MIN_INCREMENT = 50_000

type StartBiddingBody = {
  code: string
  startingTokens?: number
  minIncrement?: number
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: StartBiddingBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!body.code) {
    return Response.json({ error: 'Room code required' }, { status: 400 })
  }

  const code = body.code.toUpperCase().trim()
  const startingTokens = Number(body.startingTokens || DEFAULT_STARTING_TOKENS)
  const minIncrement = Number(body.minIncrement || DEFAULT_MIN_INCREMENT)

  if (!Number.isFinite(startingTokens) || startingTokens <= 0) {
    return Response.json({ error: 'Invalid starting token amount' }, { status: 400 })
  }

  if (!Number.isFinite(minIncrement) || minIncrement <= 0) {
    return Response.json({ error: 'Invalid minimum increment amount' }, { status: 400 })
  }

  try {
    const roomData = await hasuraAdminRequest<{
    rooms: Array<{
      id: string
      code: string
      status: string
      game_id: string
      host_user_id: string
      room_players: Array<{
        user_id: string
        user: {
          id: string
          name: string | null
          profile_picture: string | null
        } | null
      }>
       room_persona_claims: Array<{
        user_id: string
        domain_id: string
        domain_name: string
        domain_description: string | null
        persona_id: string
        persona_name: string
        persona_hex: string
      }>
      game_state?: {
        state: any
      } | null
    }>
  }>(
    `query GetBiddingStartRoom($code: String!) {
      rooms(where: { code: { _eq: $code } }, limit: 1) {
        id
        code
        status
        game_id
        host_user_id

        room_players(order_by: { joined_at: asc }) {
          user_id
          user {
            id
            name
            profile_picture
          }
        }

        room_persona_claims(order_by: { claimed_at: asc }) {
          user_id
          domain_id
          domain_name
          domain_description
          persona_id
          persona_name
          persona_hex
        }

        game_state {
          state
        }
      }
    }`,
    { code }
  )

  const room = roomData.rooms?.[0]

  if (!room) {
    return Response.json({ error: 'Room not found' }, { status: 404 })
  }

  if (room.host_user_id !== userId) {
    return Response.json({ error: 'Only the host can start bidding' }, { status: 403 })
  }

  if (room.status !== 'finished' && room.status !== 'in_game') {
    return Response.json(
      { error: 'Persona Flow must be completed in this room before bidding can start.' },
      { status: 400 }
    )
  }



  // replacing teamsData block with---------
  // const teamsData = await hasuraAdminRequest<{
  //   teams: Array<{
  //     id: string
  //     name: string
  //     color: string | null
  //     leader_id: string | null
  //     persona_id: string | null
  //     persona_name: string | null
  //     persona_hex: string | null
  //   }>
  // }>(
  //   `query GetBiddingRoomTeams($roomId: uuid!) {
  //     teams(where: { room_id: { _eq: $roomId } }) {
  //       id
  //       name
  //       color
  //       leader_id
  //       persona_id
  //       persona_name
  //       persona_hex
  //     }
  //   }`,
  //   { roomId: room.id }
  // )

  // const teamIds = teamsData.teams.map((team) => team.id)

  // if (teamIds.length === 0) {
  //   return Response.json(
  //     {
  //       error: 'No teams found in this room. Run Persona Flow in this same room first.',
  //       debug: {
  //         roomId: room.id,
  //         roomCode: room.code,
  //         roomPlayerCount: room.room_players.length,
  //       },
  //     },
  //     { status: 400 }
  //   )
  // }
  // replacing teamsData block with---------
  // this------------------------:

  async function fetchRoomTeams(roomId: string) {
    return hasuraAdminRequest<{
      teams: Array<{
        id: string
        name: string
        color: string | null
        leader_id: string | null
        persona_id: string | null
        persona_name: string | null
        persona_hex: string | null
      }>
    }>(
      `query GetBiddingRoomTeams($roomId: uuid!) {
        teams(where: { room_id: { _eq: $roomId } }) {
          id
          name
          color
          leader_id
          persona_id
          persona_name
          persona_hex
        }
      }`,
      { roomId }
    )
  }

  let teamsData = await fetchRoomTeams(room.id)

  if (teamsData.teams.length === 0 && room.room_persona_claims.length > 0) {
    const teamObjects = room.room_persona_claims.map((claim) => ({
      name: `${claim.persona_name} — ${claim.domain_name}`,
      color: claim.persona_hex,
      created_by: claim.user_id,
      leader_id: claim.user_id,
      room_id: room.id,
      domain_id: claim.domain_id,
      domain_name: claim.domain_name,
      domain_description: claim.domain_description || '',
      persona_id: claim.persona_id,
      persona_name: claim.persona_name,
      persona_hex: claim.persona_hex,
    }))

    await hasuraAdminRequest(
      `mutation BackfillPersonaTeams($objects: [teams_insert_input!]!) {
        insert_teams(
          objects: $objects
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
          affected_rows
        }
      }`,
      { objects: teamObjects }
    )

    teamsData = await fetchRoomTeams(room.id)
  }

  const teamIds = teamsData.teams.map((team) => team.id)


  const leaderMemberObjects = teamsData.teams
    .filter((team) => team.leader_id)
    .map((team) => ({
      team_id: team.id,
      user_id: team.leader_id,
      member_type: 'LEADER',
    }))

  if (leaderMemberObjects.length > 0) {
    await hasuraAdminRequest(
      `mutation BackfillPersonaTeamLeaders($objects: [team_members_insert_input!]!) {
        insert_team_members(
          objects: $objects
          on_conflict: {
            constraint: team_members_pkey
            update_columns: []
          }
        ) {
          affected_rows
        }
      }`,
      { objects: leaderMemberObjects }
    )
  }

  if (teamIds.length === 0) {
    return Response.json(
      {
        error: 'No teams found in this room. Persona claims exist, but team backfill failed.',
        debug: {
          roomId: room.id,
          roomCode: room.code,
          roomPlayerCount: room.room_players.length,
          claimsFound: room.room_persona_claims.length,
          claims: room.room_persona_claims.map((claim) => ({
            userId: claim.user_id,
            personaId: claim.persona_id,
            personaName: claim.persona_name,
            domainName: claim.domain_name,
          })),
        },
      },
      { status: 400 }
    )
  }
  // this------------------------:

  const teamMembersData = await hasuraAdminRequest<{
    team_members: Array<{
      team_id: string
      user_id: string
      member_type: string
      user: {
        id: string
        name: string | null
        profile_picture: string | null
      } | null
    }>
  }>(
    `query GetBiddingTeamMembers($teamIds: [uuid!]!) {
      team_members(where: { team_id: { _in: $teamIds } }) {
        team_id
        user_id
        member_type
        user {
          id
          name
          profile_picture
        }
      }
    }`,
    { teamIds }
  )

  // const leaderMembers = teamMembersData.team_members.filter(
  //   (member) => String(member.member_type).toUpperCase() === 'LEADER'
  // )

  // if (leaderMembers.length === 0) {
  //   return Response.json(
  //     {
  //       error: 'No leaders found in this room. Persona Flow must create team_members with member_type LEADER.',
  //       debug: {
  //         roomId: room.id,
  //         roomCode: room.code,
  //         teamsFound: teamsData.teams.length,
  //         teamMembersFound: teamMembersData.team_members.length,
  //         memberTypesFound: teamMembersData.team_members.map((member) => ({
  //           userId: member.user_id,
  //           teamId: member.team_id,
  //           memberType: member.member_type,
  //         })),
  //       },
  //     },
  //     { status: 400 }
  //   )
  // }


  const explicitLeaderMembers = teamMembersData.team_members.filter(
    (member) => String(member.member_type).toUpperCase() === 'LEADER'
  )

  const teamById = new Map(teamsData.teams.map((team) => [team.id, team]))

  const playersById = new Map(
    room.room_players.map((player) => [player.user_id, player])
  )

  // Build leaders from teams.leader_id first, then fallback to team_members.
  const leaderRowsByUserId = new Map<
    string,
    {
      user_id: string
      team_id: string
      user: {
        id: string
        name: string | null
        profile_picture: string | null
      } | null
    }
  >()

  for (const team of teamsData.teams) {
    if (!team.leader_id) continue

    const player = playersById.get(team.leader_id)

    leaderRowsByUserId.set(team.leader_id, {
      user_id: team.leader_id,
      team_id: team.id,
      user: player?.user || null,
    })
  }

  for (const member of explicitLeaderMembers) {
    if (!member.user_id) continue

    leaderRowsByUserId.set(member.user_id, {
      user_id: member.user_id,
      team_id: member.team_id,
      user: member.user,
    })
  }

  const leaderMembers = Array.from(leaderRowsByUserId.values())

  if (leaderMembers.length === 0) {
    return Response.json(
      {
        error: 'No leaders found in this room. Teams exist, but none have leader_id or team_members LEADER rows.',
        debug: {
          roomId: room.id,
          roomCode: room.code,
          teamsFound: teamsData.teams.length,
          teams: teamsData.teams.map((team) => ({
            teamId: team.id,
            name: team.name,
            leaderId: team.leader_id,
            personaId: team.persona_id,
            personaName: team.persona_name,
          })),
          teamMembersFound: teamMembersData.team_members.length,
          memberTypesFound: teamMembersData.team_members.map((member) => ({
            userId: member.user_id,
            teamId: member.team_id,
            memberType: member.member_type,
          })),
        },
      },
      { status: 400 }
    )
  }


  
  // const teamById = new Map(teamsData.teams.map((team) => [team.id, team]))

  // const playersById = new Map(
  //   room.room_players.map((player) => [player.user_id, player])
  // )

  const leaderIds = new Set(leaderMembers.map((member) => member.user_id))

  const leaders = Object.fromEntries(
    leaderMembers.map((member) => {
      const team = teamById.get(member.team_id)
      const player = playersById.get(member.user_id)

      return [
        member.user_id,
        {
          userId: member.user_id,
          name: member.user?.name || player?.user?.name || 'Unnamed Leader',
          profilePicture:
            member.user?.profile_picture || player?.user?.profile_picture || null,
          teamId: member.team_id,
          teamName: team?.name || 'Unnamed Team',
          teamColor: team?.color || null,
          personaId: team?.persona_id || null,
          personaName: team?.persona_name || null,
          personaHex: team?.persona_hex || null,
          tokensLeft: startingTokens,
          spent: 0,
          membersWon: [],
        },
      ]
    })
  )

  

    // const entries = room.room_players
    //   .filter((player) => !leaderIds.has(player.user_id))
    //   .map((player) => ({
    //     userId: player.user_id,
    //     name: player.user?.name || 'Unnamed Member',
    //     profilePicture: player.user?.profile_picture || null,

    //     // Keep these fields ready for later.
    //     // Once your users/profile table has these columns, we can fetch real values.
    //     skills: [],
    //     affiliation: null,

    //     sold: false,
    //     soldToLeaderId: null,
    //     soldToTeamId: null,
    //     soldAmount: null,
    //   }))


    // const entries = room.room_players
    // .filter((player) => !leaderIds.has(player.user_id))
    // .map((player) => ({
    //   userId: player.user_id,
    //   name: player.user?.name || 'Unnamed Member',
    //   profilePicture: player.user?.profile_picture || null,
    //   skills: [],
    //   affiliation: null,
    //   sold: false,
    //   soldToLeaderId: null,
    //   soldToTeamId: null,
    //   soldAmount: null,
    // }))

    const excludedUserIds = new Set<string>([
      room.host_user_id,
      ...Array.from(leaderIds),
    ])

    const entries = room.room_players
      .filter((player) => !excludedUserIds.has(player.user_id))
      .map((player) => ({
        userId: player.user_id,
        name: player.user?.name || 'Unnamed Member',
        profilePicture: player.user?.profile_picture || null,
        skills: [],
        affiliation: null,
        sold: false,
        soldToLeaderId: null,
        soldToTeamId: null,
        soldAmount: null,
      }))

    if (entries.length === 0) {
      return Response.json(
        {
          error: 'No eligible members available for bidding. Host and leaders are excluded from the bidding pool.',
          debug: {
            roomPlayerCount: room.room_players.length,
            hostUserId: room.host_user_id,
            leaderIds: Array.from(leaderIds),
          },
        },
        { status: 400 }
      )
    }

    const previousState = room.game_state?.state || {}

    const biddingState = {
      phase: 'waiting',
      startingTokens,
      minIncrement,
      leaders,
      entries,
      currentNominee: null,
      currentBid: null,
      sold: [],
      unsold: [],
      logs: [
        `Bidding initialized with ${leaderMembers.length} leaders and ${entries.length} entries.`,
      ],
      startedAt: new Date().toISOString(),
      endedAt: null,
    }

    const newState = {
      ...previousState,
      bidding: biddingState,
    }

    await hasuraAdminRequest(
      `mutation StartBiddingGame($roomId: uuid!, $state: jsonb!) {
        update_rooms_by_pk(
          pk_columns: { id: $roomId }
          _set: {
            status: "in_game"
            game_id: "bidding"
          }
        ) {
          id
          status
          game_id
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
        state: newState,
      }
    )

    return Response.json({
      success: true,
      bidding: biddingState,
    })
  } catch (err: any) {
    console.error('Start bidding error:', err)
    return Response.json(
      { error: err.message || 'Failed to start bidding' },
      { status: 500 }
    )
  }
}

