import type { ApiError } from '@ainam/schema'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import type { Auth } from '../src/auth'
import type { Database } from '../src/db/client'
import { loadEnv } from '../src/env'

const env = loadEnv({
  DATABASE_URL: 'postgres://ainam:ainam@localhost:5432/ainam',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
})

// The routes under test never reach the database; a stub keeps the test free of
// a container and makes the failure mode obvious if one ever starts to.
const db = {
  execute: () => Promise.reject(new Error('database unavailable')),
} as unknown as Database

// No signed-in user: the admin API must refuse rather than fall through.
const anonymous = {
  api: { getSession: async () => null },
  handler: async () => new Response(null, { status: 404 }),
} as unknown as Auth

const app = createApp(env, db, anonymous)

describe('error envelope', () => {
  it('answers an unknown route in the shared shape, pointing at the schema', async () => {
    const response = await app.request('/does-not-exist')
    expect(response.status).toBe(404)

    const body = (await response.json()) as ApiError
    expect(body.error.code).toBe('not_found')
    expect(body.error.message).toContain('/openapi.json')
    expect(body.error.requestId).toEqual(expect.any(String))
  })

  it('echoes the request id in a header so it can be quoted in a bug report', async () => {
    const response = await app.request('/does-not-exist')
    const body = (await response.json()) as ApiError
    expect(response.headers.get('x-request-id')).toBe(body.error.requestId)
  })
})

describe('health', () => {
  it('reports degraded rather than failing when the database is unreachable', async () => {
    const response = await app.request('/health')
    expect(response.status).toBe(200)
    // A health endpoint that 500s tells a load balancer to remove the instance;
    // the server itself is fine, its dependency is not.
    await expect(response.json()).resolves.toEqual({ status: 'degraded', database: 'down' })
  })
})

describe('admin API', () => {
  it('refuses an unauthenticated request instead of falling through', async () => {
    const response = await app.request('/admin/projects')
    expect(response.status).toBe(401)

    const body = (await response.json()) as ApiError
    expect(body.error.code).toBe('unauthorized')
    // The dashboard branches on this, so it has to say what to do.
    expect(body.error.message).toContain('sign-in')
  })

  it('leaves the content API on its own credential', async () => {
    // A session must not unlock /v1, and an API key must not unlock /admin.
    const response = await app.request('/v1/content/proj_x')
    expect(response.status).toBe(401)
    const body = (await response.json()) as ApiError
    expect(body.error.message).toContain('Bearer')
  })
})
