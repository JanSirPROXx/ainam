import { access, appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const CONFIG_FILE = 'ainam.config.ts'

const CONFIG_TEMPLATE = `import { defineContentSchema } from '@ainam/core'

/**
 * Every piece of content this site exposes to the dashboard.
 *
 * Run \`ainam push\` after changing it, then \`ainam pull\` to regenerate types.
 */
export default defineContentSchema({
  'home/hero/title': {
    type: 'text',
    label: 'Hero title',
    required: true,
    multiline: false,
    // Every key needs a default. It is seeded on push, so the site renders real
    // copy from the first deploy instead of waiting for someone to type it in.
    default: 'Content, decoupled',
  },
  'home/hero/subtitle': {
    type: 'text',
    label: 'Hero subtitle',
    required: false,
    multiline: true,
    default: 'Ship the site. Hand the copy to whoever owns it.',
  },
  'home/pricing/visible': {
    type: 'boolean',
    label: 'Show the pricing section',
    required: false,
    default: true,
  },
})
`

const ENV_TEMPLATE = `
# AINAM — https://github.com/JanSirPROXx/ainam
AINAM_API_KEY=
AINAM_PROJECT_ID=
AINAM_WEBHOOK_SECRET=
`

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Scaffolds `ainam.config.ts` and the environment keys a project needs.
 *
 * Existing files are never overwritten — a rerun in a configured project should
 * report what is already there rather than discard someone's schema.
 */
export async function runInit(cwd: string): Promise<number> {
  const configPath = join(cwd, CONFIG_FILE)

  if (await exists(configPath)) {
    process.stdout.write(`${CONFIG_FILE} already exists. Nothing to do.\n`)
    return 0
  }

  await writeFile(configPath, CONFIG_TEMPLATE, 'utf8')
  process.stdout.write(`Created ${CONFIG_FILE}\n`)

  const envExamplePath = join(cwd, '.env.example')
  await appendFile(envExamplePath, ENV_TEMPLATE, 'utf8')
  process.stdout.write(`Added AINAM keys to .env.example\n`)

  process.stdout.write('\nNext: set AINAM_API_KEY and AINAM_PROJECT_ID in your .env file.\n')
  return 0
}
