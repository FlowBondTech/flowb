'use client'

import {
  ApolloClient,
  ApolloLink,
  ApolloProvider as ApolloProviderBase,
  InMemoryCache,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createHttpLink } from '@apollo/client/link/http'
import { supabase } from '@/src/lib/supabase'
import { useSupabaseAuth } from '@/src/providers/SupabaseAuthProvider'
import type React from 'react'
import { useEffect, useMemo, useRef } from 'react'

// Cache configuration with proper field policies
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        me: {
          merge(_existing, incoming) {
            return incoming
          },
        },
        events: {
          keyArgs: ['filter', 'sortBy', 'organizerId'],
          merge(existing, incoming, { args }) {
            if (!existing || args?.pagination?.offset === 0) {
              return incoming
            }

            if (args?.pagination?.offset > 0) {
              const existingEventsMap = new Map()

              for (const event of existing.events || []) {
                existingEventsMap.set(event.id || event.__ref, event)
              }

              for (const event of incoming.events || []) {
                const eventId = event.id || event.__ref
                if (!existingEventsMap.has(eventId)) {
                  existingEventsMap.set(eventId, event)
                }
              }

              return {
                ...incoming,
                events: Array.from(existingEventsMap.values()),
              }
            }

            return incoming
          },
        },
        users: {
          keyArgs: ['filter'],
          merge(existing, incoming, { args }) {
            if (!existing) return incoming
            if (args?.pagination?.offset === 0) return incoming

            return {
              ...incoming,
              users: [...(existing.users || []), ...(incoming.users || [])],
            }
          },
        },
      },
    },
    User: {
      keyFields: ['privy_id'],
    },
    Event: {
      keyFields: ['id'],
      fields: {
        is_registered: {
          read(existing) {
            return existing ?? false
          },
        },
      },
    },
    EventRegistration: {
      keyFields: ['id'],
    },
    DanceBond: {
      keyFields: ['id'],
    },
  },
})

interface ApolloProviderProps {
  children: React.ReactNode
}

export const ApolloProvider: React.FC<ApolloProviderProps> = ({ children }) => {
  const { session, isLoading } = useSupabaseAuth()

  // Use refs to access current auth state in error handler closure
  const authStateRef = useRef({ authenticated: !!session, ready: !isLoading })
  useEffect(() => {
    authStateRef.current = { authenticated: !!session, ready: !isLoading }
  }, [session, isLoading])

  const client = useMemo(() => {
    // HTTP link for GraphQL endpoint
    const httpLink = createHttpLink({
      uri: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/graphql`,
    })

    // Authentication link - get fresh token from Supabase session
    const authLink = setContext(async (_, { headers }) => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const token = currentSession?.access_token
        return {
          headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : '',
          },
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error)
        return { headers }
      }
    })

    // Error handling link
    const errorLink = onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors) {
        for (const { message, locations, path, extensions } of graphQLErrors) {
          console.error(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          )

          if (extensions?.code === 'UNAUTHENTICATED') {
            const { authenticated: isAuth, ready: isReady } = authStateRef.current
            if (isReady && !isAuth) {
              window.location.href = '/login'
            } else {
              console.warn(
                'UNAUTHENTICATED error but user has session - possible token timing issue',
              )
            }
          } else if (extensions?.code === 'FORBIDDEN') {
            console.error('Access denied')
          }
        }
      }

      if (networkError) {
        console.error(`[Network error]: ${networkError}`)
      }
    })

    // Create Apollo Client
    return new ApolloClient({
      link: ApolloLink.from([errorLink, authLink, httpLink]),
      cache,
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-first',
          nextFetchPolicy: 'cache-first',
          errorPolicy: 'all',
        },
        query: {
          fetchPolicy: 'cache-first',
          errorPolicy: 'all',
        },
        mutate: {
          errorPolicy: 'all',
        },
      },
    })
  }, [])

  return <ApolloProviderBase client={client}>{children}</ApolloProviderBase>
}

export { cache }
