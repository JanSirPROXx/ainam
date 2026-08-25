'use client'

import type { ReactNode } from 'react'
import { Topbar } from './Topbar'

/**
 * The frame every signed-in screen sits in.
 *
 * One place decides the container width and the page rhythm, so two screens
 * cannot disagree about them — the design system treats that as a visual bug,
 * not a detail.
 */
export function PageShell({
  email,
  children,
}: {
  email?: string | undefined
  children: ReactNode
}) {
  return (
    <>
      <Topbar email={email} />
      <main
        style={{
          maxWidth: 'var(--container-lg)',
          margin: '0 auto',
          padding: 'var(--space-10) var(--gutter-page)',
          display: 'grid',
          gap: 'var(--space-8)',
          alignContent: 'start',
        }}
      >
        {children}
      </main>
    </>
  )
}
