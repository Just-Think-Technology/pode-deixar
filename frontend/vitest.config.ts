import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' }), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setup: ['./test/setup.ts'],
    css: 'inject',
    transformMode: { normalize: false },
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/frontend',
    },
    include: ['test/**/*.spec.*', 'test/**/*.test.*'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})