import type { ContentValue } from '@ainam/schema'
import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries, projects } from '../db/schema'

export type ContentMap = Record<string, ContentValue>

export function createContentRepository(db: Database) {
  return {
    async findProject(projectId: string) {
      const [row] = await db
        .select({ id: projects.id, defaultLocale: projects.defaultLocale, locales: projects.locales })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
      return row
    },

    /**
     * Published content for a project, in the requested locale.
     *
     * Both the requested locale and the default are fetched in one query and
     * merged per key, so a locale that has only been partly translated renders
     * the default for the rest rather than a hole in the page.
     */
    async findPublished(
      projectId: string,
      locale: string,
      defaultLocale: string,
    ): Promise<ContentMap> {
      const locales = locale === defaultLocale ? [locale] : [defaultLocale, locale]

      const rows = await db
        .select({
          key: contentEntries.key,
          locale: contentEntries.locale,
          value: contentEntries.value,
        })
        .from(contentEntries)
        .where(
          and(
            eq(contentEntries.projectId, projectId),
            eq(contentEntries.status, 'published'),
            inArray(contentEntries.locale, locales),
          ),
        )

      // Ordered so the requested locale overwrites the default it falls back to.
      const byPrecedence = [...rows].sort((a, b) =>
        a.locale === b.locale ? 0 : a.locale === locale ? 1 : -1,
      )

      const content: ContentMap = {}
      for (const row of byPrecedence) {
        if (row.value !== null) content[row.key] = row.value
      }
      return content
    },
  }
}
