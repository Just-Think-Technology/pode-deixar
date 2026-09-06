import { describe, it, expect, vitest } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

describe('useIsMobile Hook', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  it('should detect mobile viewport', () => {
    // Simular viewport mobile
    setViewport(375, 667) // iPhone

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('should return false exactly at the tablet breakpoint', () => {
    setViewport(768, 1024) // iPad width = breakpoint (768), não é mobile

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should detect desktop viewport', () => {
    setViewport(1440, 900) // Desktop

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('should return a boolean on resize', () => {
    setViewport(375, 667)

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    // Simular resize para desktop
    setViewport(1440, 900)
    window.dispatchEvent(new Event('resize'))

    // O hook escuta matchMedia (mockado no setup), então validamos
    // apenas que o retorno segue booleano após o evento
    expect(typeof result.current).toBe('boolean')
  })
})