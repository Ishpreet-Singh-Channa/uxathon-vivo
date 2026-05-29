import jwt from 'jsonwebtoken'

export function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.decode(token) as any
    const claims = decoded?.['https://hasura.io/jwt/claims']
    return claims?.['x-hasura-user-id'] || decoded?.sub || null
  } catch (err) {
    console.error('[JWT Decode Error]:', err)
    return null
  }
}
