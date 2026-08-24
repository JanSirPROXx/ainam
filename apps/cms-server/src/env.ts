import { z } from 'zod'

/**
 * The placeholder shipped in `.env.example` so a clean checkout boots.
 *
 * It is published in a public repository, so anyone can forge a session with it.
 * Treating it as a value rather than a comment lets the production guard below
 * reject it by identity instead of by guessing at what looks insecure.
 */
export const DEVELOPMENT_AUTH_SECRET = 'development-only-secret-not-for-any-deployment'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default('http://localhost:8787'),
  DASHBOARD_ORIGIN: z.url().default('http://localhost:3000'),
  RUN_MIGRATIONS_ON_START: z
    .stringbool()
    .default(true)
    .describe('Set false when a deploy pipeline applies migrations as its own step.'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Reads and validates configuration once, at startup.
 *
 * Failing here rather than at first use means a misconfigured deployment dies
 * immediately with a list of what is missing, instead of serving traffic until
 * it reaches the one code path that needed the variable.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid configuration. Check your .env against .env.example:\n${problems}`)
  }

  const env = result.data
  if (env.NODE_ENV === 'production' && env.BETTER_AUTH_SECRET === DEVELOPMENT_AUTH_SECRET) {
    throw new Error(
      'BETTER_AUTH_SECRET is still the development placeholder from .env.example, which is ' +
        'public. Anyone could forge a session. Generate a real one with: openssl rand -base64 32',
    )
  }

  return env
}
