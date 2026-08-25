import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/bootstrap.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  platform: 'node',
})
