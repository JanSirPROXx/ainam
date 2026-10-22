import { OWNER_ROLE, type ProjectSummary, type UpdateProjectRequest } from '@ainam/schema'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { members, organizations, projects } from '../db/schema'
import { generateWebhookSecret } from '../lib/api-key'
import { createId } from '../lib/ids'

/**
 * A project as the server holds it.
 *
 * Carries the webhook secret, which `ProjectSummary` deliberately does not:
 * routes map fields onto that wire type explicitly, so adding a column here
 * cannot leak it to a browser.
 */
export interface ProjectRecord extends ProjectSummary {
  webhookSecret: string | null
}

const columns = {
  id: projects.id,
  organizationId: projects.organizationId,
  organizationName: organizations.name,
  name: projects.name,
  slug: projects.slug,
  defaultLocale: projects.defaultLocale,
  locales: projects.locales,
  role: members.role,
  webhookUrl: projects.webhookUrl,
  webhookSecret: projects.webhookSecret,
  previewUrl: projects.previewUrl,
}

export interface NewWorkspace {
  organizationName: string
  organizationSlug: string
  projectName: string
  projectSlug: string
  defaultLocale: string
  /** Becomes the organisation's owner. Without one, nobody can open the project in the dashboard. */
  ownerUserId?: string | undefined
}

export interface CreatedWorkspace {
  organizationId: string
  projectId: string
  webhookSecret: string
}

export function createProjectRepository(db: Database) {
  return {
    /**
     * Inserts an organisation, its first project and, when given, the owner.
     *
     * Takes the database handle the caller chose, so a caller that needs more to
     * succeed or fail with it — bootstrap also issues a key — can pass a
     * transaction. Called on its own it is three inserts that must not be left
     * half done, so callers wrap it.
     */
    async createWithOrganization(input: NewWorkspace): Promise<CreatedWorkspace> {
      const organizationId = createId('org')
      const projectId = createId('proj')
      // Generated up front rather than on first use: without it the publish
      // webhook can never fire and the preview link can never be signed, and
      // both failures look like a bug rather than a missing setting.
      const webhookSecret = generateWebhookSecret()
      const now = new Date()

      await db.insert(organizations).values({
        id: organizationId,
        name: input.organizationName,
        slug: input.organizationSlug,
        createdAt: now,
      })

      if (input.ownerUserId) {
        await db.insert(members).values({
          id: createId('mem'),
          organizationId,
          userId: input.ownerUserId,
          role: OWNER_ROLE,
          createdAt: now,
        })
      }

      await db.insert(projects).values({
        id: projectId,
        organizationId,
        name: input.projectName,
        slug: input.projectSlug,
        defaultLocale: input.defaultLocale,
        locales: [input.defaultLocale],
        webhookSecret,
      })

      return { organizationId, projectId, webhookSecret }
    },

    /**
     * Projects the user can reach, by way of the organisations they belong to.
     *
     * The membership join is the authorisation, not a filter applied afterwards:
     * there is no code path that returns a project and then decides whether the
     * caller should have seen it.
     */
    async listForUser(userId: string): Promise<ProjectRecord[]> {
      return db
        .select(columns)
        .from(projects)
        .innerJoin(members, eq(members.organizationId, projects.organizationId))
        .innerJoin(organizations, eq(organizations.id, projects.organizationId))
        .where(eq(members.userId, userId))
        .orderBy(organizations.name, projects.name)
    },

    async findForUser(projectId: string, userId: string): Promise<ProjectRecord | undefined> {
      const [row] = await db
        .select(columns)
        .from(projects)
        .innerJoin(members, eq(members.organizationId, projects.organizationId))
        .innerJoin(organizations, eq(organizations.id, projects.organizationId))
        .where(and(eq(projects.id, projectId), eq(members.userId, userId)))
        .limit(1)
      return row
    },

    /** An empty string clears a URL; an absent field leaves it as it was. */
    async update(projectId: string, changes: UpdateProjectRequest): Promise<void> {
      const patch: Record<string, string | null | Date> = { updatedAt: new Date() }
      if (changes.name !== undefined) patch['name'] = changes.name
      if (changes.webhookUrl !== undefined) patch['webhookUrl'] = changes.webhookUrl || null
      if (changes.previewUrl !== undefined) patch['previewUrl'] = changes.previewUrl || null

      await db.update(projects).set(patch).where(eq(projects.id, projectId))
    },

    /** Content, history, keys and asset rows go with it, by cascade. */
    async remove(projectId: string): Promise<void> {
      await db.delete(projects).where(eq(projects.id, projectId))
    },

    /**
     * Replaces the secret that signs publishes and preview links.
     *
     * Separate from `update` because it is not a setting a form submits: the
     * previous value stops working the moment this returns, and the new one is
     * shown exactly once.
     */
    async setWebhookSecret(projectId: string, secret: string): Promise<void> {
      await db
        .update(projects)
        .set({ webhookSecret: secret, updatedAt: new Date() })
        .where(eq(projects.id, projectId))
    },
  }
}

/** Drops the fields a browser has no use for and must never receive. */
export function toProjectSummary(record: ProjectRecord): ProjectSummary {
  return {
    id: record.id,
    organizationId: record.organizationId,
    organizationName: record.organizationName,
    name: record.name,
    slug: record.slug,
    defaultLocale: record.defaultLocale,
    locales: record.locales,
    role: record.role,
    webhookUrl: record.webhookUrl,
    previewUrl: record.previewUrl,
  }
}
