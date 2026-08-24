import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:8787'),
  DASHBOARD_ORIGIN: z.string().url().default('http://localhost:3000'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Reads and validates configuration once, at startup.
 *
 * Failing here rather than at first use means a misconfigured deployment dies
 * immediately with a list of what is missing, instead of serving traffic until
 * it hits the one code path that needed the variable.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (result.success) return result.data

  const problems = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(
    `Invalid configuration. Check your .env file against .env.example:\n${problems}`,
  )
}
