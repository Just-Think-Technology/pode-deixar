// Provider reviews API spec — paginated list and summary (JTT-108 backend contract)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function loadReviewsApi(useMock = false) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', useMock ? 'true' : '')
  vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
  vi.stubGlobal('fetch', fetchMock)
  return import('@/api/client/reviews')
}

describe('api/client/reviews', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('fetches a paginated provider page with auth and maps raw payload', async () => {
    const api = await loadReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 'r1',
            rating: 5,
            comment: null,
            created_at: '2026-09-12T10:00:00.000Z',
            reviewer: { display_name: 'Carlos Mendes', avatar_url: null },
            response: null,
          },
        ],
        meta: { total: 12, page: 1, limit: 10, hasMore: true },
      }),
    )

    const result = await api.getProviderReviews('tok-abc', 'provider-1', {
      page: 1,
      limit: 10,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/provider/provider-1?page=1&limit=10',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result.meta).toEqual({ total: 12, page: 1, limit: 10, hasMore: true })
    expect(result.data).toEqual([
      {
        id: 'r1',
        rating: 5,
        comment: null,
        createdAt: '2026-09-12T10:00:00.000Z',
        reviewer: { displayName: 'Carlos M.', avatarUrl: null },
        response: null,
      },
    ])
  })

  it('maps the embedded provider response on the public list', async () => {
    const api = await loadReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 'r2',
            rating: 4,
            comment: 'Bom trabalho.',
            created_at: '2026-09-10T10:00:00.000Z',
            reviewer: { display_name: 'Ana Paula', avatar_url: null },
            response: {
              message: 'Obrigado!',
              created_at: '2026-09-11T10:00:00.000Z',
            },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, hasMore: false },
      }),
    )

    const result = await api.getProviderReviews('tok-abc', 'provider-1')

    expect(result.data[0]?.response).toEqual({
      message: 'Obrigado!',
      createdAt: '2026-09-11T10:00:00.000Z',
    })
  })

  it('fetches the provider summary with auth', async () => {
    const api = await loadReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({
        provider_id: 'provider-1',
        average: 4.5,
        total: 2,
        distribution: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 },
      }),
    )

    const result = await api.getProviderReviewsSummary('tok-abc', 'provider-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/provider/provider-1/summary',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result).toEqual({
      average: 4.5,
      total: 2,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    })
  })

  it('propagates API errors to the caller', async () => {
    const api = await loadReviewsApi()
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Ops' }, 500))

    await expect(
      api.getProviderReviews('tok-abc', 'provider-1'),
    ).rejects.toMatchObject({
      status: 500,
    })
  })

  it('returns mock reviews without fetch in mock mode', async () => {
    const api = await loadReviewsApi(true)

    const result = await api.getProviderReviews('tok-abc', 'u1', {
      page: 1,
      limit: 10,
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.data.length).toBeGreaterThan(0)
    expect(result.data[0]).toMatchObject({ id: 'r1', rating: 5 })
    expect(result.meta.total).toBeGreaterThan(0)
  })
})
