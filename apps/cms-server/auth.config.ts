/**
 * Entry point for Better Auth's schema generator only.
 *
 * The generator imports an auth instance to learn which tables the enabled
 * plugins need. It never opens a connection, so these values only have to
 * satisfy validation — the running server builds its instance from real
 * configuration in src/index.ts.
 *
 * Configuration goes through loadEnv rather than an object literal so that
 * adding a variable with a default does not silently break schema generation.
 */
import { createAuth } from './src/auth'
import { createDatabase } from './src/db/client'
import { loadEnv } from './src/env'
import { createConsoleTransport } from './src/mail/console'

const PLACEHOLDER_DATABASE_URL = 'postgres://ainam:ainam@localhost:5432/ainam'

export const auth = createAuth(
  loadEnv({
    DATABASE_URL: PLACEHOLDER_DATABASE_URL,
    BETTER_AUTH_SECRET: 'schema-generation-placeholder-value-never-used',
  }),
  createDatabase(PLACEHOLDER_DATABASE_URL),
  createConsoleTransport(),
)
