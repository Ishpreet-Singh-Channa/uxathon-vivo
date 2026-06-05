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
