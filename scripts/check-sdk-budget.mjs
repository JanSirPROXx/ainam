#!/usr/bin/env node
/**
 * Enforces what the published SDK promises, instead of trusting discipline.
 *
 * Two claims are load-bearing for anyone installing these packages, and both
 * have been broken before by a change that looked unrelated:
 *
 * - `@ainam/core` has no runtime dependencies. It ends up in every customer's
 *   bundle, and one transitive dependency there becomes their audit output and
 *   their version conflict.
 * - The declaration files stay small. Deriving public types from Zod inferences
 *   once produced a 100 kB .d.ts for a 5 kB client, which slows down every
 *   consumer's editor and build for nothing.
 *
 * Run after a build; the sizes are of what would actually ship.
 */
import { readFileSync, existsSync, statSync } from 'node:fs'

/** Ample headroom over today's size, tight enough to catch a Zod leak. */
const BUDGETS = {
  'packages/core': { declaration: 40_000, runtimeDependencies: 0 },
  'packages/next': { declaration: 40_000, runtimeDependencies: 1 },
  'packages/cli': { declaration: 40_000, runtimeDependencies: 1 },
}

/** Types that must never reach a consumer's declaration files. */
const FORBIDDEN_IN_TYPES = ['better-auth', 'from "zod"', "from 'zod'"]

const problems = []

for (const [workspace, budget] of Object.entries(BUDGETS)) {
  const manifest = JSON.parse(readFileSync(`${workspace}/package.json`, 'utf8'))
  const runtime = Object.keys(manifest.dependencies ?? {})

  if (runtime.length > budget.runtimeDependencies) {
    problems.push(
      `${manifest.name} has ${runtime.length} runtime dependencies (${runtime.join(', ')}), ` +
        `budget is ${budget.runtimeDependencies}. Every one becomes an installing customer's problem.`,
    )
  }

  for (const file of ['dist/index.d.cts', 'dist/index.d.mts']) {
    const path = `${workspace}/${file}`
    if (!existsSync(path)) continue

    const size = statSync(path).size
    if (size > budget.declaration) {
      problems.push(
        `${manifest.name} ${file} is ${size} bytes, over the ${budget.declaration} budget. ` +
          'A declaration file this large usually means a validator inference leaked into the public types.',
      )
    }

    const contents = readFileSync(path, 'utf8')
    for (const forbidden of FORBIDDEN_IN_TYPES) {
      if (contents.includes(forbidden)) {
        problems.push(`${manifest.name} ${file} references ${forbidden}, which must not reach a consumer.`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`The published SDK broke a promise it makes:\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}

const sizes = Object.keys(BUDGETS)
  .map((workspace) => {
    const path = `${workspace}/dist/index.d.cts`
    return existsSync(path) ? `${workspace.split('/')[1]} ${statSync(path).size}B` : null
  })
  .filter(Boolean)

console.log(`SDK budget: within limits (${sizes.join(', ')}), and no validator types in the public API.`)
