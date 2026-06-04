// const ENDPOINT = 'https://hasura.ubuntudevt65535.dpdns.org/v1/graphql'
// // process.env.HASURA_GRAPHQL_ENDPOINT 
// // || 'http://localhost:8100/v1/graphql'
// const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'secret'

// export async function hasuraAdminRequest<T>(
//   query: string,
//   variables?: Record<string, unknown>
// ): Promise<T> {
//   if (!ENDPOINT) {
//     throw new Error('HASURA_GRAPHQL_ENDPOINT is not configured.')
//   }

//   // Normal database operation
//   const res = await fetch(ENDPOINT, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'x-hasura-admin-secret': ADMIN_SECRET,
//     },
//     body: JSON.stringify({ query, variables }),
//   })

//   const json = await res.json()

//   if (json.errors) {
//     console.error('Hasura error:', json.errors)
//     throw new Error(json.errors[0].message)
//   }

//   return json.data
// }


const HASURA_ENDPOINT = 'https://hasura.ubuntudevt65535.dpdns.org/v1/graphql'
const HASURA_ADMIN_SECRET = 'secret'

export async function hasuraAdminRequest<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  if (!HASURA_ENDPOINT) {
    throw new Error('Missing HASURA_GRAPHQL_ENDPOINT environment variable')
  }

  if (!HASURA_ADMIN_SECRET) {
    throw new Error('Missing HASURA_ADMIN_SECRET environment variable')
  }

  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  })

  const contentType = res.headers.get('content-type') || ''
  const rawText = await res.text()

  let json: any = null

  if (contentType.includes('application/json')) {
    try {
      json = JSON.parse(rawText)
    } catch (err) {
      console.error('[Hasura JSON parse failed]', {
        status: res.status,
        contentType,
        body: rawText.slice(0, 500),
      })
      throw new Error('Hasura returned invalid JSON')
    }
  } else {
    console.error('[Hasura returned non-JSON response]', {
      status: res.status,
      statusText: res.statusText,
      contentType,
      endpoint: HASURA_ENDPOINT,
      body: rawText.slice(0, 500),
    })

    throw new Error(
      `Hasura returned non-JSON response. Status: ${res.status}. Check HASURA_GRAPHQL_ENDPOINT.`
    )
  }

  if (!res.ok) {
    console.error('[Hasura HTTP error]', json)
    throw new Error(json?.error || json?.message || `Hasura HTTP ${res.status}`)
  }

  if (json.errors) {
    console.error('Hasura error:', json.errors)
    throw new Error(json.errors[0].message)
  }

  return json.data
}
