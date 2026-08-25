'use client'

import { Toast } from '@ainam/ui'
import { type ReactNode, useState } from 'react'
import { AdminApiError } from './api'

/**
 * The most specific thing the server said.
 *
 * A validation failure's top-level message describes the endpoint; the details
 * describe the value someone actually typed. Showing the general one would make
 * a wrong URL read as "something is wrong somewhere".
 */
function describe(error: unknown): string {
  if (!(error instanceof AdminApiError)) return String(error)

  const details = error.details ?? []
  if (details.length === 0) return error.message
  return details.map((detail) => `${detail.path}: ${detail.message}`).join(' · ')
}

interface Message {
  tone: 'success' | 'error'
  title: string
  body?: string | undefined
}

/**
 * One transient message per panel.
 *
 * Every panel that writes needs the same three things — say it worked, say what
 * failed, quote the server's own words — and a panel that rolls its own
 * inevitably drops the third. The server's message is written for the person
 * reading it; replacing it with something generic loses the only sentence that
 * says what to do next.
 */
export function useToast(): {
  show: (message: Message) => void
  fail: (title: string) => (error: unknown) => void
  node: ReactNode
} {
  const [message, setMessage] = useState<Message | null>(null)

  return {
    show: setMessage,
    fail: (title: string) => (error: unknown) => {
      setMessage({ tone: 'error', title, body: describe(error) })
    },
    node: message ? (
      <Toast
        tone={message.tone}
        title={message.title}
        description={message.body}
        onDismiss={() => setMessage(null)}
      />
    ) : null,
  }
}
