import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  // Point to the same GraphQL backend as main app
  schema: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql',
  documents: 'src/graphql/**/*.gql',
  generates: {
    'src/generated/graphql.tsx': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
        'fragment-matcher',
      ],
      config: {
        // Generate hooks for React
        withHooks: true,
        // Skip __typename by default for cleaner types
        skipTypename: false,
        // Use the same interface names as main app
        namingConvention: {
          typeNames: 'pascal-case#pascalCase',
          enumValues: 'keep',
        },
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['npx biome format --write src/generated/graphql.tsx'],
  },
}

export default config
