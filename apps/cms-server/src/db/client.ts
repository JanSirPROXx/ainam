import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = ReturnType<typeof createDatabase>

/**
 * Opens the connection pool.
 *
 * `new Pool` does not connect eagerly, so this is safe to call at startup even
 * when Postgres is not up yet — the health check is what reports that.
 */
export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}
