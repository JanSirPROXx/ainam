import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateContentTypes } from './codegen'
import { TYPES_FILE } from './pull'
import { loadContentSchema } from './config'

/**
 * Generates types from the local config, without contacting a server.
 *
 * `pull` is the fuller command — it also writes the snapshot, and it reflects
 * what the server actually stored. This exists because the schema in the
 * codebase is already the source of truth, so needing a running CMS just to get
 * autocomplete would be backwards, and a cloned template would not typecheck
 * until someone stood one up.
 */
export async function runGenerate(cwd: string): Promise<number> {
  const schema = await loadContentSchema(cwd)
  const keys = Object.keys(schema).length
  await writeFile(join(cwd, TYPES_FILE), generateContentTypes(schema), 'utf8')
  process.stdout.write(`Wrote ${TYPES_FILE} — ${keys} keys, from ainam.config.ts\n`)
  return 0
}
