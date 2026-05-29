# Host: create initialize the card game session for a room
export const CREATE_CARD_GAME_SESSION = gql`
mutation CreateCardGameSession($roomId: uuid!, $domainId: uuid!, $startedBy: uuid!, $personaIds: [room_card_game_personas_insert_input!]!) {
  insert_room_card_game_sessions_one(
    object: {
      room_id: $roomId
      selected_domain_id: $domainId
      status: "active"
      started_by: $startedBy
      started_at: "now()"
      room_card_game_personas: { data: $personaIds }
    }
    on_conflict: { constraint: room_card_game_sessions_room_id_key, update_columns: [selected_domain_id, status, started_at, started_by] }
  ) {
    id
    status
  }
}
`
# Player: place a card into a slot
export const UPSERT_PLAYER_SLOT = gql`mutation UpsertPlayerSlot($sessionId: uuid!, $userId: uuid!, $personaId: uuid!, $slotType: card_flow_type!, $flowCardId: uuid!) {
  insert_room_card_game_player_slots_one(
    object: {
      session_id: $sessionId
      user_id: $userId
      persona_id: $personaId
      slot_type: $slotType
      flow_card_id: $flowCardId
      placed_at: "now()"
    }
    on_conflict: {
      constraint: room_card_game_player_slots_session_id_user_id_persona_id_slot_type_key
      update_columns: [flow_card_id, placed_at]
    }
  ) { id }
}
`
# Player: claim a persona (atomic — only succeeds if not already claimed)
export const CLAIM_PERSONA = gql`mutation ClaimPersona($sessionPersonaId: uuid!, $userId: uuid!) {
  update_room_card_game_personas(
    where: {
      id: { _eq: $sessionPersonaId }
      is_claimed: { _eq: false }
    }
    _set: {
      is_claimed: true
      claimed_by: $userId
      claimed_at: "now()"
    }
  ) {
    affected_rows
    returning { id persona_id claimed_by is_claimed }
  }
}
`
