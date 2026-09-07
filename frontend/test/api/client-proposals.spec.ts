import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Helpers ────────────────────────────────────────────────────────────────

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// USE_MOCK é lido na carga do módulo: reimporta a cada teste com o env certo.
// ApiError também vem do módulo recarregado — a classe do import estático
// seria outra identidade após resetModules e quebraria o instanceof.
async function loadProposalsApi(useMock: boolean) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', useMock ? 'true' : '')
  vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
  vi.stubGlobal('fetch', fetchMock)
  const api = await import('@/api/client/proposals')
  const client = await import('@/api/client')
  return { ...api, ApiError: client.ApiError }
}

// ─── Tests ──────────────────────────────────────────────────────────────────
// Integração: módulo de propostas do cliente atravessando a camada HTTP
// (rotas, método, auth, tratamento de erro) com fetch mockado.

describe('api/client/proposals (integração)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('accept envia POST na rota de aceite com Bearer e retorna a proposta', async () => {
    const api = await loadProposalsApi(false)
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'p1', status: 'ACCEPTED' }),
    )

    const result = await api.acceptProposal('tok-abc', 'p1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/proposals/p1/accept',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result).toEqual({ id: 'p1', status: 'ACCEPTED' })
  })

  it('reject envia POST na rota de recusa', async () => {
    const api = await loadProposalsApi(false)
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'p1', status: 'REJECTED' }),
    )

    const result = await api.rejectProposal('tok-abc', 'p1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/proposals/p1/reject',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result).toEqual({ id: 'p1', status: 'REJECTED' })
  })

  it('propaga erro do backend como ApiError', async () => {
    const api = await loadProposalsApi(false)
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Proposta não encontrada' }, 404),
    )

    const err: any = await api.acceptProposal('tok-abc', 'missing').catch((e) => e)

    expect(err).toBeInstanceOf(api.ApiError)
    expect(err.status).toBe(404)
    expect(err.message).toBe('Proposta não encontrada')
  })

  it('usa o mock local sem chamar fetch quando USE_MOCK=true', async () => {
    const api = await loadProposalsApi(true)

    const result = await api.acceptProposal(
      'tok-abc',
      'mock-client-proposal-001',
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.id).toBe('mock-client-proposal-001')
    expect(result.status).toBe('ACCEPTED')
  })
})
