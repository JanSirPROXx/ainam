#!/usr/bin/env node
// Enforces the design system's token discipline.
//
// The system ships _adherence.oxlintrc.json for this, but those rules are
// written as ESLint `no-restricted-syntax` selectors and oxlint does not
// implement that rule. Rather than add a second linter to the toolchain for
// three checks, they are implemented directly here.
//
// Prop contracts and variant enums are deliberately NOT checked: the components
// are TypeScript now, so tsc enforces them earlier and with better messages.
// See packages/ui/ADHERENCE.md.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const HEX = /#[0-9a-fA-F]{3,8}\b/
// Parse the declaration value rather than using a lookahead: `\s*` backtracks
// past a negative lookahead, so /font-family:\s*(?!var\()/ matches even when the
// value IS var(...). Caught by this script reporting seven false positives.
const FONT_DECL = /font-family\s*:\s*([^;]+)/i
const ALLOWED_FONT = /^var\(--font-(?:sans|mono)\)$/

/** Files that are allowed to contain raw values, because they define them. */
const TOKEN_SOURCES = ['packages/ui/styles/tokens/']

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry === '.git') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else yield path
  }
}

const violations = []

for (const path of walk(ROOT)) {
  const rel = relative(ROOT, path)
  if (TOKEN_SOURCES.some((prefix) => rel.startsWith(prefix))) continue

  const isStyleFile = rel.endsWith('.css')
  const isComponent = rel.endsWith('.tsx')
  if (!isStyleFile && !isComponent) continue

  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((line, index) => {
    const where = `${rel}:${index + 1}`
    if (HEX.test(line)) {
      violations.push(`${where}  raw hex colour — use a colour token via var()`)
    }
    if (isStyleFile) {
      const declaration = FONT_DECL.exec(line)
      if (declaration && !ALLOWED_FONT.test(declaration[1].trim())) {
        violations.push(
          `${where}  font-family "${declaration[1].trim()}" — use var(--font-sans) or var(--font-mono)`,
        )
      }
    }
  })
}

if (violations.length > 0) {
  console.error(`Design system adherence: ${violations.length} violation(s)\n`)
  for (const violation of violations) console.error(`  ${violation}`)
  console.error('\nValues belong in packages/ui/styles/tokens/, referenced with var().')
  process.exit(1)
}

console.log('Design system adherence: clean')
