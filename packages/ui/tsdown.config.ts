import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  // React stays external: bundling it would give a consumer two copies and
  // break hooks.
  deps: { neverBundle: ['react', 'react/jsx-runtime'] },
})
