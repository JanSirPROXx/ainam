import type { ContentSchema } from '@ainam/schema'
import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentSchemas, projects } from '../db/schema'

export interface StoredSchema {
  schema: ContentSchema
  locales: string[]
  defaultLocale: string
}

export function createSchemaRepository(db: Database) {
  return {
    /**
     * The schema plus the locales it applies to.
     *
     * Joined rather than fetched separately because `ainam pull` needs both to
     * generate one snapshot file per locale, and a project whose locales moved
     * between the two reads would produce a set that matches neither.
     */
    async findByProject(projectId: string): Promise<StoredSchema | undefined> {
      const [row] = await db
        .select({
          schema: contentSchemas.schema,
          locales: projects.locales,
          defaultLocale: projects.defaultLocale,
        })
        .from(contentSchemas)
        .innerJoin(projects, eq(projects.id, contentSchemas.projectId))
        .where(eq(contentSchemas.projectId, projectId))
        .limit(1)
      return row
    },
  }
}
