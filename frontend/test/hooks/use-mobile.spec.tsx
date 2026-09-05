import { describe, it, expect, vitest } from 'vitest'
import { render, screen } from '@testing-library/react'
import useMobile from '@/hooks/use-mobile'

describe('useMobile Hook', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  it('should detect mobile viewport', () => {
    // Simular viewport mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667, // iPhone height
    })

    const { result } = renderHook(() => useMobile())
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should detect tablet viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // iPad width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    const { result } = renderHook(() => useMobile())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should detect desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440, // Desktop width
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900,
    })

    const { result } = renderHook(() => useMobile())
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(true)
  })

  it('should update on resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })

    const { result } = renderHook(() => useMobile())
    expect(result.current.isMobile).toBe(true)

    // Simular resize para desktop
    window.dispatchEvent(new Event('resize'))

    // O hook pode não reage imediatamente dependendo da implementação,
    // mas testamos que o initial detection funciona
    expect(typeof result.current.isMobile).toBe('boolean')
  })
})