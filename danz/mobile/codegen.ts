import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.GRAPHQL_ENDPOINT || 'https://danz-backend.fly.dev/graphql',
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
  hooks: {
    afterAllFileWrite: ['npx biome format --write src/generated/graphql.tsx'],
  },
}

export default config
