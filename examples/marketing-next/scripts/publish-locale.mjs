#!/usr/bin/env node
/**
 * Publishes the copy in `content/<locale>.json` to one language of a project.
 *
 *   AINAM_URL=… AINAM_DASHBOARD=… AINAM_PROJECT_ID=… AINAM_EMAIL=… AINAM_PASSWORD=… \
 *     node scripts/publish-locale.mjs de
 *
 * Why this exists: a content default is one value, and `ainam push` seeds it
 * into every language the project has, so a translation cannot be a default.
 * It has to be an edit, and an API key cannot edit content — only a person can.
 * This signs in as one, saves the translations as drafts and publishes them,
 * which is what the dashboard would do if it could switch language.
 *
 * `AINAM_DASHBOARD` is the dashboard's address, sent as the `Origin`. Node's
 * `fetch` announces itself like a browser, and the sign-in then insists on an
 * origin the server trusts; `curl` does not, which is why this is easy to miss.
 *
 * Safe to run again: a key whose draft already says the same is left alone, so
 * a rerun with nothing changed publishes nothing.
 */
import { readFile } from 'node:fs/promises'

const locale = process.argv[2]
if (!locale) fail('Name the language to publish, for example: node scripts/publish-locale.mjs de')

const base = required('AINAM_URL').replace(/\/+$/, '')
const dashboard = required('AINAM_DASHBOARD').replace(/\/+$/, '')
const projectId = required('AINAM_PROJECT_ID')
const email = required('AINAM_EMAIL')
const password = required('AINAM_PASSWORD')

const file = new URL(`../content/${locale}.json`, import.meta.url)
const translations = JSON.parse(await readFile(file, 'utf8'))

const cookie = await signIn()
const view = await call('GET', `/admin/projects/${projectId}/content?locale=${locale}`, undefined, cookie)

const known = new Map(view.entries.map((entry) => [entry.key, entry]))
const unknown = Object.keys(translations).filter((key) => !known.has(key))
if (unknown.length > 0) {
  fail(
    `The project has no key ${unknown.join(', ')}. Run "ainam push --locales en,${locale}" first, ` +
      'so the keys and the language exist.',
  )
}

const changes = Object.entries(translations)
  .map(([key, value]) => ({ key, value, entry: known.get(key) }))
  .filter(({ value, entry }) => canonical(entry.draft?.value) !== canonical(value))

if (changes.length === 0) {
  console.log(`Nothing to do: every ${locale} draft already says what content/${locale}.json says.`)
  process.exit(0)
}

await call(
  'PATCH',
  `/admin/projects/${projectId}/content`,
  {
    locale,
    entries: changes.map(({ key, value, entry }) => ({
      key,
      value,
      expectedVersion: entry.draft?.version ?? 0,
    })),
  },
  cookie,
)
const result = await call('POST', `/admin/projects/${projectId}/publish`, { locale }, cookie)

console.log(`Published ${result.published.length} ${locale} keys. Webhook: ${result.webhook}.`)

async function signIn() {
  const response = await fetch(`${base}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: dashboard },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) fail(`Could not sign in as ${email} (HTTP ${response.status}). Check AINAM_EMAIL and AINAM_PASSWORD.`)
  return (response.headers.getSetCookie?.() ?? []).map((entry) => entry.split(';')[0]).join('; ')
}

async function call(method, path, body, session) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', origin: dashboard, cookie: session },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) fail(`${method} ${path} answered ${response.status}: ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

/**
 * A string that is the same for equal JSON whatever order its keys came in.
 *
 * The database stores content as JSONB, which reorders object keys on the way
 * back, so comparing `JSON.stringify` output reports a change on every rerun.
 */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function required(name) {
  const value = process.env[name]
  if (!value) fail(`Set ${name}.`)
  return value
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
