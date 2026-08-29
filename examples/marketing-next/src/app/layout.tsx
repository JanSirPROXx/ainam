import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './site.css'

export const metadata: Metadata = {
  title: 'AINAM — the AI-native CMS layer',
  description:
    'Install one package. Every string, image, label and section in your app becomes editable from the AINAM dashboard, without a redeploy.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
