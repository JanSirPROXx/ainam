/**
 * Compares two hex digests without leaking their contents through timing.
 *
 * A plain `===` returns as soon as two bytes differ, which lets an attacker
 * recover a signature one character at a time. Shared by the revalidation and
 * preview handlers because both verify a signature the CMS produced, and one of
 * them quietly using `===` would be invisible in review.
 */
export function digestsMatch(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
