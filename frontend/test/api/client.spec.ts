// API client spec — fetch wrapper, timeout, and error mapping

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  apiFetch,
  apiFetchAuth,
  getApiBaseUrl,
  ApiError,
} from '@/api/client'

// --- Helpers ---

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function textResponse(text: string, status = 200) {
  return new Response(text, { status })
}

describe('api/client (HTTP integration)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  describe('getApiBaseUrl()', () => {
    it('uses NEXT_PUBLIC_BACKEND_URL in the browser', () => {
      expect(getApiBaseUrl()).toBe('http://api.test')
    })

    it('throws an error when the URL is not set', () => {
      vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', '')

      expect(() => getApiBaseUrl()).toThrow(
        'NEXT_PUBLIC_BACKEND_URL não está definida no .env',
      )
    })
  })

  describe('apiFetch()', () => {
    it('returns JSON on success', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: '1' }))

      const data = await apiFetch<{ id: string }>('/services/me')

      expect(data).toEqual({ id: '1' })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://api.test/services/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('preserves custom headers', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await apiFetch('/x', { headers: { 'X-Custom': '1' } })

      expect(fetchMock).toHaveBeenCalledWith(
        'http://api.test/x',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Custom': '1' }),
        }),
      )
    })

    it('maps 401 to expired session', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 401))

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(401)
      expect(err.message).toBe('Sessão expirada. Faça login novamente.')
    })

    it('maps 403 to missing permission', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 403))

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(403)
      expect(err.message).toBe('Você não tem permissão para realizar esta ação.')
    })

    it('uses the backend message when it is a string', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: 'Pedido não encontrado' }, 404),
      )

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err.status).toBe(404)
      expect(err.message).toBe('Pedido não encontrado')
      expect(err.body).toEqual({ message: 'Pedido não encontrado' })
    })

    it('concatenates backend messages when array', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: ['erro a', 'erro b'] }, 400),
      )

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err.message).toBe('erro a, erro b')
    })

    it('returns null when the body is not JSON', async () => {
      fetchMock.mockResolvedValue(textResponse('not-json', 200))

      await expect(apiFetch('/x')).resolves.toBeNull()
    })

    it('propagates the original network failure', async () => {
      fetchMock.mockRejectedValue(new TypeError('network down'))

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err).toBeInstanceOf(TypeError)
      expect(err.message).toBe('network down')
    })

    it('maps timeout (abort) to 503', async () => {
      vi.useFakeTimers()
      // Simulates real fetch semantics: rejects with AbortError on abort.
      fetchMock.mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              )
            })
          }),
      )

      const promise = apiFetch('/lento')
      const assertion = expect(promise).rejects.toMatchObject({ status: 503 })
      await vi.advanceTimersByTimeAsync(10_000)
      await assertion
    })
  })

  describe('apiFetchAuth()', () => {
    it('sends the Bearer token', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

      await apiFetchAuth('/services/me', 'tok-abc', { method: 'GET' })

      expect(fetchMock).toHaveBeenCalledWith(
        'http://api.test/services/me',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer tok-abc',
          }),
        }),
      )
    })
  })
})
