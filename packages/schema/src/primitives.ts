import { z } from 'zod'

/**
 * A BCP-47 language tag, optionally with a region subtag — `de`, `de-CH`, `en`.
 *
 * Locale is part of the content model from day one, even while the dashboard
 * only surfaces a single language. Retrofitting it later would require
 * rewriting every stored content row.
 */
export const localeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Expected a locale like "de" or "de-CH".')

/**
 * A slash-separated content key — `home/hero/title`.
 *
 * Keys are the stable address of a piece of content. They are generated from
 * the website's code by `ainam push` and must survive refactors, so they are
 * lowercase and free of anything that would need escaping in a URL.
 */
export const contentKeySchema = z
  .string()
  .min(1)
  .max(255)
  .regex(
    /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/,
    'Expected a slash-separated key like "home/hero/title".',
  )

/** Opaque server-issued identifier. */
export const idSchema = z.string().min(1).max(64)
