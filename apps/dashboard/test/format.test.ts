import { describe, expect, it } from 'vitest'
import { authorName, timestamp } from '@/lib/format'

describe('timestamp', () => {
  it('takes every part from one clock', () => {
    // The defect this guards: the date came from toISOString (UTC) and the time
    // from toTimeString (local). An evening publish then showed yesterday's
    // date beside this morning's hour, and the history looked out of order.
    //
    // 23:22 UTC is the next day in Europe/Zurich, which is why the suite fixes
    // that zone — in UTC this test cannot fail.
    expect(timestamp('2026-08-25T23:22:00.000Z')).toBe('2026-08-26 01:22')
  })

  it('reads back as the instant it was given', () => {
    // The property behind the case above, stated so it holds for any input:
    // parsing the output as a local time must land on the same minute.
    for (const iso of ['2026-01-05T22:59:00.000Z', '2026-08-25T23:22:00.000Z', '2026-12-31T23:59:00.000Z']) {
      const [date, time] = timestamp(iso).split(' ')
      const readBack = new Date(`${date}T${time}:00`)
      expect(`${iso}: ${Math.abs(readBack.getTime() - new Date(iso).getTime())}`).toBe(`${iso}: 0`)
    }
  })

  it('pads every part, so timestamps line up in a column', () => {
    expect(timestamp('2026-01-05T07:03:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})

describe('authorName', () => {
  it('renders an agent under its own name', () => {
    // An automated edit attributed to whoever happened to be signed in would
    // make the history actively misleading, which is the one thing it must not
    // be.
    expect(authorName({ kind: 'agent', name: 'ainam push' }, {})).toBe('ainam push')
  })

  it('resolves a person through the names the page carries', () => {
    expect(authorName({ kind: 'user', id: 'usr_1' }, { usr_1: 'Ada' })).toBe('Ada')
  })

  it('says what it can when someone has left the organisation', () => {
    // Their edits are still in the history, and a raw id there is unreadable.
    expect(authorName({ kind: 'user', id: 'usr_gone' }, {})).toBe('a former member')
  })
})
