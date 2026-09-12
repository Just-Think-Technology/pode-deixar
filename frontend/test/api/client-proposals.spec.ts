import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Helpers ---

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// USE_MOCK is read at module load: reimport on every test with the right env.
// ApiError also comes from the reloaded module — the statically imported class
// would be a different identity after resetModules and break instanceof.
async function loadProposalsApi(useMock: boolean) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', useMock ? 'true' : '')
  vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
  vi.stubGlobal('fetch', fetchMock)
  const api = await import('@/api/client/proposals')
  const client = await import('@/api/client')
  return { ...api, ApiError: client.ApiError }
}

describe('api/client/proposals (integration)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('accept sends POST to the accept route with Bearer and returns the proposal', async () => {
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

  it('reject sends POST to the decline route', async () => {
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

  it('propagates backend errors as ApiError', async () => {
    const api = await loadProposalsApi(false)
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Proposta não encontrada' }, 404),
    )

    const err: any = await api.acceptProposal('tok-abc', 'missing').catch((e) => e)

    expect(err).toBeInstanceOf(api.ApiError)
    expect(err.status).toBe(404)
    expect(err.message).toBe('Proposta não encontrada')
  })

  it('uses the local mock without calling fetch when USE_MOCK=true', async () => {
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
