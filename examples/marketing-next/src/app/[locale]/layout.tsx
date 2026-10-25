import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { hasLocale, LOCALES } from '@/lib/i18n'
import '../site.css'

/**
 * The address the site is served from, for absolute links in the page head.
 *
 * Baked in at build, like every static page: it is the one value a deploy has
 * to know about itself. Unset, it is the local development address.
 */
const SITE_URL = process.env['SITE_URL'] ?? 'http://localhost:3300'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
}

// Any other first segment is a 404, not a page in a language we do not have.
export const dynamicParams = false

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

/**
 * The root layout, one per language, so `<html lang>` is true on each page.
 *
 * Screen readers pick their pronunciation from it and search engines their
 * index; a German page announced as English is read aloud wrongly.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(locale)) notFound()

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  )
}
