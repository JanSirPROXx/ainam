/**
 * Refuses to verify anything when no secret is configured.
 *
 * Both handlers derive an HMAC from the project's webhook secret, and Web
 * Crypto rejects an empty key — so without this the site answers a publish
 * notification or a preview link with an opaque 500 and no clue what to fix.
 * Someone debugging a self-hosted deployment at midnight has no access to us:
 * the message has to name the variable.
 */
export function refuseWithoutSecret(secret: string): Response | null {
  if (secret !== '') return null

  return Response.json(
    {
      error:
        'This site has no AINAM_WEBHOOK_SECRET, so it cannot verify anything AINAM signs. ' +
        'Copy the secret from the project settings into the environment and redeploy.',
    },
    { status: 500 },
  )
}
