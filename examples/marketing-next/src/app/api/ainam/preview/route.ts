import { createPreviewHandler } from '@ainam/next'

/** Where the Preview button in AINAM sends you. Point the project's preview URL here. */
export const GET = createPreviewHandler({
  secret: process.env['AINAM_WEBHOOK_SECRET'] ?? '',
  projectId: process.env['AINAM_PROJECT_ID'] ?? '',
})
