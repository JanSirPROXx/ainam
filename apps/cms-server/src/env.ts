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

  /**
   * `console` prints invitations and password resets to stdout. It is the
   * default so a fresh self-hosted instance can invite someone and reset a
   * password with no mail server and no external account.
   */
  MAIL_TRANSPORT: z.enum(['console', 'smtp']).default('console'),
  SMTP_URL: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default('AINAM <ainam@localhost>'),

  /**
   * `invite-only` refuses to create an account for an email nobody invited,
   * apart from the first account on an empty instance. Left `open` by default
   * because a locked instance with no first user is unusable.
   */
  SIGNUP_MODE: z.enum(['open', 'invite-only']).default('open'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Drops variables that are present but empty.
 *
 * Compose, Kubernetes and most deploy platforms render an unset variable as an
 * empty string rather than omitting it — `SMTP_URL: ${SMTP_URL:-}` is the
 * documented way to make a Compose file work with and without a .env. A schema
 * that only understands "absent" therefore rejects the exact configuration
 * `docker compose up` produces, and the error names a variable the operator
 * never set.
 */
function withoutBlanks(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  )
}

/**
 * Reads and validates configuration once, at startup.
 *
 * Failing here rather than at first use means a misconfigured deployment dies
 * immediately with a list of what is missing, instead of serving traffic until
 * it reaches the one code path that needed the variable.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(withoutBlanks(source))
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

  if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_URL) {
    throw new Error(
      'MAIL_TRANSPORT is "smtp" but SMTP_URL is unset, so invitations and password resets ' +
        'would be accepted and never arrive. Set SMTP_URL, or use MAIL_TRANSPORT=console.',
    )
  }

  return env
}
