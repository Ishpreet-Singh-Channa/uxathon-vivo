'use client'

import { ApolloProvider } from '@apollo/client/react'
import { makeApolloClient } from './apollo-client'
import { useMemo, useEffect } from 'react'

export function ApolloClientProvider({
  children,
  token,
}: {
  children: React.ReactNode
  token: string
}) {
  const client = useMemo(() => makeApolloClient(token), [token])

  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt-token', token)
    } else {
      localStorage.removeItem('jwt-token')
    }
  }, [token])

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
