import type { ApiKeyScope } from '@ainam/schema'
import { sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import { organizations, projectApiKeys } from '../db/schema'
import { generateApiKey } from '../lib/api-key'
import { createId } from '../lib/ids'
import { createProjectRepository } from '../repositories/projects'

export interface BootstrapRequest {
  organizationName: string
  projectName: string
  projectSlug: string
  defaultLocale: string
  /** Becomes the owner. Without one, the project cannot be opened in the dashboard. */
  ownerUserId?: string | undefined
}

export interface BootstrapResult {
  organizationId: string
  projectId: string
  /** Shown once. Only its hash is stored. */
  apiKey: string
  /** Signs publish webhooks and preview links. Stored, and rotatable later. */
  webhookSecret: string
}

const DEVELOPER_SCOPES: ApiKeyScope[] = ['content:read', 'schema:write']

const ALREADY_BOOTSTRAPPED =
  'This database already has an organisation. Create further projects from the dashboard.'

/**
 * Refuses when an organisation already exists.
 *
 * Exposed so the command can refuse before it creates an account for the owner:
 * an account made and then orphaned by a refused bootstrap would be a stray row
 * the operator never asked for.
 */
export async function assertNoOrganization(db: Database): Promise<void> {
  const [existing] = await db.select({ id: organizations.id }).from(organizations).limit(1)
  if (existing) throw new Error(ALREADY_BOOTSTRAPPED)
}

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
    const scoped = tx as unknown as Database
    // Serialise against a second bootstrap racing this one; the emptiness check
    // and the insert have to be one decision.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ainam:bootstrap'))`)
    await assertNoOrganization(scoped)

    const created = await createProjectRepository(scoped).createWithOrganization({
      organizationName: request.organizationName,
      organizationSlug: request.projectSlug,
      projectName: request.projectName,
      projectSlug: request.projectSlug,
      defaultLocale: request.defaultLocale,
      ownerUserId: request.ownerUserId,
    })

    const key = generateApiKey()
    await tx.insert(projectApiKeys).values({
      id: createId('key'),
      projectId: created.projectId,
      name: 'Bootstrap key',
      scopes: DEVELOPER_SCOPES,
      keyHash: key.hash,
      prefix: key.prefix,
      createdBy: 'bootstrap',
    })

    return {
      organizationId: created.organizationId,
      projectId: created.projectId,
      apiKey: key.plaintext,
      webhookSecret: created.webhookSecret,
    }
  })
}
