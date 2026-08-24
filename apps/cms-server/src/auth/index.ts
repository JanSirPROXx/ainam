import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import type { Database } from '../db/client'
import type { Env } from '../env'

/**
 * Builds the auth instance.
 *
 * A factory rather than a module-level singleton so tests can point it at a
 * throwaway database, and so nothing connects as a side effect of an import.
 *
 * `usePlural` matches the table naming the rest of our schema already uses.
 * `camelCase` stays at its default, which produces snake_case columns — also
 * ours. Both settings shape the generated tables, so changing either after the
 * first migration ships is a data migration on a customer's database.
 */
export function createAuth(env: Env, db: Database) {
  return betterAuth({
    appName: 'AINAM',
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.DASHBOARD_ORIGIN],
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
      transaction: true,
    }),
    emailAndPassword: { enabled: true },
    session: {
      // Signed cookie cache: an admin request reads the session from the cookie
      // instead of Postgres. Short-lived, so a revoked session dies quickly.
      cookieCache: { enabled: true, maxAge: 60 },
    },
    // Stated rather than relied upon: CLAUDE.md forbids telemetry without an
    // explicit opt-in, and a self-hoster should see the answer in our config
    // rather than have to check the library's defaults.
    telemetry: { enabled: false },
    plugins: [organization()],
  })
}

export type Auth = ReturnType<typeof createAuth>
