// withTokenRefresh spec — single helper via interface, no duplication

import { describe, it, expect, vi } from 'vitest'
import { ApiError } from '@/api/client/http'
import { withTokenRefresh, type TokenRefreshDeps } from '@/api/client/with-token-refresh'

function makeDeps(overrides: Partial<TokenRefreshDeps> = {}): TokenRefreshDeps & { getAccessToken: ReturnType<typeof vi.fn>, refreshSession: ReturnType<typeof vi.fn> } {
  return {
    getAccessToken: vi.fn().mockResolvedValue('tok-1'),
    refreshSession: vi.fn().mockResolvedValue({ access_token: 'tok-2' }),
    isUnauthorizedError: (err: unknown) => err instanceof ApiError && err.status === 401,
    ...overrides,
  } as any
}

describe('withTokenRefresh (interface)', () => {
  it('calls fn with the current token', async () => {
    const deps = makeDeps()
    const fn = vi.fn().mockResolvedValue('ok')

    const result = await withTokenRefresh(fn, deps)

    expect(result).toBe('ok')
    expect(deps.getAccessToken).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('tok-1')
    expect(deps.refreshSession).not.toHaveBeenCalled()
  })

  it('refreshes and retries once on 401', async () => {
    const deps = makeDeps()
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Sessão expirada', 401))
      .mockResolvedValueOnce('retried')

    const result = await withTokenRefresh(fn, deps)

    expect(result).toBe('retried')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'tok-1')
    expect(fn).toHaveBeenNthCalledWith(2, 'tok-2')
    expect(deps.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('throws when no token is available', async () => {
    const deps = makeDeps({ getAccessToken: vi.fn().mockResolvedValue(null) })
    const fn = vi.fn()

    await expect(withTokenRefresh(fn, deps)).rejects.toThrow('Sessão expirada')
    expect(fn).not.toHaveBeenCalled()
  })

  it('throws when refresh returns null', async () => {
    const deps = makeDeps({ refreshSession: vi.fn().mockResolvedValue(null) })
    const fn = vi.fn().mockRejectedValue(new ApiError('Sessão expirada', 401))

    await expect(withTokenRefresh(fn, deps)).rejects.toThrow('Sessão expirada')
  })

  it('does not retry on non-401 errors', async () => {
    const deps = makeDeps()
    const err = new ApiError('Forbidden', 403)
    const fn = vi.fn().mockRejectedValue(err)

    await expect(withTokenRefresh(fn, deps)).rejects.toBe(err)
    expect(deps.refreshSession).not.toHaveBeenCalled()
  })

  it('propagates error after successful refresh but fn still fails', async () => {
    const deps = makeDeps()
    const secondErr = new ApiError('Still failing', 500)
    const fn = vi.fn()
      .mockRejectedValueOnce(new ApiError('Sessão expirada', 401))
      .mockRejectedValueOnce(secondErr)

    await expect(withTokenRefresh(fn, deps)).rejects.toBe(secondErr)
  })

  it('uses custom isUnauthorizedError predicate from interface', async () => {
    const customDeps: TokenRefreshDeps = {
      getAccessToken: vi.fn().mockResolvedValue('tok-a'),
      refreshSession: vi.fn().mockResolvedValue({ access_token: 'tok-b' }),
      isUnauthorizedError: (err) => err instanceof Error && err.message === 'custom-401',
    }
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('custom-401'))
      .mockResolvedValueOnce('custom-ok')

    const result = await withTokenRefresh(fn, customDeps)

    expect(result).toBe('custom-ok')
    expect(customDeps.refreshSession).toHaveBeenCalledTimes(1)
  })
})
