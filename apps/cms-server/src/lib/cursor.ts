/**
 * Positions in the history listings.
 *
 * A cursor names the row a page stopped at, not how many rows were skipped:
 * history is appended to while it is being read, and an offset would repeat or
 * drop a row every time a publish landed between two requests.
 */

export interface PublishCursor {
  at: Date
  publishId: string
}

/**
 * Millisecond precision is exact here, not approximate: every history row is
 * written with a timestamp produced in Node, so nothing in the column carries
 * sub-millisecond digits. If a row ever gets its timestamp from Postgres
 * instead, this comparison starts skipping rows and this is the reason why.
 */
export function encodePublishCursor(at: Date, publishId: string): string {
  return `${at.getTime()}.${publishId}`
}

export function decodePublishCursor(raw: string): PublishCursor | undefined {
  const separator = raw.indexOf('.')
  if (separator < 1) return undefined

  const millis = Number(raw.slice(0, separator))
  const publishId = raw.slice(separator + 1)
  if (!Number.isSafeInteger(millis) || publishId === '') return undefined

  return { at: new Date(millis), publishId }
}

export function decodeVersionCursor(raw: string): number | undefined {
  const version = Number(raw)
  return Number.isSafeInteger(version) && version > 0 ? version : undefined
}
