import { defineConfig } from 'tsdown'

export default defineConfig({
  // Three entries on purpose. `types` carries the domain model with no Zod in
  // its import graph, so packages that only need the shapes — the SDK — never
  // drag Zod's declarations into their own .d.ts. `access` is the only entry
  // that reaches Better Auth, so nothing importing the other two resolves it.
  entry: ['src/index.ts', 'src/types.ts', 'src/access.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  exports: true,
})
