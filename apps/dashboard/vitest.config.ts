import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The components under test render, so they need a DOM.
    environment: 'jsdom',
    // Vitest owns `test/`, Playwright owns `e2e/`. Without this Vitest picks up
    // the browser spec and fails on Playwright's own API.
    include: ['test/**/*.test.{ts,tsx}'],
    globals: false,
    setupFiles: ['./test/setup.ts'],
    /**
     * Fixed, and deliberately not UTC.
     *
     * `timestamp()` formats in the reader's own zone, and the bug it once had —
     * a UTC date beside a local time — is invisible when both are the same. A
     * zone with a real offset is what makes that test able to fail.
     */
    env: { TZ: 'Europe/Zurich' },
  },
  /**
   * Next compiles the JSX itself, so the tsconfig leaves it as `preserve` — and
   * a runner that honours that setting is handed JSX it never compiles. Set on
   * `oxc`, which is what Vite 8 transforms with; the older `esbuild` key is
   * silently ignored here.
   */
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      // The only alias tests need. `@ainam/*` resolves through the workspace
      // links to built output, which is what a deployment loads too — and is
      // why the path map in tsconfig is not duplicated here.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
