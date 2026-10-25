import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasLocale, pickLocale } from '@/lib/i18n'

/**
 * Sends a visit to the language it should read in.
 *
 * Every page lives under `/en` or `/de`, so a path with no language in front
 * of it has nowhere to land. It is redirected to the best match for the
 * browser's `Accept-Language`, and that answer varies by the header, which
 * is said so a shared cache does not hand one visitor another's language.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''
  if (hasLocale(first)) return NextResponse.next()

  const locale = pickLocale(request.headers.get('accept-language'))
  const target = request.nextUrl.clone()
  target.pathname = `/${locale}${pathname === '/' ? '' : pathname}`

  const response = NextResponse.redirect(target)
  response.headers.set('vary', 'accept-language')
  return response
}

export const config = {
  // Not the API, Next's own files, or anything with an extension (favicon, images).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
