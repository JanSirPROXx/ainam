import type { ContentValue } from '@ainam/schema'
import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentEntries, projects } from '../db/schema'

export type ContentMap = Record<string, ContentValue>

interface Row {
  key: string
  locale: string
  status: 'draft' | 'published'
  value: ContentValue | null
}

/**
 * Folds rows into one value per key, most specific last.
 *
 * `rank` decides what "most specific" means for a given read — the requested
 * locale beats the default it falls back to, and in a preview a draft beats the
 * published value. Expressed once because both reads make the same decision
 * about precedence and differ only in what they rank.
 */
function mergeByPrecedence(rows: Row[], rank: (row: Row) => number): ContentMap {
  const content: ContentMap = {}
  for (const row of [...rows].sort((a, b) => rank(a) - rank(b))) {
    if (row.value !== null) content[row.key] = row.value
  }
  return content
}

export function createContentRepository(db: Database) {
  async function findRows(projectId: string, locales: string[], statuses: Row['status'][]) {
    return db
      .select({
        key: contentEntries.key,
        locale: contentEntries.locale,
        status: contentEntries.status,
        value: contentEntries.value,
      })
      .from(contentEntries)
      .where(
        and(
          eq(contentEntries.projectId, projectId),
          inArray(contentEntries.locale, locales),
          inArray(contentEntries.status, statuses),
        ),
      )
  }

  /** Both the requested locale and the default, so a partial translation renders. */
  function localesFor(locale: string, defaultLocale: string): string[] {
    return locale === defaultLocale ? [locale] : [defaultLocale, locale]
  }

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
     * A locale that has only been partly translated renders the default for the
     * rest rather than a hole in the page.
     */
    async findPublished(
      projectId: string,
      locale: string,
      defaultLocale: string,
    ): Promise<ContentMap> {
      const rows = await findRows(projectId, localesFor(locale, defaultLocale), ['published'])
      return mergeByPrecedence(rows, (row) => (row.locale === locale ? 1 : 0))
    },

    /**
     * What the site would say if everything in the editor were published.
     *
     * A key with no draft falls back to its published value, so a preview is a
     * complete page rather than the handful of things somebody happens to have
     * touched — which is the only form in which a preview answers the question
     * it was opened to answer.
     */
    async findDrafts(projectId: string, locale: string, defaultLocale: string): Promise<ContentMap> {
      const rows = await findRows(projectId, localesFor(locale, defaultLocale), [
        'published',
        'draft',
      ])
      return mergeByPrecedence(
        rows,
        (row) => (row.locale === locale ? 2 : 0) + (row.status === 'draft' ? 1 : 0),
      )
    },
  }
}
