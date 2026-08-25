'use client'

import { Badge, Card, EmptyState, Eyebrow, Wordmark } from '@ainam/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { adminFetch } from '@/lib/api'
import { useSession } from '@/lib/auth-client'

interface Project {
  id: string
  name: string
  slug: string
  defaultLocale: string
  locales: string[]
  role: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !session) router.replace('/sign-in')
  }, [isPending, session, router])

  const projects = useQuery({
    queryKey: ['projects'],
    enabled: Boolean(session),
    queryFn: () => adminFetch<{ projects: Project[] }>('/admin/projects'),
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark />
        {session ? <Badge tone="neutral">{session.user.email}</Badge> : null}
      </header>

      <Eyebrow>Projects</Eyebrow>

      {projects.data?.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Run ainam push from your website's codebase to create one."
        />
      ) : null}

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {projects.data?.projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} style={{ display: 'block' }}>
            <Card interactive title={project.name} description={`${project.slug} · ${project.locales.join(', ')}`}>
              <Badge tone="neutral">{project.role}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
