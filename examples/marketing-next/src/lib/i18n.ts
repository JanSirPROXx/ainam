export const LOCALES = ['en', 'de'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Each language written in itself, which is how a visitor looks for theirs. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', de: 'Deutsch' }

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Chooses a supported language from an `Accept-Language` header.
 *
 * Quality values decide the order and a region is ignored, so `de-CH` reads as
 * German. Anything unreadable or unsupported gets English, because a redirect
 * that cannot decide must still land somewhere.
 */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag = '', ...parameters] = part.trim().split(';')
      const quality = parameters.map((entry) => entry.trim()).find((entry) => entry.startsWith('q='))
      return {
        language: tag.trim().toLowerCase().split('-')[0] ?? '',
        quality: quality === undefined ? 1 : Number(quality.slice(2)),
      }
    })
    .filter((entry) => entry.language !== '' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality)

  for (const { language } of ranked) {
    if (hasLocale(language)) return language
  }
  return DEFAULT_LOCALE
}
