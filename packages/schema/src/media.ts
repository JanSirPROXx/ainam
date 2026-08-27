import { z } from 'zod'
import { idSchema } from './primitives'

/**
 * The limits an upload is held to.
 *
 * Declared here because both sides need the same numbers: the server enforces
 * them, and the dashboard states them in its copy before someone picks a file.
 * A limit the interface does not name is one people discover by hitting it.
 */

/** Generous for a hero image, small enough that one upload cannot fill a disk. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/**
 * The formats we accept, decided from the decoded header rather than from the
 * filename or the declared Content-Type — both are caller-supplied.
 *
 * SVG is absent on purpose. It can carry script, so a stored SVG is stored XSS
 * on whatever origin serves the customer's site.
 */
export const ACCEPTED_IMAGE_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif'] as const

export type AcceptedImageFormat = (typeof ACCEPTED_IMAGE_FORMATS)[number]

/** Written to on the long edge. Bigger than any layout needs, small enough to serve. */
export const MAX_STORED_DIMENSION = 2400

/**
 * The ceiling libvips decodes to.
 *
 * Without it a 4 kB PNG can expand to gigabytes in memory and take the whole
 * content read path down with it — the file is small, so no byte cap catches it.
 */
export const MAX_INPUT_PIXELS = 50_000_000

export function describeBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`
}

export const imageVariantSchema = z.object({
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const resolvedImageSchema = z.object({
  assetId: idSchema,
  alt: z.string().max(500),
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  variants: z.array(imageVariantSchema).optional(),
  placeholder: z.string().optional(),
})

export const assetSummarySchema = z.object({
  id: idSchema,
  filename: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  url: z.string(),
  createdAt: z.iso.datetime(),
})

export const assetPageSchema = z.object({
  assets: z.array(assetSummarySchema),
  storedBytes: z.number().int().nonnegative(),
})
