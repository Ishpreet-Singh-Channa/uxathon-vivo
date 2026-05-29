import { gql } from '@apollo/client';

export const WATCH_TEAMS = gql`
  subscription WatchTeams {
    teams(where: { leader_id: { _is_null: false } }) {
      id
      name
      color
      leader_id
      user {       # <--- Using the relation from your image!
        name
      }
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($name: String!, $color: String!, $userId: uuid!) {
    insert_teams_one(
      object: {
        name: $name,
        color: $color,
        created_by: $userId
      }
    ) {
      id
      color
      created_by
    }
  }
`;


export const ADD_TEAM_MEMBER = gql`
  mutation AddTeamMember($teamId: uuid!, $userId: uuid!, $memberType: String!) {
    insert_team_members_one(
      object: {
        team_id: $teamId,
        user_id: $userId,
        member_type: $memberType
      }
    ) {
      id
      team_id
      user_id
      member_type
    }
  }
`;

export const GET_USER_CLAIM = gql`
  query GetUserClaim($userId: String!) {
    teams(where: { leader_id: { _eq: $userId } }) {
      id
      name
    }
  }
`;
