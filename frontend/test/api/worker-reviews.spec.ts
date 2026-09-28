// Worker reviews API spec — red phase of JTT-108 (module does not exist yet)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function loadWorkerReviewsApi(useMock = false) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', useMock ? 'true' : '')
  vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
  vi.stubGlobal('fetch', fetchMock)
  return import('@/api/worker/reviews')
}

describe('api/worker/reviews', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('fetches a paginated received page with auth and maps response plus report status', async () => {
    const api = await loadWorkerReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 'r1',
            rating: 5,
            comment: 'Ótimo serviço.',
            created_at: '2026-09-12T10:00:00.000Z',
            reviewer: { display_name: 'Carlos Mendes', avatar_url: null },
            response: null,
            report_status: 'NONE',
          },
        ],
        meta: { total: 1, page: 1, limit: 10, hasMore: false },
      }),
    )

    const result = await api.getMyReviews('tok-abc', { page: 1, limit: 10 })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/received?page=1&limit=10',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, hasMore: false })
    expect(result.data).toEqual([
      {
        id: 'r1',
        rating: 5,
        comment: 'Ótimo serviço.',
        createdAt: '2026-09-12T10:00:00.000Z',
        reviewer: { displayName: 'Carlos M.', avatarUrl: null },
        response: null,
        reportStatus: 'NONE',
      },
    ])
  })

  it('posts a reply to a received review', async () => {
    const api = await loadWorkerReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({
        message: 'Obrigado pela avaliação!',
        created_at: '2026-09-13T10:00:00.000Z',
      }),
    )

    const result = await api.replyToReview('tok-abc', 'r1', {
      message: 'Obrigado pela avaliação!',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/r1/response',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result).toMatchObject({ message: 'Obrigado pela avaliação!' })
  })

  it('patches an existing response', async () => {
    const api = await loadWorkerReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({
        message: 'Resposta atualizada!',
        created_at: '2026-09-14T10:00:00.000Z',
      }),
    )

    const result = await api.updateReviewResponse('tok-abc', 'r1', {
      message: 'Resposta atualizada!',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/r1/response',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result).toMatchObject({ message: 'Resposta atualizada!' })
  })

  it('posts a report with reason for a received review', async () => {
    const api = await loadWorkerReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'rep1', status: 'PENDING' }),
    )

    await api.reportReview('tok-abc', 'r1', {
      reason: 'PALAVRAO',
      description: 'Contém palavrões.',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/reviews/r1/reports',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      reason: 'PALAVRAO',
      description: 'Contém palavrões.',
    })
  })

  it('propagates a duplicate pending report as 409', async () => {
    const api = await loadWorkerReviewsApi()
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Denúncia já em análise' }, 409),
    )

    await expect(
      api.reportReview('tok-abc', 'r1', { reason: 'OFENSA' }),
    ).rejects.toMatchObject({ status: 409 })
  })
})
