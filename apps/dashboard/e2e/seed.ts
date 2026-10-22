/**
 * Puts the stack into the state a customer's first day leaves it in.
 *
 * Runs once before the suite, against the running Compose stack: sign up, create
 * a project, mint a key, push a schema. Everything goes through the HTTP APIs a
 * person or the CLI would use rather than through rows or a shell, so the setup
 * itself fails if onboarding breaks — which is the step a customer meets first.
 * The bootstrap command, the other way in, is exercised by `scripts/smoke.sh`.
 */

const CMS = `http://localhost:${process.env['CMS_PORT'] ?? '8787'}`
const ORIGIN = process.env['DASHBOARD_ORIGIN'] ?? `http://localhost:${process.env['DASHBOARD_PORT'] ?? '3000'}`

export const OWNER = { email: 'e2e@example.test', password: 'correct-horse-battery', name: 'E2E' }
export const PROJECT_NAME = 'E2E site'
export const TITLE_KEY = 'home/hero/title'

interface ProjectRow {
  id: string
  name: string
  role: string
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

export default async function seed(): Promise<void> {
  const cookie = await signUpOrIn()
  const projectId = (await findProject(cookie)) ?? (await createProject(cookie))
  await ensureSchema(projectId, cookie)

  // Minted through the admin API rather than reused from an earlier run, so the
  // key-issuing path a developer uses on their first day is exercised before any
  // test runs, and a warm stack behaves like a cold one.
  process.env['E2E_PROJECT_ID'] = projectId
  process.env['E2E_READ_KEY'] = await mintReadKey(projectId, cookie)
}

/** Found by name, so a stack the suite has already touched is reused, not duplicated. */
async function findProject(cookie: string): Promise<string | undefined> {
  const listed = await api('/admin/projects', { cookie })
  if (!listed.ok) throw new Error(`Could not list projects: ${listed.status}`)
  const { projects } = (await listed.json()) as { projects: ProjectRow[] }
  return projects.find((project) => project.name === PROJECT_NAME && project.role === 'owner')?.id
}

async function createProject(cookie: string): Promise<string> {
  const created = await api('/admin/projects', {
    method: 'POST',
    cookie,
    body: JSON.stringify({ name: PROJECT_NAME }),
  })
  if (created.status !== 201) throw new Error(`Could not create the project: ${created.status}`)
  return ((await created.json()) as ProjectRow).id
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

/** A new project has no schema, and the editor needs one. */
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
  const pushed = await fetch(`${CMS}/v1/schema/${projectId}`, {
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
  if (!pushed.ok) throw new Error(`Could not push the schema: ${pushed.status}`)
}

async function signUpOrIn(): Promise<string> {
  for (const path of ['/api/auth/sign-up/email', '/api/auth/sign-in/email']) {
    const response = await api(path, { method: 'POST', body: JSON.stringify(OWNER) })
    const cookie = response.headers.get('set-cookie')
    if (response.ok && cookie) return cookie.split(';')[0] ?? ''
  }
  throw new Error('Could not create or sign in the test owner')
}
