/**
 * Computes the signature sent with a publish webhook.
 *
 * An HMAC over the body, not the shared secret itself: a bare secret in a
 * header is replayable by anything that sees one delivery, and gives no
 * assurance that the body was not altered in between. Exported from the SDK so
 * the server and the receiving site cannot drift apart on how it is derived.
 *
 * Uses Web Crypto, which is available in Node 18+, the Edge runtime and the
 * browser — the SDK has no runtime dependencies and this must not add one.
 */
export async function signWebhookBody(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
