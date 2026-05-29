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
  max_players: number;
  room_players: MultiplayerPlayer[];
  game_state?: {
    state: any;
  };
}
