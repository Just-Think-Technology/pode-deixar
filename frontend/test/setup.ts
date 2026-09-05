/*
 * This file is picked up by Vitest automatically.
 * You can place global mocks or setup logic here.
 */

// jest-dom custom matchers for Vitest
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// @testing-library/jest-dom extends expect automatically on import

// Mock jest functions for vitest compatibility
(globalThis as any).jest = vi

// Mock global This structure if needed
global.ResizeObserver = global.ResizeObserver || function () {
  let callbacks: Array<{ observe: () => void }> = []
  return {
    observe: (el: Element) => {
      callbacks.push({ observe: () => {} })
    },
    disconnect: () => {},
  }
}

// Mock matchMedia
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

// Mock requestAnimationFrame
global.requestAnimationFrame = global.requestAnimationFrame || function (cb: Function) {
  return setTimeout(cb, 0)
}

// Mock cancelAnimationFrame
global.cancelAnimationFrame = global.cancelAnimationFrame || function (id: number) {
  clearTimeout(id)
}