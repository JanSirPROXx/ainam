import { defineConfig } from 'tsdown'

export default defineConfig({
  // Two entries on purpose. `types` carries the domain model with no Zod in its
  // import graph, so packages that only need the shapes — the SDK — never drag
  // Zod's declarations into their own .d.ts.
  entry: ['src/index.ts', 'src/types.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  exports: true,
})
