import { createRevalidateHandler } from '@ainam/next'

/** Called by AINAM after a publish. Point the project's webhook here. */
export const POST = createRevalidateHandler({
  secret: process.env['AINAM_WEBHOOK_SECRET'] ?? '',
  projectId: process.env['AINAM_PROJECT_ID'] ?? '',
})
