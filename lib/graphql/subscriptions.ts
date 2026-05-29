import { gql } from '@apollo/client'

// Used in the lobby — fires whenever any player joins or leaves,
// or when the host changes room status (waiting → in_game)
export const LOBBY_SUBSCRIPTION = gql`
  subscription LobbyPlayers($code: String!) {
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
    }
  }
`

export const GAME_STATE_SUBSCRIPTION = gql`
  subscription GameStateSubscription($code: String!) {
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



export const CARD_GAME_SESSION_SUBSCRIPTION = gql`
subscription CardGameSessionSub($sessionId: uuid!) {
  room_card_game_sessions_by_pk(id: $sessionId) {
    id
    status
    selected_domain_id
    game_mode
    started_at
    room_card_game_personas(order_by: { persona: { title: asc } }) {
      id
      persona_id
      is_claimed
      claimed_by
      claimed_at
      persona {
        id
        title
        description
        image_url
        domain_id
      }
    }
  }
}
`


export const PLAYER_SLOTS_SUBSCRIPTION = gql`
subscription PlayerSlotsSub($sessionId: uuid!, $userId: uuid!, $personaId: uuid!) {
  room_card_game_player_slots(
    where: {
      session_id: { _eq: $sessionId }
      user_id: { _eq: $userId }
      persona_id: { _eq: $personaId }
    }
  ) {
    slot_type
    flow_card_id
    placed_at
    flow_card {
      id
      type
      title
      description
      sort_order
    }
  }
}
`




export const ALL_PLAYER_SLOTS_SUBSCRIPTION = gql`
subscription AllPlayerSlotsSub($sessionId: uuid!, $personaId: uuid!) {
  room_card_game_player_slots(
    where: {
      session_id: { _eq: $sessionId }
      persona_id: { _eq: $personaId }
    }
    order_by: { placed_at: asc }
  ) {
    user_id
    slot_type
    flow_card_id
    placed_at
  }
}
`
