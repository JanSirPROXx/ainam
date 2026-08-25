import { describe, expect, it } from 'vitest'
import { orderedKeys } from '../src/repositories/editor'

/**
 * The defect this guards: JSONB normalises object key order — by length, then
 * bytes — so reading the order back out of the stored document listed a
 * customer's fields in an order nobody chose. It surfaced as an editor where
 * the hero subtitle sat between two pricing fields.
 */
describe('orderedKeys', () => {
  const schema = {
    'home/hero/eyebrow': {},
    'home/hero/title': {},
    'home/hero/subtitle': {},
    'home/pricing/visible': {},
  }

  it('lists fields the way the developer declared them', () => {
    const declared = [
      'home/hero/eyebrow',
      'home/hero/title',
      'home/hero/subtitle',
      'home/pricing/visible',
    ]
    expect(orderedKeys(schema, declared)).toEqual(declared)
  })

  it('appends a key the recorded order does not know, rather than dropping it', () => {
    // A project pushed before the order was recorded has none at all. Losing a
    // field from the editor would be far worse than showing it last.
    expect(orderedKeys(schema, ['home/hero/title'])).toEqual([
      'home/hero/title',
      'home/hero/eyebrow',
      'home/hero/subtitle',
      'home/pricing/visible',
    ])
  })

  it('ignores a recorded key the schema no longer has', () => {
    expect(orderedKeys({ 'a/b': {} }, ['a/b', 'gone/key'])).toEqual(['a/b'])
  })
})
