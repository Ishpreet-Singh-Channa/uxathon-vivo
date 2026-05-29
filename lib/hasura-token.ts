import jwt from 'jsonwebtoken'

export function generateHasuraToken(userId: string): string {
  const secret = process.env.HASURA_JWT_SECRET || 'local-hasura-secret-key-32-chars-long-for-testing'
  return jwt.sign(
    {
      sub: userId,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['user'],
        'x-hasura-default-role': 'user',
        'x-hasura-user-id': userId,
      },
    },
    secret,
    { expiresIn: '1h' }
  )
}
