import { getUserIdFromRequest } from '@/lib/multiplayer/jwt'
import { hasuraAdminRequest } from '@/lib/hasura'

type DrawBody = {
  code: string
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: DrawBody

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
      `query GetBiddingDrawRoom($code: String!) {
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
      return Response.json({ error: 'Only the host can draw a member' }, { status: 403 })
    }

    if (room.game_id !== 'bidding') {
      return Response.json({ error: 'Bidding game is not active in this room' }, { status: 400 })
    }

    const state = room.game_state?.state || {}
    const bidding = state.bidding

    if (!bidding) {
      return Response.json({ error: 'Bidding state not initialized' }, { status: 400 })
    }

    if (bidding.phase === 'auction' && bidding.currentNominee) {
      return Response.json(
        { error: 'An auction is already active. Close it before drawing another member.' },
        { status: 400 }
      )
    }

    // const availableEntries = Array.isArray(bidding.entries)
    //   ? bidding.entries.filter((entry: any) => !entry.sold)
    //   : []
    const leaderIds = new Set(Object.keys(bidding.leaders || {}))

    const availableEntries = Array.isArray(bidding.entries)
      ? bidding.entries.filter((entry: any) => {
          return (
            !entry.sold &&
            entry.userId !== room.host_user_id &&
            !leaderIds.has(entry.userId)
          )
        })
      : []

    if (availableEntries.length === 0) {
      const finishedBidding = {
        ...bidding,
        phase: 'finished',
        currentNominee: null,
        currentBid: null,
        endedAt: new Date().toISOString(),
        logs: [
          'Bidding finished. No entries left.',
          ...(bidding.logs || []),
        ].slice(0, 50),
      }

      const finishedState = {
        ...state,
        bidding: finishedBidding,
      }

      await hasuraAdminRequest(
        `mutation FinishBiddingNoEntries($roomId: uuid!, $state: jsonb!) {
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
          }
        }`,
        {
          roomId: room.id,
          state: finishedState,
        }
      )

      return Response.json({
        success: true,
        finished: true,
        bidding: finishedBidding,
      })
    }

    const randomIndex = Math.floor(Math.random() * availableEntries.length)
    const nominee = availableEntries[randomIndex]

    const updatedBidding = {
      ...bidding,
      phase: 'auction',
      currentNominee: nominee,
      currentBid: {
        amount: 0,
        leaderUserId: null,
        leaderName: null,
        teamId: null,
        teamName: null,
        placedAt: null,
      },
      logs: [
        `${nominee.name} is now open for bidding.`,
        ...(bidding.logs || []),
      ].slice(0, 50),
    }

    const updatedState = {
      ...state,
      bidding: updatedBidding,
    }

    await hasuraAdminRequest(
      `mutation DrawBiddingMember($roomId: uuid!, $state: jsonb!) {
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
      nominee,
      bidding: updatedBidding,
    })
  } catch (err: any) {
    console.error('Draw bidding member error:', err)
    return Response.json(
      { error: err.message || 'Failed to draw bidding member' },
      { status: 500 }
    )
  }
}
