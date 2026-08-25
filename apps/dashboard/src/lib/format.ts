import type { Author, AuthorNames } from '@ainam/schema'

/**
 * Who made a change.
 *
 * An agent is rendered under its own name rather than as a person: attributing
 * an automated edit to whoever happened to be signed in would make the history
 * actively misleading, which is the one thing a history must not be.
 */
export function authorName(author: Author, people: AuthorNames): string {
  if (author.kind === 'agent') return author.name
  return people[author.id] ?? 'a former member'
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * A timestamp someone can compare against another one.
 *
 * Fixed format rather than "3 minutes ago": history is read to work out the
 * order things happened in, and relative times stop being comparable the moment
 * two of them round to the same phrase.
 *
 * Every part comes from the reader's own clock. Taking the date from
 * `toISOString()` and the time from `toTimeString()` mixes UTC with local time,
 * and an evening publish then shows yesterday's date beside this morning's
 * hour — which looks like the history is out of order.
 */
export function timestamp(iso: string): string {
  const at = new Date(iso)
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  return `${date} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}
