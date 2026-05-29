import { gql } from '@apollo/client'

export const GET_ROOM_BY_CODE = gql`
  query GetRoomByCode($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      host_user_id
    }
  }
`

export const GET_GAME_STATE = gql`
  query GetGameState($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
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
      game_state {
        room_id
        state
        updated_at
      }
    }
  }
`
