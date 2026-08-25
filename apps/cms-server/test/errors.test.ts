import { z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import { HttpError, refuseInvalidRequest } from '../src/http/errors'

/** What `@hono/zod-openapi` hands its defaultHook when a request fails to parse. */
function failureFor(input: unknown) {
  const result = z.object({ locale: z.string() }).safeParse(input)
  if (result.success) throw new Error('expected this input to fail validation')
  return { success: false as const, error: result.error, data: input }
}

describe('refuseInvalidRequest', () => {
  it('throws the shared envelope rather than letting the validator answer', () => {
    // Without this hook the validator replies in its own `{ success, error }`
    // shape: no code to branch on and no request id to quote.
    let thrown: unknown
    try {
      refuseInvalidRequest(failureFor({}) as never, {} as never)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(HttpError)
    const error = thrown as HttpError
    expect(error.status).toBe(400)
    expect(error.code).toBe('validation_failed')
    expect(error.message).toContain('/openapi.json')
  })

  it('names the field that was wrong, which is the whole content of the answer', () => {
    try {
      refuseInvalidRequest(failureFor({ locale: 7 }) as never, {} as never)
      expect.unreachable('should have thrown')
    } catch (error) {
      expect((error as HttpError).details).toEqual([
        { path: 'locale', message: expect.any(String) },
      ])
    }
  })

  it('passes a successful validation straight through', () => {
    expect(refuseInvalidRequest({ success: true, data: {} } as never, {} as never)).toBeUndefined()
  })
})
