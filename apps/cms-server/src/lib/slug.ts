const MAX_SLUG_LENGTH = 48

/**
 * Turns a project name into a URL-safe slug.
 *
 * Accents are folded rather than dropped, so "Café Zürich" becomes
 * `cafe-zurich` instead of `caf-z-rich`. A name with nothing usable in it
 * (only symbols, or a script this does not transliterate) still has to produce
 * a slug, because the column is not nullable.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')

  return slug || 'project'
}
