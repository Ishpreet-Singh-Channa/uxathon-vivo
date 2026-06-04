export interface MultiplayerPlayer {
  joined_at: string;
  user: {
    id: string;
    name: string;
    profile_picture: string;
  };
}

export interface MultiplayerRoom {
  id: string;
  code: string;
  host_user_id: string;
  status: 'waiting' | 'in_game' | 'finished';
  game_id: string;
  max_players: number | null;
  room_players: MultiplayerPlayer[];
  room_persona_claims?: RoomPersonaClaim[];
  game_state?: {
    state: any;
  };
}


export interface RoomPersonaClaim {
  id: string;
  user_id: string;
  domain_id: string;
  domain_name: string;
  domain_description?: string | null;
  domain_icon?: string | null;
  persona_id: string;
  persona_name: string;
  persona_hex: string;
  persona_asset_path?: string | null;
  claimed_at: string;
  user?: {
    id: string;
    name: string | null;
    profile_picture: string | null;
  };
}

