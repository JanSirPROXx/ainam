import { and, eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { members, projects } from '../db/schema'

export interface ProjectSummary {
  id: string
  organizationId: string
  name: string
  slug: string
  defaultLocale: string
  locales: string[]
  role: string
  webhookUrl: string | null
  webhookSecret: string | null
}

export function createProjectRepository(db: Database) {
  return {
    /**
     * Projects the user can reach, by way of the organisations they belong to.
     *
     * The membership join is the authorisation, not a filter applied afterwards:
     * there is no code path that returns a project and then decides whether the
     * caller should have seen it.
     */
    async listForUser(userId: string): Promise<ProjectSummary[]> {
      return db
        .select({
          id: projects.id,
          organizationId: projects.organizationId,
          name: projects.name,
          slug: projects.slug,
          defaultLocale: projects.defaultLocale,
          locales: projects.locales,
          role: members.role,
          webhookUrl: projects.webhookUrl,
          webhookSecret: projects.webhookSecret,
        })
        .from(projects)
        .innerJoin(members, eq(members.organizationId, projects.organizationId))
        .where(eq(members.userId, userId))
    },

    async findForUser(projectId: string, userId: string): Promise<ProjectSummary | undefined> {
      const [row] = await db
        .select({
          id: projects.id,
          organizationId: projects.organizationId,
          name: projects.name,
          slug: projects.slug,
          defaultLocale: projects.defaultLocale,
          locales: projects.locales,
          role: members.role,
          webhookUrl: projects.webhookUrl,
          webhookSecret: projects.webhookSecret,
        })
        .from(projects)
        .innerJoin(members, eq(members.organizationId, projects.organizationId))
        .where(and(eq(projects.id, projectId), eq(members.userId, userId)))
        .limit(1)
      return row
    },
  }
}
