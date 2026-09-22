// Provider reviews API spec — red phase of JTT-108 (module does not exist yet)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function loadReviewsApi() {
  vi.resetModules()
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

  it('fetches provider reviews with limit and maps raw payload', async () => {
    const api = await loadReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          id: 'r1',
          rating: 5,
          comment: null,
          created_at: '2026-09-12T10:00:00.000Z',
          reviewer_id: 'u1',
        },
      ]),
    )

    const result = await api.getProviderReviews('provider-1', 10)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/provider/provider-1?limit=10',
      expect.objectContaining({ signal: expect.anything() }),
    )
    expect(result).toEqual([
      {
        id: 'r1',
        rating: 5,
        comment: null,
        createdAt: '2026-09-12T10:00:00.000Z',
        reviewer: { displayName: 'Cliente', avatarUrl: null },
      },
    ])
  })

  it('propagates API errors to the caller', async () => {
    const api = await loadReviewsApi()
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Ops' }, 500))

    await expect(api.getProviderReviews('provider-1')).rejects.toMatchObject({
      status: 500,
    })
  })
})
