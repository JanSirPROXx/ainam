import type { SchemaPushResult } from '@ainam/core'
import { loadProjectContext } from './config'

function report(label: string, keys: string[]): void {
  if (keys.length === 0) return
  process.stdout.write(`  ${label} ${keys.length}\n`)
  for (const key of keys) process.stdout.write(`    ${key}\n`)
}

/**
 * Uploads the schema declared in the codebase.
 *
 * Newly added keys are seeded server-side with the defaults declared alongside
 * them, so the site renders real copy on its first deploy rather than waiting
 * for someone to type it into the dashboard.
 */
export async function runPush(cwd: string, locales: string[], defaultLocale: string): Promise<number> {
  const context = await loadProjectContext(cwd)

  const response = await fetch(`${context.baseUrl}/v1/schema/${encodeURIComponent(context.projectId)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${context.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ schema: context.schema, locales, defaultLocale }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    process.stderr.write(`Push failed: ${body?.error?.message ?? `HTTP ${response.status}`}\n`)
    return 1
  }

  const result = (await response.json()) as SchemaPushResult
  const total = result.added.length + result.updated.length + result.removed.length
  if (total === 0) {
    process.stdout.write('Schema is already up to date.\n')
    return 0
  }

  process.stdout.write('Pushed:\n')
  report('added  ', result.added)
  report('updated', result.updated)
  report('removed', result.removed)
  if (result.removed.length > 0) {
    // Someone pushing from the wrong branch should see immediately that this is
    // recoverable, not a data loss they need to panic about.
    process.stdout.write('\nRemoved keys are no longer editable. Their content is kept.\n')
  }
  return 0
}
