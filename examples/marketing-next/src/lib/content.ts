import type { AinamContent } from '../../ainam.gen'
import { ainam } from './ainam'

export type ContentReader = <K extends keyof AinamContent>(key: K) => AinamContent[K]

/**
 * Wraps a content map in a reader that fails loudly on a missing key.
 *
 * The generated type says every key is present; the wire does not have to
 * agree. Without this check a key that has not been pushed yet reads as
 * `undefined` and fails inside whichever component happened to render it — a
 * `map` of undefined, several files from the cause. Found exactly that way,
 * against a project whose schema had not been pushed.
 */
export function createReader(content: AinamContent): ContentReader {
  return <K extends keyof AinamContent>(key: K): AinamContent[K] => {
    const value = content[key] as AinamContent[K] | undefined
    if (value === undefined) {
      throw new Error(
        `No published content for "${String(key)}". Run "ainam push" if the key is new.`,
      )
    }
    return value
  }
}

/**
 * Reads the whole project once.
 *
 * `getAll` rather than a `get` per key: this page renders nearly every key, and
 * the client coalesces concurrent reads into one request either way.
 */
export async function loadContent(): Promise<ContentReader> {
  return createReader(await ainam.getAll())
}
