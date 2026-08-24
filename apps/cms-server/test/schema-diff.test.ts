import type { ContentSchema } from '@ainam/schema'
import { describe, expect, it } from 'vitest'
import { diffContentSchemas } from '../src/lib/schema-diff'

const title = {
  type: 'text',
  label: 'Hero title',
  required: true,
  multiline: false,
  default: 'Content, decoupled',
} as const

describe('diffContentSchemas', () => {
  it('reports a key the project has never seen as added', () => {
    expect(diffContentSchemas({}, { 'home/hero/title': title })).toEqual({
      added: ['home/hero/title'],
      updated: [],
      removed: [],
    })
  })

  it('reports nothing when the same schema is pushed twice', () => {
    const schema: ContentSchema = { 'home/hero/title': title }
    expect(diffContentSchemas(schema, schema)).toEqual({ added: [], updated: [], removed: [] })
  })

  it('ignores key order, because JSONB does not preserve it', () => {
    // This is what the stored copy looks like after a round trip through
    // Postgres: same field, different key order. Comparing serialised forms
    // naively would report it as changed on every single push.
    const fromDatabase: ContentSchema = {
      'home/hero/title': {
        label: 'Hero title',
        default: 'Content, decoupled',
        type: 'text',
        multiline: false,
        required: true,
      },
    }
    expect(diffContentSchemas(fromDatabase, { 'home/hero/title': title }).updated).toEqual([])
  })

  it('reports a genuine change to a field definition', () => {
    const changed = { ...title, label: 'Headline' }
    expect(diffContentSchemas({ 'home/hero/title': title }, { 'home/hero/title': changed })).toEqual(
      { added: [], updated: ['home/hero/title'], removed: [] },
    )
  })

  it('reports a key that disappeared, so a mistaken push is visible', () => {
    expect(diffContentSchemas({ 'home/hero/title': title }, {}).removed).toEqual([
      'home/hero/title',
    ])
  })

  it('sorts each list, so two runs of the same push read identically', () => {
    const next: ContentSchema = { 'b/two': title, 'a/one': title }
    expect(diffContentSchemas({}, next).added).toEqual(['a/one', 'b/two'])
  })
})
