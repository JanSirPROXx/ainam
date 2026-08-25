import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ContentSchema } from '@ainam/core'

export const CONFIG_FILE = 'ainam.config.ts'

export interface ProjectContext {
  schema: ContentSchema
  apiKey: string
  projectId: string
  baseUrl: string
}

class ConfigError extends Error {}

/** Reads `.env` if present. Node loads it natively, so this costs no dependency. */
function loadDotEnv(cwd: string): void {
  try {
    process.loadEnvFile(join(cwd, '.env'))
  } catch {
    // Absent or unreadable .env is normal — the values may come from the shell.
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new ConfigError(`Missing ${name}. Set it in .env or in your shell.`)
  }
  return value
}

/**
 * Loads the content schema and the credentials needed to talk to a project.
 *
 * The config is TypeScript and is imported directly: Node strips the types, so
 * the CLI needs no transpiler and `ainam` stays dependency-free.
 */
export async function loadContentSchema(cwd: string): Promise<ContentSchema> {
  const configPath = join(cwd, CONFIG_FILE)
  try {
    await access(configPath)
  } catch {
    throw new ConfigError(`No ${CONFIG_FILE} here. Run "ainam init" first.`)
  }

  const module: unknown = await import(pathToFileURL(configPath).href)
  const schema = (module as { default?: ContentSchema }).default
  if (schema === undefined || typeof schema !== 'object') {
    throw new ConfigError(`${CONFIG_FILE} must export the schema as its default export.`)
  }
  return schema
}

export async function loadProjectContext(cwd: string): Promise<ProjectContext> {
  const schema = await loadContentSchema(cwd)
  loadDotEnv(cwd)
  return {
    schema,
    apiKey: requireEnv('AINAM_API_KEY'),
    projectId: requireEnv('AINAM_PROJECT_ID'),
    baseUrl: (process.env['AINAM_URL'] ?? 'https://cms.ainam.online').replace(/\/+$/, ''),
  }
}
