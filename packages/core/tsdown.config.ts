import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  // Let tsdown own the package.json "exports" map — hand-written maps drift from
  // the real output and break consumers in ways that only show up after publish.
  exports: true,
  treeshake: true,
  deps: { alwaysBundle: ['@ainam/schema'] },
})
