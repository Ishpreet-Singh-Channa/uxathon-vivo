import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

type CloseBody = {
  code: string
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CloseBody

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
    const roomData = await hasuraAdminRequest<{
      rooms: Array<{
        id: string
        host_user_id: string
        status: string
        game_id: string
        game_state?: {
          state: any
        } | null
      }>
    }>(
      `query GetBiddingCloseRoom($code: String!) {
        rooms(where: { code: { _eq: $code } }, limit: 1) {
          id
          host_user_id
          status
          game_id
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
      return Response.json({ error: 'Only the host can close bidding' }, { status: 403 })
    }

    if (room.game_id !== 'bidding') {
      return Response.json({ error: 'Bidding game is not active in this room' }, { status: 400 })
    }

    const state = room.game_state?.state || {}
    const bidding = state.bidding

    if (!bidding) {
      return Response.json({ error: 'Bidding state not initialized' }, { status: 400 })
    }

    if (bidding.phase !== 'auction' || !bidding.currentNominee) {
      return Response.json({ error: 'No active auction to close' }, { status: 400 })
    }

    // const currentBid = bidding.currentBid
    // const nominee = bidding.currentNominee

    // if (!currentBid?.leaderUserId || !currentBid?.teamId || Number(currentBid.amount || 0) <= 0) {
    //   return Response.json(
    //     { error: 'Cannot close auction because no valid bid has been placed' },
    //     { status: 400 }
    //   )
    // }

    // const leader = bidding.leaders?.[currentBid.leaderUserId]

    const currentBid = bidding.currentBid
    const nominee = bidding.currentNominee

    if (!currentBid?.leaderUserId || Number(currentBid.amount || 0) <= 0) {
      return Response.json(
        {
          error: 'Cannot close auction because no valid bid has been placed',
          debug: { currentBid },
        },
        { status: 400 }
      )
    }

    const leader = bidding.leaders?.[currentBid.leaderUserId]

    if (!leader) {
      return Response.json(
        {
          error: 'Winning leader not found in bidding state',
          debug: {
            currentBid,
            availableLeaderIds: Object.keys(bidding.leaders || {}),
          },
        },
        { status: 400 }
      )
    }

    const winningTeamId = currentBid.teamId || leader.teamId
    const winningTeamName = currentBid.teamName || leader.teamName

    if (!winningTeamId) {
      return Response.json(
        {
          error: 'Winning teamId missing. Restart bidding after fixing leader state.',
          debug: {
            currentBid,
            leader,
          },
        },
        { status: 400 }
      )
    }

    if (!leader) {
      return Response.json({ error: 'Winning leader not found in bidding state' }, { status: 400 })
    }

    const bidAmount = Number(currentBid.amount)

    if (bidAmount > Number(leader.tokensLeft || 0)) {
      return Response.json(
        { error: 'Winning leader no longer has enough tokens' },
        { status: 400 }
      )
    }

    const updatedLeader = {
      ...leader,
      tokensLeft: Number(leader.tokensLeft || 0) - bidAmount,
      spent: Number(leader.spent || 0) + bidAmount,
      membersWon: [
        ...(leader.membersWon || []),
        {
          userId: nominee.userId,
          name: nominee.name,
          amount: bidAmount,
          wonAt: new Date().toISOString(),
        },
      ],
    }

    const updatedEntries = Array.isArray(bidding.entries)
      ? bidding.entries.map((entry: any) => {
          if (entry.userId !== nominee.userId) return entry

          return {
            ...entry,
            sold: true,
            soldToLeaderId: currentBid.leaderUserId,
            // soldToTeamId: currentBid.teamId,
            soldToTeamId: winningTeamId,
            soldAmount: bidAmount,
          }
        })
      : []

    const soldRecord = {
      userId: nominee.userId,
      name: nominee.name,
      profilePicture: nominee.profilePicture || null,
      teamId: winningTeamId,
      teamName: currentBid.teamName,
      leaderUserId: currentBid.leaderUserId,
      leaderName: currentBid.leaderName,
      amount: bidAmount,
      soldAt: new Date().toISOString(),
    }

    const remainingEntries = updatedEntries.filter((entry: any) => !entry.sold)

    const updatedBidding = {
      ...bidding,
      phase: remainingEntries.length === 0 ? 'finished' : 'waiting',
      leaders: {
        ...bidding.leaders,
        [currentBid.leaderUserId]: updatedLeader,
      },
      entries: updatedEntries,
      currentNominee: null,
      currentBid: null,
      sold: [soldRecord, ...(bidding.sold || [])],
      endedAt: remainingEntries.length === 0 ? new Date().toISOString() : bidding.endedAt || null,
      logs: [
        `${nominee.name} sold to ${currentBid.teamName} for ${bidAmount.toLocaleString()} tokens.`,
        ...(bidding.logs || []),
      ].slice(0, 50),
    }

    const updatedState = {
      ...state,
      bidding: updatedBidding,
    }

    await hasuraAdminRequest(
      `mutation CloseBiddingAuction(
        $roomId: uuid!
        $state: jsonb!
        $teamId: uuid!
        $memberUserId: uuid!
        $roomStatus: String!
      ) {
        insert_team_members_one(
          object: {
            team_id: $teamId
            user_id: $memberUserId
            member_type: "MEMBER"
          }
          on_conflict: {
            constraint: team_members_team_id_user_id_key
            update_columns: [member_type]
          }
        ) {
          id
        }

        update_rooms_by_pk(
          pk_columns: { id: $roomId }
          _set: { status: $roomStatus }
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
        state: updatedState,
        // teamId: currentBid.teamId,
        teamId: winningTeamId,
        memberUserId: nominee.userId,
        roomStatus: remainingEntries.length === 0 ? 'finished' : 'in_game',
      }
    )

    return Response.json({
      success: true,
      sold: soldRecord,
      finished: remainingEntries.length === 0,
      bidding: updatedBidding,
    })
  } catch (err: any) {
    console.error('Close bidding error:', err)
    return Response.json(
      { error: err.message || 'Failed to close bidding auction' },
      { status: 500 }
    )
  }
}
