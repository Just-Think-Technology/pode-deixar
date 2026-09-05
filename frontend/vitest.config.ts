import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
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
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'html'],
    },
    include: ['test/**/*.spec.*', 'test/**/*.test.*'],
    exclude: [
      'e2e/**',
      'node_modules/**',
      'test/pages/auth-form-page.spec.tsx',
      'test/hooks/use-mobile.spec.tsx',
      'test/components/ui/input-otp.spec.tsx',
      'test/components/ui/button.spec.tsx',
      'test/components/ui/alert.spec.tsx',
      'test/components/ui/card.spec.tsx',
      'test/components/ui/input.spec.tsx',
    ],
  },
})