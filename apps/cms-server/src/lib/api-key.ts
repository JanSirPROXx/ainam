import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Marks a key as AINAM's in a customer's .env, and as a secret to any scanner. */
const KEY_PREFIX = 'ainam_sk'
const PREFIX_DISPLAY_LENGTH = 16

export interface GeneratedApiKey {
  /** Shown once, at creation. Never stored. */
  plaintext: string
  hash: string
  /** Leading characters, kept in clear so a key is identifiable in a list. */
  prefix: string
}

/**
 * Hashes a key for storage and lookup.
 *
 * SHA-256 rather than a password hash on purpose: the input is 32 bytes of
 * CSPRNG output, so there is nothing to brute-force and no need for a slow KDF.
 * A slow hash here would put a key-stretching cost on every content read.
 */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = `${KEY_PREFIX}_${randomBytes(32).toString('base64url')}`
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, PREFIX_DISPLAY_LENGTH),
  }
}

/** Constant-time comparison, so a mismatch reveals nothing through timing. */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * A shared secret for publish webhooks and preview links.
 *
 * Kept in clear rather than hashed, unlike an API key: both sides compute an
 * HMAC with it, so the server needs the value itself and not a verifier.
 */
export function generateWebhookSecret(): string {
  return `ainam_whsec_${randomBytes(32).toString('base64url')}`
}
