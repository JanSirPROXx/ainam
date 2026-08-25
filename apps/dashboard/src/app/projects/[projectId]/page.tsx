'use client'

import type { EditorView } from '@ainam/schema'
import { Breadcrumb, EmptyState, Eyebrow, Wordmark } from '@ainam/ui'
import { useQuery } from '@tanstack/react-query'
import { use } from 'react'
import { ContentEditor } from '@/components/ContentEditor'
import { AdminApiError, adminFetch } from '@/lib/api'

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)

  const content = useQuery({
    queryKey: ['content', projectId],
    queryFn: () => adminFetch<EditorView>(`/admin/projects/${projectId}/content`),
    retry: false,
  })

  return (
    <main
      style={{
        maxWidth: 'var(--container-md)',
        margin: '0 auto',
        padding: 'var(--space-12) var(--gutter-page)',
        display: 'grid',
        gap: 'var(--space-8)',
      }}
    >
      <header style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <Wordmark />
        <Breadcrumb items={[{ label: 'Projects', href: '/' }, projectId]} />
        <Eyebrow>Content</Eyebrow>
      </header>

      {content.error instanceof AdminApiError && content.error.code === 'not_found' ? (
        <EmptyState
          title="No content schema yet"
          description="Run ainam push from the website's codebase to create one."
        />
      ) : null}

      {content.data ? <ContentEditor projectId={projectId} view={content.data} /> : null}
    </main>
  )
}
