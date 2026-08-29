/**
 * Where the site's own buttons point.
 *
 * Not content fields: nav and footer links pair a label with a destination and
 * are edited together, but "Start free" always goes to the dashboard. Putting
 * the destination in the CMS would let a copy edit send sign-ups nowhere.
 *
 * `NEXT_PUBLIC_*` because these are read in the markup that ships to the
 * browser, and they are baked in at build time — a deploy sets them.
 */
export const DASHBOARD_URL = process.env['NEXT_PUBLIC_DASHBOARD_URL'] ?? 'http://localhost:3000'

export const SOURCE_URL =
  process.env['NEXT_PUBLIC_SOURCE_URL'] ?? 'https://github.com/JanSirPROXx/ainam'

export const DOCS_URL = `${SOURCE_URL}#getting-started`
