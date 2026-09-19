// Worker orders API spec — completion routes, upload normalization, photo view

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Helpers ---

const fetchMock = vi.fn()

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// USE_MOCK is read at module load: reimport with the right env.
async function loadWorkerOrdersApi() {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', '')
  vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
  vi.stubGlobal('fetch', fetchMock)
  return import('@/api/worker/orders')
}

describe('api/worker/orders (integration)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uploads without a JSON content type and returns the photo', async () => {
    const api = await loadWorkerOrdersApi()
    const photo = {
      id: 'photo-1',
      url: '/api/services/photos/photo-1/view',
      created_at: '2026-09-18T10:00:00',
    }
    fetchMock.mockResolvedValue(jsonResponse(photo))

    const body = new FormData()
    body.append('file', new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))
    const result = await api.uploadWorkerOrderPhoto('tok-abc', 'order-1', body)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/services/me/order-1/completion-photos',
      expect.objectContaining({ method: 'POST' }),
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(
      (init.headers as Record<string, string>)['Content-Type'],
    ).toBeUndefined()
    expect(result).toEqual(photo)
  })

  it('normalizes array upload responses to the first photo', async () => {
    const api = await loadWorkerOrdersApi()
    const photos = [
      { id: 'photo-1', url: '/api/services/photos/photo-1/view' },
      { id: 'photo-2', url: '/api/services/photos/photo-2/view' },
    ]
    fetchMock.mockResolvedValue(jsonResponse(photos))

    const result = await api.uploadWorkerOrderPhoto(
      'tok-abc',
      'order-1',
      new FormData(),
    )

    expect(result).toEqual(photos[0])
  })

  it('rejects empty array upload responses', async () => {
    const api = await loadWorkerOrdersApi()
    fetchMock.mockResolvedValue(jsonResponse([]))

    await expect(
      api.uploadWorkerOrderPhoto('tok-abc', 'order-1', new FormData()),
    ).rejects.toThrow('Não foi possível enviar a foto')
  })

  it('fetches completion history from the completion route', async () => {
    const api = await loadWorkerOrdersApi()
    const history = {
      order_id: 'order-1',
      completed_at: '2026-09-18T10:00:00',
      completed_by: 'provider-1',
      observations: null,
      photos: [],
    }
    fetchMock.mockResolvedValue(jsonResponse(history))

    const result = await api.getWorkerOrderCompletion('tok-abc', 'order-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/services/me/order-1/completion',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result).toEqual(history)
  })

  it('fetches presigned photo URLs with Bearer', async () => {
    const api = await loadWorkerOrdersApi()
    fetchMock.mockResolvedValue(
      jsonResponse({ url: 'https://storage.test/signed' }),
    )

    const result = await api.getOrderPhotoViewUrl('tok-abc', 'photo-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/services/photos/photo-1/view',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok-abc',
        }),
      }),
    )
    expect(result).toEqual({ url: 'https://storage.test/signed' })
  })
})

describe('normalizeUploadedPhotos', () => {
  it('wraps a single photo and keeps arrays as-is', async () => {
    const api = await loadWorkerOrdersApi()
    const single = { id: 'p1', url: 'blob:x', created_at: 't' }

    expect(api.normalizeUploadedPhotos(single)).toEqual([single])
    expect(api.normalizeUploadedPhotos([single])).toEqual([single])
  })
})
