import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createHttpLink } from '@apollo/client/link/http'
import { ApolloProvider as ApolloProviderBase } from '@apollo/client/react'
import { useSupabaseAuth } from './SupabaseAuthProvider'
import type React from 'react'
import { useMemo } from 'react'
import Toast from 'react-native-toast-message'
import { API_BASE_URL } from '../config/api'

// Cache configuration with proper field policies
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        events: {
          // Use all filter and sort arguments as cache keys
          keyArgs: ['filter', 'sortBy', 'organizerId'],
          merge(existing, incoming, { args }) {
            // Always replace on refresh or initial fetch
            if (!existing || args?.pagination?.offset === 0) {
              return incoming
            }

            // Only concatenate for pagination (infinite scroll)
            if (args?.pagination?.offset > 0) {
              // Create a map to avoid duplicates
              const existingEventsMap = new Map()
              for (const event of existing.events || []) {
                existingEventsMap.set(event.id || event.__ref, event)
              }
              // Add new events, avoiding duplicates
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
          // This field is user-specific, so we need to handle it specially
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
  const { getAccessToken } = useSupabaseAuth()

  const client = useMemo(() => {
    // HTTP link for GraphQL endpoint with 10s timeout to avoid indefinite hangs
    const httpLink = createHttpLink({
      uri: `${API_BASE_URL}/graphql`,
      fetchOptions: { timeout: 10000 },
      fetch: (uri: RequestInfo, options?: RequestInit) => {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 10000)
        return fetch(uri, { ...options, signal: controller.signal }).finally(() =>
          clearTimeout(id),
        )
      },
    })

    // Authentication link
    const authLink = setContext(async (_, { headers }) => {
      try {
        const token = await getAccessToken()
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
      // Check if it's a GraphQL error with errors array
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path, extensions }) => {
          console.error(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          )

          // Show user-friendly error messages
          if (extensions?.code === 'UNAUTHENTICATED') {
            Toast.show({
              type: 'error',
              text1: 'Authentication Required',
              text2: 'Please log in to continue',
            })
          } else if (extensions?.code === 'FORBIDDEN') {
            Toast.show({
              type: 'error',
              text1: 'Access Denied',
              text2: 'You do not have permission to perform this action',
            })
          }
        })
      }

      if (networkError) {
        // It's a network error
        console.error(`[Network error]: ${networkError}`)

        // Only show network error toast for non-401 errors
        if ('statusCode' in networkError && (networkError as any).statusCode !== 401) {
          Toast.show({
            type: 'error',
            text1: 'Network Error',
            text2: 'Please check your connection and try again',
          })
        }
      }
    })

    // Create Apollo Client
    return new ApolloClient({
      link: ApolloLink.from([errorLink, authLink, httpLink]),
      cache,
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network',
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
  }, [getAccessToken])

  return <ApolloProviderBase client={client}>{children}</ApolloProviderBase>
}

// Export cache for direct manipulation if needed
export { cache }
