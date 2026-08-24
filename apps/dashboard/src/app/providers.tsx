'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  // Created in state so each browser session gets one client, and so a Suspense
  // retry never shares a cache across users during server rendering.
  const [queryClient] = useState(() => new QueryClient())

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
