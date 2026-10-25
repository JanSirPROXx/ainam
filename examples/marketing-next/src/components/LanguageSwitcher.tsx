import { LOCALES, LOCALE_NAMES } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

export interface LanguageSwitcherProps {
  current: Locale
  label: string
}

/**
 * Plain links, one per language, each marked with the language it opens.
 *
 * Links rather than a select: the page is static, a link is what a crawler
 * follows to find the other version, and nothing here needs script to work.
 */
export function LanguageSwitcher({ current, label }: LanguageSwitcherProps) {
  return (
    <nav className="lang" aria-label={label}>
      {LOCALES.map((locale) => (
        <a
          key={locale}
          className="lang__link"
          href={`/${locale}`}
          lang={locale}
          hrefLang={locale}
          aria-current={locale === current ? 'true' : undefined}
        >
          {LOCALE_NAMES[locale]}
        </a>
      ))}
    </nav>
  )
}
