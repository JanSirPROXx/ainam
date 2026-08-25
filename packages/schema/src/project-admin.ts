import { z } from 'zod'
import { idSchema, localeSchema } from './primitives'

/**
 * A project as the dashboard sees it.
 *
 * The webhook *secret* is deliberately absent: it is stored so publishes can be
 * signed, and a browser has no use for it. Routes map fields explicitly rather
 * than spreading a repository row, so adding a column cannot leak it here.
 */
export const projectSummarySchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  organizationName: z.string(),
  name: z.string(),
  slug: z.string(),
  defaultLocale: localeSchema,
  locales: z.array(localeSchema),
  role: z.string(),
  webhookUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
})

/** An empty string clears a URL; omitting the field leaves it untouched. */
const clearableUrl = z.union([z.url(), z.literal('')]).optional()

export const updateProjectRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    webhookUrl: clearableUrl,
    previewUrl: clearableUrl,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to change.',
  })

export const previewLinkSchema = z.object({
  url: z.url(),
  expiresAt: z.iso.datetime(),
})
