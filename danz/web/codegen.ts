import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.GRAPHQL_SCHEMA_URL || './schema.graphql',
  documents: 'src/graphql/**/*.gql',
  generates: {
    'src/generated/graphql.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
        'fragment-matcher',
      ],
    },
  },
  // hooks disabled - generated file exceeds biome size limit (1MB)
  // hooks: {
  //   afterAllFileWrite: ['bunx biome format --write src/generated/graphql.tsx'],
  // },
}

export default config
