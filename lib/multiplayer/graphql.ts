import { gql } from '@apollo/client'

export const MULTIPLAYER_LOBBY_SUBSCRIPTION = gql`
  subscription LobbyPlayers($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
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
    }
  }
`

export const MULTIPLAYER_GAME_STATE_SUBSCRIPTION = gql`
  subscription GameStateSubscription($code: String!) {
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
      game_state {
        room_id
        state
        updated_at
      }
    }
  }
`

export const GET_ROOM_BY_CODE = gql`
  query GetRoomByCode($code: String!) {
    rooms(where: { code: { _eq: $code } }) {
      id
      status
      game_id
      host_user_id
    }
  }
`
