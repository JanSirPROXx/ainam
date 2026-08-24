/**
 * Cache tag for one project/locale pair.
 *
 * Reads register under this tag and the revalidation webhook invalidates it, so
 * a publish in the dashboard reaches the site without a redeploy and without
 * refetching on every request.
 */
export function contentTag(projectId: string, locale: string): string {
  return `ainam:content:${projectId}:${locale}`
}
