import type { Server } from 'node:http'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { expressMiddleware } from '@as-integrations/express5'
import cors from 'cors'
import express, { type Application } from 'express'
import { corsOptions } from '../config/cors.js'
import { createContext } from './context.js'
import { resolvers } from './resolvers/index.js'
import { typeDefs } from './schema/index.js'

export async function setupGraphQL(app: Application, httpServer: Server) {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Disable landing page in production to avoid CSP issues
      ...(process.env.NODE_ENV !== 'production'
        ? [
            ApolloServerPluginLandingPageLocalDefault({
              embed: true,
              includeCookies: true,
            }),
          ]
        : []),
    ],
    // Enable introspection in production for Apollo Studio
    introspection: true,
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  })

  await apolloServer.start()

  // Apply Apollo Server middleware with Express 5 integration
  // Proper middleware order for Express 5 compatibility
  app.use(
    '/graphql',
    cors(corsOptions),
    express.json(),
    expressMiddleware(apolloServer, {
      context: createContext,
    }),
  )

  console.log('🚀 GraphQL server ready at /graphql')

  return apolloServer
}
