const ENDPOINT = 'https://hasura.ubuntudevt65535.dpdns.org/v1/graphql'
// process.env.HASURA_GRAPHQL_ENDPOINT 
// || 'http://localhost:8100/v1/graphql'
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'secret'

export async function hasuraAdminRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!ENDPOINT) {
    throw new Error('HASURA_GRAPHQL_ENDPOINT is not configured.')
  }

  // Normal database operation
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()

  if (json.errors) {
    console.error('Hasura error:', json.errors)
    throw new Error(json.errors[0].message)
  }

  return json.data
}
