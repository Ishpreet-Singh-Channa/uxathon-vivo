import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

export function makeApolloClient(token: string) {
  const httpUri = process.env.NEXT_PUBLIC_HASURA_HTTP || 'http://localhost:8080/v1/graphql'
  const wsUri = process.env.NEXT_PUBLIC_HASURA_WS || 'ws://localhost:8080/v1/graphql'

  // Server-side / static export safe check
  const isServer = typeof window === 'undefined'

  const httpLink = new HttpLink({
    uri: httpUri,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  // Only initialize WebSocket link on the client
  let splitLink;
  
  if (!isServer) {
    const wsLink = new GraphQLWsLink(
      createClient({
        url: wsUri,
        connectionParams: {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        },
      })
    )

    // Subscriptions go over WS, everything else over HTTP
    splitLink = split(
      ({ query }) => {
        const def = getMainDefinition(query)
        return (
          def.kind === 'OperationDefinition' &&
          def.operation === 'subscription'
        )
      },
      wsLink,
      httpLink
    )
  } else {
    splitLink = httpLink
  }

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  })
}
