'use client'

import type { ProjectSummary } from '@ainam/schema'
import { Badge, Card, EmptyState, Eyebrow } from '@ainam/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PageShell } from '@/components/PageShell'
import { adminFetch } from '@/lib/api'
import { useActiveOrganization } from '@/lib/auth-client'
import { useRequireSession } from '@/lib/session'

export default function ProjectsPage() {
  const { ready, email } = useRequireSession()
  const active = useActiveOrganization()

  const projects = useQuery({
    queryKey: ['projects'],
    enabled: ready,
    queryFn: () => adminFetch<{ projects: ProjectSummary[] }>('/admin/projects'),
  })

  const all = projects.data?.projects ?? []
  // Filtered rather than fetched per organisation: the switcher has to feel
  // instant, and one agency's whole project list is tens of rows, not thousands.
  const activeId = active.data?.id
  const visible = activeId ? all.filter((project) => project.organizationId === activeId) : all

  return (
    <PageShell email={email}>
      <Eyebrow>Projects</Eyebrow>

      {projects.isSuccess && visible.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? 'No projects yet' : 'No projects in this organisation'}
          description="Run ainam push from your website's codebase to create one."
        />
      ) : null}

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {visible.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} style={{ display: 'block' }}>
            <Card
              interactive
              title={project.name}
              description={`${project.organizationName} · ${project.locales.join(', ')}`}
            >
              <Badge tone="neutral">{project.role}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
