/**
 * The exact string both sides sign when minting a preview link.
 *
 * Derived here rather than formatted independently in the CMS and in the site's
 * route handler: two derivations that drift would reject every valid link, and
 * the failure would look like a wrong secret rather than a wrong format.
 */
export function previewSignaturePayload(
  projectId: string,
  locale: string,
  expiresAt: number,
): string {
  return `preview:${projectId}:${locale}:${expiresAt}`
}
