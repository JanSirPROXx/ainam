import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './site.css'

export const metadata: Metadata = {
  title: 'AINAM starter',
  description: 'A site whose copy is edited in AINAM.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
