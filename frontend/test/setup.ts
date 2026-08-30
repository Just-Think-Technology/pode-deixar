/*
 * This file is picked up by Vitest automatically.
 * You can place global mocks or setup logic here.
 */

// jest-dom custom matchers podem ser adicionados aqui se desejar
import '@testing-library/jest-dom'

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
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
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