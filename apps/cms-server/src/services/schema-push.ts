import type { Author, SchemaPushRequest, SchemaPushResult } from '@ainam/schema'
import { eq, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries, contentSchemas, contentVersions, projects } from '../db/schema'
import { createId } from '../lib/ids'
import { diffContentSchemas } from '../lib/schema-diff'
import { seedValueFor } from '../lib/seed-values'

const PUSH_AUTHOR: Author = { kind: 'agent', name: 'ainam push' }

/**
 * Applies a code-first schema to a project.
 *
 * Schema pushes for one project must serialise: two concurrent pushes would
 * each diff against the state they read at the start, and the later write would
 * drop the field definitions the earlier one added. `pg_advisory_xact_lock`
 * rather than relying on row locks, because the conflict is over the whole
 * schema document and the first statement is a read.
 */
export async function pushContentSchema(
  db: Database,
  projectId: string,
  request: SchemaPushRequest,
): Promise<SchemaPushResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`)

    const [existing] = await tx
      .select({ schema: contentSchemas.schema })
      .from(contentSchemas)
      .where(eq(contentSchemas.projectId, projectId))
      .limit(1)

    const diff = diffContentSchemas(existing?.schema ?? {}, request.schema)
    const now = new Date()

    // JS preserves insertion order for string keys, so this is the order the
    // developer wrote in ainam.config.ts. Recorded now because JSONB will not
    // preserve it, and nothing else can reconstruct it later.
    const keyOrder = Object.keys(request.schema)

    await tx
      .insert(contentSchemas)
      .values({ projectId, schema: request.schema, keyOrder, updatedAt: now })
      .onConflictDoUpdate({
        target: contentSchemas.projectId,
        set: { schema: request.schema, keyOrder, updatedAt: now },
      })

    await tx
      .update(projects)
      .set({ locales: request.locales, defaultLocale: request.defaultLocale, updatedAt: now })
      .where(eq(projects.id, projectId))

    // Only newly added keys are seeded. Re-seeding an existing key when its
    // default changes in code would silently overwrite what the customer wrote
    // in the dashboard — the default is a starting point, not a source of truth.
    const seeds = diff.added.flatMap((key) => {
      const field = request.schema[key]
      if (!field) return []
      const value = seedValueFor(field)
      return request.locales.map((locale) => ({ key, locale, value }))
    })

    if (seeds.length > 0) {
      // A key removed earlier and re-added keeps its stored content rather than
      // reverting to the default, which is why this does not overwrite.
      await tx
        .insert(contentEntries)
        .values(
          seeds.flatMap((seed) =>
            (['draft', 'published'] as const).map((status) => ({
              id: createId('entry'),
              projectId,
              key: seed.key,
              locale: seed.locale,
              status,
              value: seed.value,
              version: 1,
              updatedAt: now,
              updatedBy: PUSH_AUTHOR,
            })),
          ),
        )
        .onConflictDoNothing()

      // The seeded default is a published state like any other, so it gets a
      // history row. Without one it would be the single state a customer could
      // never roll back to — the one their site started from.
      const pushId = createId('pub')
      await tx
        .insert(contentVersions)
        .values(
          seeds.map((seed) => ({
            id: createId('ver'),
            projectId,
            key: seed.key,
            locale: seed.locale,
            version: 1,
            value: seed.value,
            createdAt: now,
            author: PUSH_AUTHOR,
            publishId: pushId,
          })),
        )
        .onConflictDoNothing()
    }

    return diff
  })
}
