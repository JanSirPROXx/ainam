import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import schema from '../ainam.config'
import { LOCALES } from '@/lib/i18n'

type Field = { type: string; default?: unknown; fields?: Record<string, unknown> }
type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

const fields = schema as unknown as Record<string, Field>
const german = readJson<Record<string, Json>>('content/de.json')
const snapshots = Object.fromEntries(
  LOCALES.map((locale) => [locale, readJson<{ entries: Record<string, Json> }>(`ainam-snapshot.${locale}.json`)]),
) as Record<(typeof LOCALES)[number], { entries: Record<string, Json> }>

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')) as T
}

/** A key has copy to translate when it is not a switch and its default says something. */
function needsTranslation(field: Field): boolean {
  if (field.type === 'boolean') return false
  if (Array.isArray(field.default)) return field.default.length > 0
  return typeof field.default === 'string' && field.default.trim() !== ''
}

describe('content/de.json', () => {
  it('translates every key that has copy, and nothing the schema does not know', () => {
    const wanted = Object.keys(fields).filter((key) => needsTranslation(fields[key]!))
    expect(Object.keys(german).sort()).toEqual(wanted.sort())
  })

  it('gives each list the same fields as the schema, row by row', () => {
    for (const [key, field] of Object.entries(fields)) {
      const translated = german[key]
      if (field.type !== 'list' || !Array.isArray(translated)) continue

      const expected = Object.keys(field.fields ?? {}).sort()
      for (const row of translated as Array<Record<string, Json>>) {
        expect(Object.keys(row).sort(), `${key} row ${JSON.stringify(row).slice(0, 40)}`).toEqual(expected)
      }
    }
  })

  it('keeps as many rows as the English list, so the two pages have the same shape', () => {
    for (const [key, field] of Object.entries(fields)) {
      // An empty list, like the customer names, has nothing to translate.
      if (field.type !== 'list' || !Array.isArray(field.default) || field.default.length === 0) continue
      expect((german[key] as Json[]).length, key).toBe(field.default.length)
    }
  })

  it('never leaves English copy where German belongs', () => {
    // Commands, addresses and brand names are the same in both languages.
    const same = new Set(['home/hero/install'])
    for (const [key, value] of Object.entries(german)) {
      const field = fields[key]!
      if (typeof value === 'string' && field.type === 'text' && !same.has(key)) {
        expect(value, key).not.toBe(field.default)
      }
    }
  })

  it('contains no sharp s: the site is written in Swiss spelling', () => {
    expect(JSON.stringify(german)).not.toContain('ß')
  })
})

describe('the committed snapshots', () => {
  it('cover the same keys, which are the keys of the schema', () => {
    const keys = Object.keys(fields).sort()
    for (const locale of LOCALES) {
      expect(Object.keys(snapshots[locale].entries).sort(), locale).toEqual(keys)
    }
  })

  it('hold the German copy of content/de.json, so the fallback is not stale', () => {
    for (const [key, value] of Object.entries(german)) {
      expect(snapshots.de.entries[key], key).toEqual(value)
    }
  })

  it('hold the schema defaults in English, so the fallback is not stale either', () => {
    for (const [key, field] of Object.entries(fields)) {
      if (field.type === 'image' || field.type === 'richText') continue
      expect(snapshots.en.entries[key], key).toEqual(field.default)
    }
  })
})
