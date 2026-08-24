import { and, eq, isNull, or, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { projectApiKeys } from '../db/schema'

/** How stale `lastUsedAt` may get before a read pays for a write. */
const LAST_USED_RESOLUTION_MS = 60_000

export interface ActiveApiKey {
  id: string
  projectId: string
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
