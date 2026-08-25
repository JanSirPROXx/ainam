'use client'

import type { EditorView, ProjectSummary } from '@ainam/schema'
import { hasPermission } from '@ainam/schema'
import { Breadcrumb, EmptyState, Tabs } from '@ainam/ui'
import { useQuery } from '@tanstack/react-query'
import { use, useState } from 'react'
import { ContentEditor } from '@/components/ContentEditor'
import { HistoryPanel } from '@/components/HistoryPanel'
import { PageShell } from '@/components/PageShell'
import { PeoplePanel } from '@/components/PeoplePanel'
import { ProjectSettings } from '@/components/ProjectSettings'
import { AdminApiError, adminFetch } from '@/lib/api'
import { useRequireSession } from '@/lib/session'

type Tab = 'content' | 'history' | 'people' | 'settings'

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const { ready, email } = useRequireSession()
  const [tab, setTab] = useState<Tab>('content')

  const project = useQuery({
    queryKey: ['project', projectId],
    enabled: ready,
    queryFn: () => adminFetch<ProjectSummary>(`/admin/projects/${projectId}`),
  })

  const content = useQuery({
    queryKey: ['content', projectId],
    enabled: ready,
    queryFn: () => adminFetch<EditorView>(`/admin/projects/${projectId}/content`),
    retry: false,
  })

  const role = project.data?.role ?? ''
  // Tabs an editor cannot act on are not rendered at all. Showing a surface
  // whose every control is disabled reads as a broken page rather than a role.
  const manages = hasPermission(role, 'project:manage')

  return (
    <PageShell email={email}>
      <header style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <Breadcrumb items={[{ label: 'Projects', href: '/' }, project.data?.name ?? projectId]} />
        <Tabs
          value={tab}
          onChange={(next) => setTab(next as Tab)}
          items={[
            { value: 'content', label: 'Content' },
            { value: 'history', label: 'History' },
            ...(manages
              ? [
                  { value: 'people', label: 'People' },
                  { value: 'settings', label: 'Settings' },
                ]
              : []),
          ]}
        />
      </header>

      {tab === 'content' &&
      content.error instanceof AdminApiError &&
      content.error.code === 'not_found' ? (
        <EmptyState
          title="No content schema yet"
          description="Run ainam push from the website's codebase to create one."
        />
      ) : null}

      {tab === 'content' && content.data && project.data ? (
        <ContentEditor projectId={projectId} view={content.data} project={project.data} />
      ) : null}

      {tab === 'history' && project.data ? (
        <HistoryPanel projectId={projectId} project={project.data} />
      ) : null}

      {tab === 'people' && project.data ? (
        <PeoplePanel organizationId={project.data.organizationId} />
      ) : null}

      {tab === 'settings' && project.data ? <ProjectSettings project={project.data} /> : null}
    </PageShell>
  )
}
