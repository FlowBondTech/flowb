'use client'

import {
  ApolloClient,
  ApolloProvider as ApolloProviderBase,
  InMemoryCache,
  createHttpLink,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import type { ReactNode } from 'react'

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL || 'https://danz-backend.fly.dev/graphql',
})

// Add auth token to requests if available
const authLink = setContext((_, { headers }) => {
  // Get token from local storage or context
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('danz_auth_token')
    : null

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          events: {
            merge(existing = [], incoming) {
              return incoming
            },
          },
          myProfile: {
            merge(existing, incoming) {
              return incoming
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})

interface ApolloProviderProps {
  children: ReactNode
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return (
    <ApolloProviderBase client={client}>
      {children}
    </ApolloProviderBase>
  )
}
