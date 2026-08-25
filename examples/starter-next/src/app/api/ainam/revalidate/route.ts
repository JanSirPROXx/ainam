import { createRevalidateHandler } from '@ainam/next'

/**
 * Called by AINAM after a publish. Point the project's webhook here.
 *
 * Without it a change reaches the dashboard but never the live page, because
 * reads are cached until this tag is purged.
 */
export const POST = createRevalidateHandler({
  secret: process.env['AINAM_WEBHOOK_SECRET'] ?? '',
  projectId: process.env['AINAM_PROJECT_ID'] ?? '',
})
