import type { AuthorNames } from '@ainam/schema'
import { describe, expect, it } from 'vitest'
import { publishOutcome } from '@/components/publish-outcome'
import { mergeHistoryPages, withCursor } from '@/lib/history'
import { count } from '@/lib/plural'

describe('count', () => {
  it('does not say "1 changes"', () => {
    // The design system holds copy to the same standard as layout, and a button
    // reading "Save 1 changes" reads as unfinished software.
    expect(count(1, 'change')).toBe('1 change')
    expect(count(2, 'change')).toBe('2 changes')
    expect(count(0, 'change')).toBe('0 changes')
  })
})

describe('publishOutcome', () => {
  it('says nothing changed rather than claiming a publish', () => {
    expect(publishOutcome(0, 'skipped')).toMatchObject({ title: 'Nothing to publish' })
  })

  it('says the site may still show the old text when delivery failed', () => {
    // "Published but the page still shows the old text" is the most confusing
    // thing that can happen to someone editing a site, and the answer belongs
    // in the message rather than a log nobody reads.
    const outcome = publishOutcome(2, 'failed')
    expect(outcome.tone).toBe('error')
    expect(outcome.body).toContain('previous version')
  })

  it('explains a missing webhook instead of leaving it silent', () => {
    expect(publishOutcome(1, 'not-configured').body).toContain('next build')
  })

  it('stays quiet when the site was told and answered', () => {
    expect(publishOutcome(1, 'delivered')).toEqual({ tone: 'success', title: 'Published 1 key' })
  })

  it('uses the verb it was given, so a rollback does not read as a publish', () => {
    expect(publishOutcome(1, 'delivered', 'Restored').title).toBe('Restored 1 key')
  })
})

describe('mergeHistoryPages', () => {
  it('keeps the author names from every page, not just the last', () => {
    // Resolved per page, so a list spanning several pages loses the older rows'
    // authors unless the maps are merged.
    const pages = [
      { rows: ['a'], people: { usr_1: 'Ada' } as AuthorNames },
      { rows: ['b'], people: { usr_2: 'Bo' } as AuthorNames },
    ]
    expect(mergeHistoryPages(pages, (page) => page.rows)).toEqual({
      items: ['a', 'b'],
      people: { usr_1: 'Ada', usr_2: 'Bo' },
    })
  })

  it('copes with nothing loaded yet', () => {
    expect(mergeHistoryPages(undefined, () => [])).toEqual({ items: [], people: {} })
  })
})

describe('withCursor', () => {
  it('leaves the first page alone and escapes the rest', () => {
    expect(withCursor('/a?locale=en', null)).toBe('/a?locale=en')
    expect(withCursor('/a?locale=en', '123.pub_x')).toBe('/a?locale=en&cursor=123.pub_x')
    expect(withCursor('/a?locale=en', 'a b')).toBe('/a?locale=en&cursor=a%20b')
  })
})
