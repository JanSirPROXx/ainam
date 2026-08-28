import { AinamError } from './errors'
import type { ContentSnapshot } from './snapshot'

/** Options accepted by {@link createAinamClient}. */
export interface AinamClientConfig {
  /** Project API key. Read it from the environment; never commit it. */
  apiKey: string
  /** Project the key belongs to, e.g. `proj_8f2a`. */
  projectId: string
  /**
   * Origin of the CMS server this site reads from.
   *
   * Required, and deliberately not defaulted: a default would point somewhere,
   * and a self-hosted site that omitted it would send its project id and API
   * key to whoever that somewhere is. On AINAM Cloud this is
   * `https://cms.ainam.online`.
   */
  baseUrl: string
  /** Locale to read. Defaults to `en`. */
  locale?: string
  /** Build-time content snapshot, served when the CMS is unreachable. */
  snapshot?: ContentSnapshot
  /** Replacement `fetch`, for tests or a custom agent. */
  fetch?: typeof globalThis.fetch
  /** Request timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number
  /**
   * Read unpublished drafts instead of published content.
   *
   * Needs a key carrying `content:read:draft`, which is deliberately not the
   * key a site builds with — that one lives in CI and in every deploy
   * environment, and must not be able to see content nobody has published.
   */
  preview?: boolean
}

export interface ResolvedConfig {
  apiKey: string
  projectId: string
  baseUrl: string
  locale: string
  snapshot: ContentSnapshot | undefined
  fetch: typeof globalThis.fetch
  timeoutMs: number
  preview: boolean
}

const DEFAULT_LOCALE = 'en'
const DEFAULT_TIMEOUT_MS = 5000

const HINTS: Record<string, string> = {
  baseUrl:
    'This is your cms-server origin — https://cms.ainam.online on AINAM Cloud, ' +
    'or wherever you run it yourself. There is no default, because a default ' +
    'would decide where your API key goes.',
}

function required(value: string | undefined, name: string): string {
  if (typeof value === 'string' && value.length > 0) return value

  const hint = HINTS[name]
  throw new AinamError(
    'config_invalid',
    `Missing "${name}". Pass it to createAinamClient(), for example from ` +
      `process.env.AINAM_${name.toUpperCase()}.${hint ? ` ${hint}` : ''}`,
  )
}

/**
 * Validates and fills in client options.
 *
 * Hand-rolled rather than schema-driven on purpose: `@ainam/core` ships with no
 * runtime dependencies, so a validation library here would land in every
 * consumer's bundle for a handful of checks.
 */
export function resolveConfig(config: AinamClientConfig): ResolvedConfig {
  const fetchImpl = config.fetch ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new AinamError(
      'config_invalid',
      'No global fetch available. Use Node 18 or newer, or pass a fetch implementation.',
    )
  }

  return {
    apiKey: required(config.apiKey, 'apiKey'),
    projectId: required(config.projectId, 'projectId'),
    baseUrl: required(config.baseUrl, 'baseUrl').replace(/\/+$/, ''),
    locale: config.locale ?? DEFAULT_LOCALE,
    snapshot: config.snapshot,
    fetch: fetchImpl,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    preview: config.preview ?? false,
  }
}
