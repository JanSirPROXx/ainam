'use client'

import { Breadcrumb } from '@ainam/ui'
import { NewProjectForm } from '@/components/NewProjectForm'
import { PageShell } from '@/components/PageShell'
import { useRequireSession } from '@/lib/session'

export default function NewProjectPage() {
  const { ready, email } = useRequireSession()

  return (
    <PageShell email={email}>
      <Breadcrumb items={[{ label: 'Projects', href: '/' }, 'New project']} />
      {ready ? <NewProjectForm /> : null}
    </PageShell>
  )
}
