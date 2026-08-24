import { describe, expect, it } from 'vitest'
import { DEVELOPMENT_AUTH_SECRET, loadEnv } from '../src/env'

const VALID = {
  DATABASE_URL: 'postgres://ainam:ainam@localhost:5432/ainam',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
}

describe('loadEnv', () => {
  it('applies defaults for everything optional', () => {
    const env = loadEnv(VALID)
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 8787,
      BETTER_AUTH_URL: 'http://localhost:8787',
      DASHBOARD_ORIGIN: 'http://localhost:3000',
      RUN_MIGRATIONS_ON_START: true,
    })
  })

  it('lists every problem at once, naming the variable', () => {
    let message = ''
    try {
      loadEnv({ BETTER_AUTH_SECRET: 'too-short' })
    } catch (error) {
      message = error instanceof Error ? error.message : ''
    }
    expect(message).toContain('DATABASE_URL')
    expect(message).toContain('BETTER_AUTH_SECRET')
    expect(message).toContain('.env.example')
  })

  it('coerces PORT from its string environment form', () => {
    expect(loadEnv({ ...VALID, PORT: '9000' }).PORT).toBe(9000)
  })

  it('accepts the development placeholder outside production', () => {
    const env = loadEnv({ ...VALID, BETTER_AUTH_SECRET: DEVELOPMENT_AUTH_SECRET })
    expect(env.BETTER_AUTH_SECRET).toBe(DEVELOPMENT_AUTH_SECRET)
  })

  it('refuses to start in production with the published placeholder', () => {
    // The placeholder ships in .env.example in a public repository, so anyone
    // could forge a session with it.
    expect(() =>
      loadEnv({ ...VALID, NODE_ENV: 'production', BETTER_AUTH_SECRET: DEVELOPMENT_AUTH_SECRET }),
    ).toThrowError(/openssl rand -base64 32/)
  })

  it('allows a real secret in production', () => {
    const env = loadEnv({ ...VALID, NODE_ENV: 'production' })
    expect(env.NODE_ENV).toBe('production')
  })
})
