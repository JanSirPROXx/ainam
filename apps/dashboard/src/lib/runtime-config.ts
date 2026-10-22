/**
 * Where the browser reaches cms-server, decided when the container starts.
 *
 * Not a `NEXT_PUBLIC_*` variable on purpose: `next build` inlines those into the
 * bundle, so an image built once would point at whatever server built it for
 * ever. A self-hosted dashboard is exactly an image somebody else pulls and
 * points at their own server. The root layout renders the runtime value into a
 * `<meta>` tag instead, and the browser reads it from there.
 */
export const CMS_URL_META_NAME = 'ainam-cms-url'

const DEFAULT_CMS_URL = 'http://localhost:8787'

/**
 * Falls back to the local development address when nothing is set, and drops a
 * trailing slash so `${url}/admin/projects` never becomes `//admin/projects`.
 */
export function normaliseCmsUrl(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/+$/, '')
  return trimmed || DEFAULT_CMS_URL
}

/** The environment of the running server. Only meaningful outside a browser. */
export function cmsUrlFromEnvironment(): string {
  return normaliseCmsUrl(process.env['CMS_PUBLIC_URL'])
}

/**
 * The address to send admin and auth requests to.
 *
 * Rendering on the server reads the environment; the browser reads the tag the
 * layout rendered from it, so the two agree without the value ever being baked
 * into a script.
 */
export function cmsUrl(): string {
  if (typeof document === 'undefined') return cmsUrlFromEnvironment()

  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${CMS_URL_META_NAME}"]`)
  return normaliseCmsUrl(meta?.content)
}
