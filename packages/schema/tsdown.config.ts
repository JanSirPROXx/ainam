import { defineConfig } from 'tsdown'

export default defineConfig({
  // Four entries on purpose. `types` carries the domain model with no Zod in
  // its import graph, so packages that only need the shapes — the SDK — never
  // drag Zod's declarations into their own .d.ts. `rich-text` is the node
  // allowlist and the link-safety check, which the SDK's renderers need at
  // runtime and which must exist in exactly one place. `access` is the only
  // entry that reaches Better Auth, so nothing importing the others resolves it.
  entry: ['src/index.ts', 'src/types.ts', 'src/rich-text.ts', 'src/access.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  exports: true,
})
