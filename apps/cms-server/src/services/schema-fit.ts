import type { ContentValue } from '@ainam/schema'
import { validateContentValue } from '@ainam/schema'
import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { contentSchemas } from '../db/schema'
import { HttpError } from '../http/errors'

export interface ValueToCheck {
  key: string
  value: ContentValue
}

export interface SchemaMismatch {
  key: string
  /** A sentence naming what was expected and what is there. */
  problem: string
}

/**
 * Checks values against the schema that is supposed to describe them.
 *
 * Shared by the two write paths that can carry a value the schema rejects: an
 * edit, whose values come from a client we do not control, and a restore, whose
 * values were written before a `--allow-breaking` type change. Both make the
 * same decision; only the sentence they wrap it in differs, which is why this
 * returns problems rather than throwing.
 */
export async function findSchemaMismatches(
  tx: Database,
  projectId: string,
  values: ValueToCheck[],
): Promise<SchemaMismatch[]> {
  if (values.length === 0) return []

  const [stored] = await tx
    .select({ schema: contentSchemas.schema })
    .from(contentSchemas)
    .where(eq(contentSchemas.projectId, projectId))
    .limit(1)
  if (!stored) {
    throw new HttpError(
      404,
      'not_found',
      `Project ${projectId} has no content schema. Run "ainam push" from the website's codebase.`,
    )
  }

  return values.flatMap(({ key, value }) => {
    const field = stored.schema[key]
    if (!field) {
      return [{ key, problem: `"${key}" is not a key in this project's schema.` }]
    }
    const problem = validateContentValue(field, value)
    return problem ? [{ key, problem }] : []
  })
}
