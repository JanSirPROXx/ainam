import type { AssetSummary } from '@ainam/schema'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { assets, projects } from '../db/schema'

export type AssetRecord = typeof assets.$inferSelect

export function createAssetRepository(db: Database) {
  return {
    /** The same bytes uploaded twice are one row, so a logo is stored once. */
    async findByChecksum(projectId: string, checksum: string): Promise<AssetRecord | undefined> {
      const [row] = await db
        .select()
        .from(assets)
        .where(and(eq(assets.projectId, projectId), eq(assets.checksum, checksum)))
        .limit(1)
      return row
    },

    async findByIds(projectId: string, ids: string[]): Promise<AssetRecord[]> {
      if (ids.length === 0) return []
      return db
        .select()
        .from(assets)
        .where(and(eq(assets.projectId, projectId), inArray(assets.id, ids)))
    },

    async listForProject(projectId: string, limit: number): Promise<AssetRecord[]> {
      return db
        .select()
        .from(assets)
        .where(eq(assets.projectId, projectId))
        .orderBy(desc(assets.createdAt))
        .limit(limit)
    },

    /**
     * Records an upload and adds its bytes to the project's total.
     *
     * One transaction, because a row without its bytes counted is a quota that
     * drifts quietly downward until it stops meaning anything.
     */
    async create(record: typeof assets.$inferInsert): Promise<AssetRecord> {
      return db.transaction(async (tx) => {
        const [row] = await tx.insert(assets).values(record).returning()
        await tx
          .update(projects)
          .set({ storedBytes: sql`${projects.storedBytes} + ${record.byteSize}` })
          .where(eq(projects.id, record.projectId))
        // The insert has a returning clause and the row was just written.
        return row as AssetRecord
      })
    },

    async storedBytes(projectId: string): Promise<number> {
      const [row] = await db
        .select({ storedBytes: projects.storedBytes })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
      return row?.storedBytes ?? 0
    },
  }
}

/** Drops the storage key, which is an implementation detail of the bucket. */
export function toAssetSummary(record: AssetRecord, url: string): AssetSummary {
  return {
    id: record.id,
    filename: record.filename,
    mimeType: record.mimeType,
    byteSize: record.byteSize,
    width: record.width,
    height: record.height,
    url,
    createdAt: record.createdAt.toISOString(),
  }
}
