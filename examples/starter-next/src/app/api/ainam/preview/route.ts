import { createPreviewHandler } from '@ainam/next'

/**
 * Where the Preview button in AINAM sends you. Point the project's preview URL
 * here.
 *
 * Turns Next's draft mode on, after checking a signature the CMS produced with
 * this project's webhook secret. From then on every `ainam.get()` on this site
 * reads unpublished drafts instead of published content, until you open the
 * same route with `?exit=1`.
 */
export const GET = createPreviewHandler({
  secret: process.env['AINAM_WEBHOOK_SECRET'] ?? '',
  projectId: process.env['AINAM_PROJECT_ID'] ?? '',
})
