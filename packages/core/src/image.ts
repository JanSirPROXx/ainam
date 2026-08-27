import type { ResolvedImage } from '@ainam/schema/types'

/** What an `<img>` needs, and nothing more. */
export interface AinamImageProps {
  src: string
  width: number
  height: number
  alt: string
}

/**
 * Turns a resolved image into image props.
 *
 * Props rather than a component, so `@ainam/core` stays free of React and of
 * every other runtime dependency. Spread it onto an `<img>` or onto
 * `next/image` — both take the same four attributes.
 *
 * Returns null for a key whose image has never been uploaded, which is the one
 * legitimately absent field kind. Rendering nothing is correct there; inventing
 * a placeholder would put an image on a customer's page that nobody chose.
 *
 * @example
 * ```tsx
 * const hero = await ainam.get('home/hero/image')
 * const props = ainamImageProps(hero)
 * return props ? <img {...props} /> : null
 * ```
 */
export function ainamImageProps(
  value: ResolvedImage | null | undefined,
): AinamImageProps | null {
  if (!value?.url) return null

  return {
    src: value.url,
    width: value.width,
    height: value.height,
    alt: value.alt,
  }
}
