import type { ContentValue } from '@ainam/schema/types'
import type { ResolvedConfig } from './config'
import { AinamError } from './errors'

export type ContentMap = Record<string, ContentValue>

function describeStatus(status: number, projectId: string): AinamError {
  if (status === 401 || status === 403) {
    return new AinamError(
      'unauthorized',
      `The API key was rejected. Check AINAM_API_KEY and that the key belongs to project ${projectId}.`,
      { status },
    )
  }
  if (status === 404) {
    return new AinamError(
      'not_found',
      `Project ${projectId} was not found on this server. Check projectId and baseUrl.`,
      { status },
    )
  }
  return new AinamError('server', `The CMS server returned ${status}.`, { status })
}

/** Fetches every published entry for the configured project and locale. */
export async function fetchContent(config: ResolvedConfig): Promise<ContentMap> {
  const url = `${config.baseUrl}/v1/content/${encodeURIComponent(config.projectId)}?locale=${encodeURIComponent(config.locale)}`

  let response: Response
  try {
    response = await config.fetch(url, {
      headers: { authorization: `Bearer ${config.apiKey}`, accept: 'application/json' },
      signal: AbortSignal.timeout(config.timeoutMs),
    })
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError'
    throw new AinamError(
      timedOut ? 'timeout' : 'network',
      timedOut
        ? `The CMS server at ${config.baseUrl} did not respond within ${config.timeoutMs}ms.`
        : `Could not reach the CMS server at ${config.baseUrl}.`,
      { cause },
    )
  }

  if (!response.ok) throw describeStatus(response.status, config.projectId)

  return (await response.json()) as ContentMap
}
