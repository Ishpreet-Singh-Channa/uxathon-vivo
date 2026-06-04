import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

type BidBody = {
  code: string
  amount: number
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: BidBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  if (!body.code) {
    return Response.json({ error: 'Room code required' }, { status: 400 })
  }

  const bidAmount = Number(body.amount)

  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return Response.json({ error: 'Invalid bid amount' }, { status: 400 })
  }

  const code = body.code.toUpperCase().trim()

  try {
    const roomData = await hasuraAdminRequest<{
      rooms: Array<{
        id: string
        status: string
        game_id: string
        game_state?: {
          state: any
        } | null
      }>
    }>(
      `query GetBiddingBidRoom($code: String!) {
        rooms(where: { code: { _eq: $code } }, limit: 1) {
          id
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

    if (room.game_id !== 'bidding') {
      return Response.json({ error: 'Bidding game is not active in this room' }, { status: 400 })
    }

    const state = room.game_state?.state || {}
    const bidding = state.bidding

    if (!bidding) {
      return Response.json({ error: 'Bidding state not initialized' }, { status: 400 })
    }

    if (bidding.phase !== 'auction' || !bidding.currentNominee) {
      return Response.json({ error: 'No active auction right now' }, { status: 400 })
    }

    const leader = bidding.leaders?.[userId]

    if (!leader) {
      return Response.json({ error: 'Only leaders can place bids' }, { status: 403 })
    }

    if (!leader.teamId) {
    return Response.json(
      {
        error: 'Leader teamId missing in bidding state. Restart bidding after fixing start route.',
        debug: {
          leader,
          leaderUserId: userId,
        },
      },
      { status: 400 }
    )
  }

    const currentAmount = Number(bidding.currentBid?.amount || 0)
    const minIncrement = Number(bidding.minIncrement || 1)

    if (bidAmount < currentAmount + minIncrement) {
      return Response.json(
        { error: `Bid must be at least ${currentAmount + minIncrement}` },
        { status: 400 }
      )
    }

    if (bidAmount > Number(leader.tokensLeft || 0)) {
      return Response.json(
        { error: 'You do not have enough tokens for this bid' },
        { status: 400 }
      )
    }

    const updatedBid = {
      amount: bidAmount,
      leaderUserId: userId,
      leaderName: leader.name,
      teamId: leader.teamId,
      teamName: leader.teamName,
      placedAt: new Date().toISOString(),
    }

    const nomineeName = bidding.currentNominee?.name || 'Current member'

    const updatedBidding = {
      ...bidding,
      currentBid: updatedBid,
      logs: [
        `${leader.name} bid ${bidAmount.toLocaleString()} on ${nomineeName}.`,
        ...(bidding.logs || []),
      ].slice(0, 50),
    }

    const updatedState = {
      ...state,
      bidding: updatedBidding,
    }

    await hasuraAdminRequest(
      `mutation PlaceBiddingBid($roomId: uuid!, $state: jsonb!) {
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
      }
    )

    return Response.json({
      success: true,
      bid: updatedBid,
      bidding: updatedBidding,
    })
  } catch (err: any) {
    console.error('Place bid error:', err)
    return Response.json(
      { error: err.message || 'Failed to place bid' },
      { status: 500 }
    )
  }
}
