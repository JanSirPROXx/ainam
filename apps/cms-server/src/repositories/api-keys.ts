import { and, desc, eq, isNull, or, sql } from 'drizzle-orm'
import type { ApiKeyScope } from '@ainam/schema'
import type { Database } from '../db/client'
import { projectApiKeys } from '../db/schema'

/** How stale `lastUsedAt` may get before a read pays for a write. */
const LAST_USED_RESOLUTION_MS = 60_000

export interface ActiveApiKey {
  id: string
  projectId: string
  scopes: ApiKeyScope[]
  lastUsedAt: Date | null
}

export function createApiKeyRepository(db: Database) {
  return {
    /**
     * Looks up a usable key by hash.
     *
     * Revocation and expiry are part of the query rather than a check on the
     * result, so there is no path where a caller forgets to apply them.
     */
    async findActiveByHash(hash: string): Promise<ActiveApiKey | undefined> {
      const [row] = await db
        .select({
          id: projectApiKeys.id,
          projectId: projectApiKeys.projectId,
          scopes: projectApiKeys.scopes,
          lastUsedAt: projectApiKeys.lastUsedAt,
        })
        .from(projectApiKeys)
        .where(
          and(
            eq(projectApiKeys.keyHash, hash),
            isNull(projectApiKeys.revokedAt),
            or(isNull(projectApiKeys.expiresAt), gtNow()),
          ),
        )
        .limit(1)
      return row
    },

    /** Newest first, revoked ones included: a revoked key stays auditable. */
    async listForProject(projectId: string) {
      return db
        .select({
          id: projectApiKeys.id,
          name: projectApiKeys.name,
          scopes: projectApiKeys.scopes,
          prefix: projectApiKeys.prefix,
          lastUsedAt: projectApiKeys.lastUsedAt,
          createdAt: projectApiKeys.createdAt,
          revokedAt: projectApiKeys.revokedAt,
        })
        .from(projectApiKeys)
        .where(eq(projectApiKeys.projectId, projectId))
        .orderBy(desc(projectApiKeys.createdAt))
    },

    async create(record: typeof projectApiKeys.$inferInsert) {
      const [row] = await db.insert(projectApiKeys).values(record).returning()
      return row as typeof projectApiKeys.$inferSelect
    },

    /**
     * Marks a key revoked. Scoped to the project, so a key id guessed from
     * elsewhere cannot be revoked through someone else's project.
     */
    async revoke(projectId: string, keyId: string): Promise<boolean> {
      const rows = await db
        .update(projectApiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(projectApiKeys.id, keyId),
            eq(projectApiKeys.projectId, projectId),
            isNull(projectApiKeys.revokedAt),
          ),
        )
        .returning({ id: projectApiKeys.id })
      return rows.length > 0
    },

    /**
     * Records use, but only when the stored value is meaningfully old.
     *
     * Every content read would otherwise turn into a write on the hot path, for
     * a timestamp nobody reads at that resolution.
     */
    async touchLastUsed(key: ActiveApiKey, now: Date): Promise<void> {
      if (key.lastUsedAt && now.getTime() - key.lastUsedAt.getTime() < LAST_USED_RESOLUTION_MS) {
        return
      }
      await db
        .update(projectApiKeys)
        .set({ lastUsedAt: now })
        .where(eq(projectApiKeys.id, key.id))
    },
  }
}

function gtNow() {
  return sql`${projectApiKeys.expiresAt} > now()`
}
