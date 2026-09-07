import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' }), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: 'inject',
    transformMode: { normalize: false },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html'],
    },
    include: ['test/**/*.spec.*', 'test/**/*.test.*'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})