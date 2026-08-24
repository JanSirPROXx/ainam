import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Database } from './client'

/**
 * Applies pending migrations.
 *
 * Run at startup by default, because a self-hoster following `docker compose
 * up` has no other place to run it and an unmigrated database is the most
 * common first-run failure. Drizzle wraps this in a transaction, so two
 * instances starting together do not both apply the same migration — but a
 * rolling deploy across many replicas is still better served by running this as
 * its own step, which is what RUN_MIGRATIONS_ON_START=false is for.
 */
export async function runMigrations(db: Database, migrationsFolder: string): Promise<void> {
  await migrate(db, { migrationsFolder })
}
