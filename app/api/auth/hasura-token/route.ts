import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateHasuraToken } from '@/lib/hasura-token'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = generateHasuraToken(session.user.id)
  return Response.json({ token })
}
