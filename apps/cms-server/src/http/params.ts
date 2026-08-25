import { z } from '@hono/zod-openapi'

/**
 * A project id in the path.
 *
 * Declared once because both API surfaces address projects the same way: the
 * admin API from a session, the content API from a key. Two definitions that
 * drifted would let one surface accept an id the other rejects.
 */
export const projectParams = z.object({ projectId: z.string().min(1) })
