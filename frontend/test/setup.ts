// Vitest global setup — jest-dom matchers and browser API shims for jsdom

// jest-dom custom matchers for Vitest (explicit entry: the bare import does
// not register the matchers on jest-dom 6.10 + vitest 4)
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock jest functions for vitest compatibility
(globalThis as any).jest = vi

global.ResizeObserver = global.ResizeObserver || function () {
  let callbacks: Array<{ observe: () => void }> = []
  return {
    observe: (el: Element) => {
      callbacks.push({ observe: () => {} })
    },
    disconnect: () => {},
  }
}

global.matchMedia = global.matchMedia || function (query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

global.requestAnimationFrame = global.requestAnimationFrame || function (cb: Function) {
  return setTimeout(cb, 0)
}

global.cancelAnimationFrame = global.cancelAnimationFrame || function (id: number) {
  clearTimeout(id)
}