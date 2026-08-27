#!/usr/bin/env node
/**
 * Fails when a workspace has no test script and has not said why.
 *
 * `pnpm -r run test` skips a workspace with no `test` script without a word, so
 * "all tests pass" quietly meant "all tests that exist pass". apps/dashboard had
 * no runner at all for three milestones, and the defects that reached it were
 * found by opening a browser — including one that disabled Publish entirely.
 *
 * Opting out stays possible; it just has to be written down here with a reason,
 * so a new workspace without tests fails the build instead of disappearing.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['apps', 'packages', 'examples']

const WITHOUT_TESTS = {
  'packages/ui': 'Vendored design-system components: markup and tokens, no logic to assert. The token scanner covers what can drift.',
  'examples/starter-next': 'A template, not a product. The smoke suite renders it and checks its output.',
}

const missing = []

for (const root of ROOTS) {
  if (!existsSync(root)) continue

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const workspace = `${root}/${entry.name}`
    const manifest = join(workspace, 'package.json')
    if (!existsSync(manifest)) continue

    const { scripts = {} } = JSON.parse(readFileSync(manifest, 'utf8'))
    if (scripts.test) continue
    if (workspace in WITHOUT_TESTS) continue

    missing.push(workspace)
  }
}

if (missing.length > 0) {
  console.error(
    `${missing.length} workspace(s) have no test script, and "pnpm test" would skip them silently:\n` +
      missing.map((name) => `  ${name}`).join('\n') +
      '\n\nAdd `"test": "vitest run"`, or record the reason in scripts/check-test-scripts.mjs.',
  )
  process.exit(1)
}

const opted = Object.keys(WITHOUT_TESTS)
console.log(
  `Test scripts: every workspace has one, except ${opted.length} that opted out on purpose (${opted.join(', ')}).`,
)
