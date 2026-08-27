import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

/**
 * Renders a component with the providers the app wraps it in.
 *
 * A fresh client per call, so one test's cached query cannot answer the next
 * one's. Retries are off: a component that fails to fetch should fail the test
 * immediately rather than after three silent attempts.
 */
export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  function Providers({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  return render(ui, { wrapper: Providers })
}
