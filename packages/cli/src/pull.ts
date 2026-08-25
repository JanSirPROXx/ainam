import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ContentSchema } from '@ainam/core'
import { generateContentTypes } from './codegen'
import { type ProjectContext, loadProjectContext } from './config'

export const TYPES_FILE = 'ainam.gen.ts'

interface StoredSchema {
  schema: ContentSchema
  locales: string[]
  defaultLocale: string
}

function snapshotFile(locale: string): string {
  return `ainam-snapshot.${locale}.json`
}

async function getJson<T>(context: ProjectContext, path: string): Promise<T> {
  const response = await fetch(`${context.baseUrl}${path}`, {
    headers: { authorization: `Bearer ${context.apiKey}`, accept: 'application/json' },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `HTTP ${response.status} from ${path}`)
  }
  return (await response.json()) as T
}

/**
 * Generates types from the pushed schema and a content snapshot per locale.
 *
 * The snapshot is not a convenience: it is what keeps a customer's site
 * rendering while AINAM is unreachable. It ships with the build, so it has to be
 * regenerated as part of the build, not fetched at runtime.
 */
export async function runPull(cwd: string): Promise<number> {
  const context = await loadProjectContext(cwd)
  const project = encodeURIComponent(context.projectId)

  const stored = await getJson<StoredSchema>(context, `/v1/schema/${project}`)
  const keyCount = Object.keys(stored.schema).length

  await writeFile(join(cwd, TYPES_FILE), generateContentTypes(stored.schema), 'utf8')
  process.stdout.write(`Wrote ${TYPES_FILE} — ${keyCount} keys\n`)

  const generatedAt = new Date().toISOString()
  for (const locale of stored.locales) {
    const entries = await getJson<Record<string, unknown>>(
      context,
      `/v1/content/${project}?locale=${encodeURIComponent(locale)}`,
    )
    const snapshot = { projectId: context.projectId, locale, generatedAt, entries }
    await writeFile(join(cwd, snapshotFile(locale)), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
    process.stdout.write(
      `Wrote ${snapshotFile(locale)} — ${Object.keys(entries).length} entries\n`,
    )
  }

  process.stdout.write(
    `\nPass the snapshot to createAinamClient so the site survives a CMS outage.\n`,
  )
  return 0
}
