import { createRevalidateHandler } from '@ainam/next'
import { revalidatePath } from 'next/cache'

const purgeContentTag = createRevalidateHandler({
  secret: process.env['AINAM_WEBHOOK_SECRET'] ?? '',
  projectId: process.env['AINAM_PROJECT_ID'] ?? '',
})

/**
 * Called by AINAM after a publish. Point the project's webhook here.
 *
 * Without it a change reaches the dashboard but never the live page, because
 * reads are cached until this is called.
 *
 * The content tag only reaches pages whose content was read through it. A page
 * built while AINAM was unreachable renders from the snapshot, reads nothing and
 * carries no tag — which is exactly how this template ships, and how any site is
 * built before its first push. Left alone, it would keep serving the snapshot
 * after every publish, so a publish also renews the whole site.
 */
export async function POST(request: Request): Promise<Response> {
  const response = await purgeContentTag(request)
  if (response.ok) revalidatePath('/', 'layout')
  return response
}
