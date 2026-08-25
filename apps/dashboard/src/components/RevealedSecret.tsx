'use client'

import { Button, Input } from '@ainam/ui'
import { useState } from 'react'

/**
 * A secret shown exactly once.
 *
 * Stated plainly rather than implied by a copy button: someone who closes this
 * without copying has to create another one, and finding that out afterwards is
 * a worse experience than being told first.
 */
export function RevealedSecret({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <p style={{ font: 'var(--type-caption)', color: 'var(--status-warning)' }}>
        Copy this now. It is not shown again — creating another one replaces it.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Input readOnly value={value} style={{ flex: 1 }} onFocus={(e) => e.target.select()} />
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => setCopied(true))
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
