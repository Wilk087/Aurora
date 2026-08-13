import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Deliberately separate from vite.config.ts: that config loads
// vite-plugin-electron, which spawns the Electron binary on startup. Tests must
// not do that.
export default defineConfig({
  test: {
    include: ['{src,electron}/**/*.{test,spec}.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
