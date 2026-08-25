#!/usr/bin/env node
import { runInit } from './init'
import { runGenerate } from './generate'
import { runPull } from './pull'
import { runPush } from './push'
import { USAGE } from './usage'

const VERSION = '0.0.0'

function readOption(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}

async function main(argv: string[]): Promise<number> {
  const [command] = argv

  if (command === undefined || command === '-h' || command === '--help') {
    process.stdout.write(USAGE)
    return 0
  }
  if (command === '-v' || command === '--version') {
    process.stdout.write(`${VERSION}\n`)
    return 0
  }
  if (command === 'init') {
    return runInit(process.cwd())
  }
  if (command === 'generate') {
    return runGenerate(process.cwd())
  }
  if (command === 'pull') {
    return runPull(process.cwd())
  }
  if (command === 'push') {
    const locales = readOption(argv, '--locales')?.split(',') ?? ['en']
    const defaultLocale = readOption(argv, '--default-locale') ?? locales[0] ?? 'en'
    return runPush(process.cwd(), locales, defaultLocale)
  }

  process.stderr.write(`Unknown command "${command}". Run "ainam --help" to see what is available.\n`)
  return 1
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
