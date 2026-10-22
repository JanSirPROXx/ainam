import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CMS_URL_META_NAME, cmsUrlFromEnvironment } from '@/lib/runtime-config'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'AINAM',
  description: 'Edit the content of your site.',
}

// Rendered per request, because the layout reads the container's environment.
// Prerendered at build, it would freeze the address of whatever server built
// the image — the very thing reading it at runtime exists to avoid.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name={CMS_URL_META_NAME} content={cmsUrlFromEnvironment()} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
