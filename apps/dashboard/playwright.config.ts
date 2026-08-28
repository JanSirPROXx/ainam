import { defineConfig, devices } from '@playwright/test'

const DASHBOARD_PORT = process.env['DASHBOARD_PORT'] ?? '3000'
const STACK_ROOT = new URL('../../', import.meta.url).pathname

/**
 * Drives the real stack, not a mock.
 *
 * The unit tests already cover what a component does with the data it is given.
 * What they cannot cover is whether the browser, the admin API, Postgres and the
 * object store agree — and every defect that reached this dashboard did so
 * through that gap.
 *
 * Chromium only: this proves the flow works, not that it works in five engines.
 * Adding browsers costs CI minutes on every push and has never been how a bug
 * here was found.
 */
export default defineConfig({
  testDir: './e2e',
  // The flow is inherently sequential — sign in, edit, publish, roll back — and
  // two workers would race each other's content.
  workers: 1,
  fullyParallel: false,
  // A retry hides a flake; this suite is meant to be trustworthy or removed.
  retries: 0,
  timeout: 30_000,
  reporter: process.env['CI'] ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: `http://localhost:${DASHBOARD_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  globalSetup: './e2e/seed.ts',

  webServer: {
    // The same command the README gives a self-hoster. A mock here would prove
    // the dashboard renders, which is the part already covered.
    command: 'docker compose up -d --wait --wait-timeout 600',
    cwd: STACK_ROOT,
    url: `http://localhost:${DASHBOARD_PORT}`,
    reuseExistingServer: true,
    timeout: 600_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
