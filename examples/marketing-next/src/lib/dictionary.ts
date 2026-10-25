import type { Locale } from './i18n'

/**
 * The words that belong to the markup rather than to the copy.
 *
 * Everything a person would rewrite lives in AINAM. These are the labels of
 * controls and the captions of the publish demo, which change only when the
 * components do, so they are translated here, in code, beside the markup.
 */
export interface Dictionary {
  signIn: string
  language: string
  previewBadge: string
  snapshotBadge: string
  stepsLabel: string
  legal: string
  customers: string
  publish: {
    showDrafts: string
    draft: string
    published: string
    edited: string
    live: string
    unchanged: string
    key: string
    value: string
    /** A template with `{count}`: a function could not cross to the browser with the rest. */
    cards: string
  }
}

const en: Dictionary = {
  signIn: 'Sign in',
  language: 'Language',
  previewBadge: 'preview — unpublished drafts',
  snapshotBadge: 'build-time snapshot',
  stepsLabel: 'Integration steps',
  legal: 'Open source — AGPL-3.0 and MIT',
  customers: 'Customers',
  publish: {
    showDrafts: 'Show drafts',
    draft: 'draft',
    published: 'published',
    edited: 'edited',
    live: 'live',
    unchanged: 'unchanged',
    key: 'Key',
    value: 'Value',
    cards: '{count} cards',
  },
}

const de: Dictionary = {
  signIn: 'Anmelden',
  language: 'Sprache',
  previewBadge: 'Vorschau — unveröffentlichte Entwürfe',
  snapshotBadge: 'Snapshot vom Build',
  stepsLabel: 'Schritte der Einbindung',
  legal: 'Open Source — AGPL-3.0 und MIT',
  customers: 'Kunden',
  publish: {
    showDrafts: 'Entwürfe zeigen',
    draft: 'Entwurf',
    published: 'veröffentlicht',
    edited: 'geändert',
    live: 'live',
    unchanged: 'unverändert',
    key: 'Schlüssel',
    value: 'Wert',
    cards: '{count} Karten',
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, de }

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}
