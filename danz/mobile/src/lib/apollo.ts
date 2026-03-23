import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { createHttpLink } from '@apollo/client/link/http'
import { GRAPHQL_ENDPOINT } from '../config/api'

// Create HTTP link
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
})

// Function to get the auth token
let getAuthToken: (() => Promise<string | null>) | null = null

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter
}

// Auth link to add token to headers
const authLink = setContext(async (_, { headers }) => {
  try {
    let token = null

    // Get token from the getter function (set by Privy)
    if (getAuthToken) {
      token = await getAuthToken()
    }

    // Token attached to headers

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
    return {
      headers: headers || {},
    }
  }
})

// Error handling link
const errorLink = onError(error => {
  const { graphQLErrors, networkError } = error

  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }: any) => {
      console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)

      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Handle unauthenticated error
        console.log('User is not authenticated')
      }
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)

    // Handle network errors
    if ('statusCode' in networkError) {
      const netError = networkError as any
      if (netError.statusCode === 401) {
        // Handle unauthorized
        console.log('Unauthorized - token may be expired')
      }
    }
  }
})

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          events: {
            // Merge paginated results
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.pagination?.offset || args.pagination.offset === 0) {
                // Fresh query or first page
                return incoming
              }
              // Merge with existing data for pagination
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              }
            },
          },
          users: {
            keyArgs: ['filter'],
            merge(existing, incoming, { args }) {
              if (!args?.pagination?.offset || args.pagination.offset === 0) {
                return incoming
              }
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              }
            },
          },
        },
      },
      Event: {
        keyFields: ['id'],
      },
      User: {
        keyFields: ['privy_id'],
      },
      EventRegistration: {
        keyFields: ['id'],
      },
    },
  }),
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

// Helper function to clear cache
export const clearApolloCache = async () => {
  await apolloClient.clearStore()
}

// Helper function to reset cache
export const resetApolloCache = async () => {
  await apolloClient.resetStore()
}
