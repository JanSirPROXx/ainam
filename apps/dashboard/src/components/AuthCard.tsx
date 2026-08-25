'use client'

import { Card, Wordmark } from '@ainam/ui'
import type { ReactNode } from 'react'

/**
 * The frame the five signed-out screens share.
 *
 * One place decides how they look, so sign-in and accept-invitation cannot
 * drift into looking like two different products — which is exactly what an
 * invited client sees first.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string | undefined
  children: ReactNode
  footer?: ReactNode | undefined
}) {
  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100dvh',
        padding: 'var(--space-7)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380, display: 'grid', gap: 'var(--space-8)' }}>
        <Wordmark />
        <Card title={title} description={description} footer={footer}>
          {children}
        </Card>
      </div>
    </main>
  )
}
