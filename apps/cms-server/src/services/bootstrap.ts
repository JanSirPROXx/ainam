import type { ApiKeyScope } from '@ainam/schema'
import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { organizations, projectApiKeys, projects } from '../db/schema'
import { generateApiKey } from '../lib/api-key'
import { createId } from '../lib/ids'

export interface BootstrapRequest {
  organizationName: string
  projectName: string
  projectSlug: string
  defaultLocale: string
}

export interface BootstrapResult {
  organizationId: string
  projectId: string
  /** Shown once. Only its hash is stored. */
  apiKey: string
}

const DEVELOPER_SCOPES: ApiKeyScope[] = ['content:read', 'schema:write']

/**
 * Creates the first organisation, project and API key.
 *
 * A fresh self-hosted install has an empty database and no way in: the content
 * API needs a key, and a key needs a project. This is that first step, and it
 * refuses to run twice — a second organisation is an ordinary operation that
 * belongs in the dashboard, not in a bootstrap path with no authentication.
 */
export async function bootstrapWorkspace(
  db: Database,
  request: BootstrapRequest,
): Promise<BootstrapResult> {
  return db.transaction(async (tx) => {
    // Serialise against a second bootstrap racing this one; the emptiness check
    // and the insert have to be one decision.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ainam:bootstrap'))`)

    const [existing] = await tx.select({ id: organizations.id }).from(organizations).limit(1)
    if (existing) {
      throw new Error(
        'This database already has an organisation. Create further projects from the dashboard.',
      )
    }

    const organizationId = createId('org')
    const projectId = createId('proj')
    const key = generateApiKey()

    await tx.insert(organizations).values({
      id: organizationId,
      name: request.organizationName,
      slug: request.projectSlug,
      createdAt: new Date(),
    })

    await tx.insert(projects).values({
      id: projectId,
      organizationId,
      name: request.projectName,
      slug: request.projectSlug,
      defaultLocale: request.defaultLocale,
      locales: [request.defaultLocale],
    })

    await tx.insert(projectApiKeys).values({
      id: createId('key'),
      projectId,
      name: 'Bootstrap key',
      scopes: DEVELOPER_SCOPES,
      keyHash: key.hash,
      prefix: key.prefix,
      createdBy: 'bootstrap',
    })

    return { organizationId, projectId, apiKey: key.plaintext }
  })
}
