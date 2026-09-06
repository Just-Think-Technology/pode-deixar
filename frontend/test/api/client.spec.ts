import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  apiFetch,
  apiFetchAuth,
  getApiBaseUrl,
  ApiError,
} from '@/api/client'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Tests ──────────────────────────────────────────────────────────────────
// Integração: camada HTTP base (base URL, headers, erros) com fetch mockado.
// Trava o contrato que todos os módulos em api/* usam para falar com o back.

describe('api/client (integração HTTP)', () => {
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
    it('usa NEXT_PUBLIC_BACKEND_URL no browser', () => {
      expect(getApiBaseUrl()).toBe('http://api.test')
    })

    it('lança erro quando a URL não está definida', () => {
      vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', '')

      expect(() => getApiBaseUrl()).toThrow(
        'NEXT_PUBLIC_BACKEND_URL não está definida no .env',
      )
    })
  })

  describe('apiFetch()', () => {
    it('retorna o JSON em caso de sucesso', async () => {
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

    it('preserva headers customizados', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}))

      await apiFetch('/x', { headers: { 'X-Custom': '1' } })

      expect(fetchMock).toHaveBeenCalledWith(
        'http://api.test/x',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Custom': '1' }),
        }),
      )
    })

    it('mapeia 401 para sessão expirada', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 401))

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(401)
      expect(err.message).toBe('Sessão expirada. Faça login novamente.')
    })

    it('mapeia 403 para falta de permissão', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 403))

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(403)
      expect(err.message).toBe('Você não tem permissão para realizar esta ação.')
    })

    it('usa a mensagem do backend quando string', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: 'Pedido não encontrado' }, 404),
      )

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err.status).toBe(404)
      expect(err.message).toBe('Pedido não encontrado')
      expect(err.body).toEqual({ message: 'Pedido não encontrado' })
    })

    it('concatena mensagens do backend quando array', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: ['erro a', 'erro b'] }, 400),
      )

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err.message).toBe('erro a, erro b')
    })

    it('retorna null quando o corpo não é JSON', async () => {
      fetchMock.mockResolvedValue(textResponse('not-json', 200))

      await expect(apiFetch('/x')).resolves.toBeNull()
    })

    it('propaga falha de rede original', async () => {
      fetchMock.mockRejectedValue(new TypeError('network down'))

      const err: any = await apiFetch('/x').catch((e) => e)

      expect(err).toBeInstanceOf(TypeError)
      expect(err.message).toBe('network down')
    })

    it('mapeia timeout (abort) para 503', async () => {
      vi.useFakeTimers()
      // Simula a semântica real do fetch: rejeita com AbortError no abort.
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
    it('envia o Bearer token', async () => {
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
