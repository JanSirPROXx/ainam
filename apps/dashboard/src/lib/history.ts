import type { AuthorNames } from '@ainam/schema'

/**
 * Folds paged history into one list and one name map.
 *
 * Author names are resolved per page, so a list spanning several pages needs
 * them merged or the older rows lose their authors as soon as you load more.
 */
export function mergeHistoryPages<Page extends { people: AuthorNames }, Item>(
  pages: Page[] | undefined,
  select: (page: Page) => Item[],
): { items: Item[]; people: AuthorNames } {
  const loaded = pages ?? []
  return {
    items: loaded.flatMap(select),
    people: Object.assign({}, ...loaded.map((page) => page.people)) as AuthorNames,
  }
}

/** Appends a keyset cursor, which is opaque and has to survive a query string. */
export function withCursor(path: string, cursor: string | null): string {
  return cursor === null ? path : `${path}&cursor=${encodeURIComponent(cursor)}`
}
