import { execFileSync } from 'node:child_process'

/**
 * Puts the stack into the state a customer's first day leaves it in.
 *
 * Runs once before the suite, against the running Compose stack: bootstrap a
 * project, create an owner, push a schema. Doing it through the real APIs
 * rather than by writing rows means the setup itself would fail if onboarding
 * broke — which is the step a customer meets first.
 */

const CMS = `http://localhost:${process.env['CMS_PORT'] ?? '8787'}`
const ORIGIN = process.env['DASHBOARD_ORIGIN'] ?? `http://localhost:${process.env['DASHBOARD_PORT'] ?? '3000'}`

export const OWNER = { email: 'e2e@example.test', password: 'correct-horse-battery', name: 'E2E' }
export const PROJECT_NAME = 'E2E site'
export const TITLE_KEY = 'home/hero/title'

const REPO_ROOT = new URL('../../../', import.meta.url).pathname

function compose(...args: string[]): string {
  return execFileSync('docker', ['compose', ...args], { cwd: REPO_ROOT, encoding: 'utf8' })
}

async function api(path: string, init?: RequestInit & { cookie?: string }): Promise<Response> {
  return fetch(`${CMS}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      ...(init?.cookie ? { cookie: init.cookie } : {}),
      ...init?.headers,
    },
  })
}

const SLUG = 'e2e-site'

function sql(statement: string): string {
  return compose('exec', '-T', 'postgres', 'psql', '-U', 'ainam', '-d', 'ainam', '-tAc', statement).trim()
}

export default async function seed(): Promise<void> {
  // Resolved by slug rather than "whatever exists": bootstrap refuses to run on
  // a database that already has an organisation, and a stack the smoke suite has
  // touched already does. Taking the first project there silently runs the whole
  // suite against someone else's fixture.
  let projectId = sql(`select id from projects where slug='${SLUG}'`)

  if (!projectId) {
    try {
      const printed = compose(
        'exec', '-T', 'cms-server', 'node', 'dist/bootstrap.mjs',
        '--org', 'E2E org', '--project', PROJECT_NAME, '--slug', SLUG, '--locale', 'en',
      )
      projectId = printed.match(/AINAM_PROJECT_ID=(\S+)/)?.[1] ?? ''
      const apiKey = printed.match(/AINAM_API_KEY=(\S+)/)?.[1] ?? ''
      if (apiKey) await pushSchema(projectId, apiKey)
    } catch {
      // Bootstrap is the only path that creates a project, and it runs once per
      // database. On a warm stack the fixture is inserted directly.
      projectId = `proj_e2e_${Date.now().toString(36)}`
      const organizationId = sql('select id from organizations limit 1')
      sql(
        `insert into projects (id,organization_id,name,slug,default_locale,locales) values ` +
          `('${projectId}','${organizationId}','${PROJECT_NAME}','${SLUG}','en','["en"]'::jsonb)`,
      )
    }
  }
  if (!projectId) throw new Error('No project to run against; is the stack up?')

  const cookie = await signUpOrIn()
  const organizationId = await createOrganisation(cookie)

  // The only step with no admin API behind it: projects are created by
  // bootstrap, which has no organisation to put them in yet.
  compose(
    'exec', '-T', 'postgres', 'psql', '-U', 'ainam', '-d', 'ainam', '-q', '-c',
    `update projects set organization_id='${organizationId}' where id='${projectId}'`,
  )

  // After the move, not before: every admin route resolves a project through
  // the caller's organisation memberships, so a project that is still in
  // someone else's organisation answers 404 to its own owner.
  await ensureSchema(projectId, cookie)

  // Minted through the admin API rather than read from the bootstrap output,
  // so a warm stack works the same as a cold one — and so the key-issuing path
  // a developer uses on their first day is exercised before any test runs.
  process.env['E2E_PROJECT_ID'] = projectId
  process.env['E2E_READ_KEY'] = await mintReadKey(projectId, cookie)
}

async function mintReadKey(projectId: string, cookie: string): Promise<string> {
  const created = await api(`/admin/projects/${projectId}/api-keys`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({ name: `e2e ${Date.now()}`, scopes: ['content:read'] }),
  })
  if (!created.ok) throw new Error(`Could not mint a read key: ${created.status}`)
  return ((await created.json()) as { key: string }).key
}

/** A project inserted directly has no schema, and the editor needs one. */
async function ensureSchema(projectId: string, cookie: string): Promise<void> {
  const view = await api(`/admin/projects/${projectId}/content`, { cookie })
  if (view.ok) return

  const created = await api(`/admin/projects/${projectId}/api-keys`, {
    method: 'POST',
    cookie,
    body: JSON.stringify({ name: `e2e push ${Date.now()}`, scopes: ['content:read', 'schema:write'] }),
  })
  if (!created.ok) throw new Error(`Could not mint a push key: ${created.status}`)
  await pushSchema(projectId, ((await created.json()) as { key: string }).key)
}

async function pushSchema(projectId: string, apiKey: string): Promise<void> {
  await fetch(`${CMS}/v1/schema/${projectId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      defaultLocale: 'en',
      locales: ['en'],
      schema: {
        [TITLE_KEY]: {
          type: 'text',
          label: 'Hero title',
          required: true,
          multiline: false,
          default: 'Content, decoupled.',
        },
      },
    }),
  })
}

async function signUpOrIn(): Promise<string> {
  for (const path of ['/api/auth/sign-up/email', '/api/auth/sign-in/email']) {
    const response = await api(path, { method: 'POST', body: JSON.stringify(OWNER) })
    const cookie = response.headers.get('set-cookie')
    if (response.ok && cookie) return cookie.split(';')[0] ?? ''
  }
  throw new Error('Could not create or sign in the test owner')
}

async function createOrganisation(cookie: string): Promise<string> {
  const created = await api('/api/auth/organization/create', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ name: 'E2E org', slug: `e2e-${Date.now()}` }),
  })
  if (created.ok) return ((await created.json()) as { id: string }).id

  const listed = await api('/api/auth/organization/list', { cookie })
  const organisations = (await listed.json()) as Array<{ id: string }>
  const first = organisations[0]
  if (!first) throw new Error('No organisation to put the project in')
  return first.id
}
