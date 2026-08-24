#!/usr/bin/env node
import { runInit } from './init'
import { USAGE } from './usage'

const VERSION = '0.0.0'

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
