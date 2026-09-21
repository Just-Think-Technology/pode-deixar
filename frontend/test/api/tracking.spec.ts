// Tracking API spec — detail/start/finish fetchers and photo view resolution

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
async function loadTrackingApi(useMock: boolean) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK', useMock ? 'true' : '')
  vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://api.test')
  vi.stubGlobal('fetch', fetchMock)
  const api = await import('@/api/tracking')
  const client = await import('@/api/client')
  return { ...api, ApiError: client.ApiError }
}

function imageFile(name = 'evidencia.jpg'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' })
}

describe('api/tracking', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('detail sends GET to the tracking route with Bearer', async () => {
    const api = await loadTrackingApi(false)
    fetchMock.mockResolvedValue(jsonResponse({ orderId: 'o1' }))

    const result = await api.getContractTracking('tok', 'o1', 'CLIENT')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/services/o1/tracking',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    )
    expect(result).toEqual({ orderId: 'o1' })
  })

  it('start sends POST to the provider start route', async () => {
    const api = await loadTrackingApi(false)
    fetchMock.mockResolvedValue(jsonResponse({ orderId: 'o1' }))

    await api.startTrackedService('tok', 'o1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/services/me/o1/start',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('finish sends multipart photos plus observations to the finish route', async () => {
    const api = await loadTrackingApi(false)
    fetchMock.mockResolvedValue(jsonResponse({ orderId: 'o1' }))

    await api.finishTrackedService('tok', 'o1', {
      photos: [imageFile(), imageFile('foto-2.png')],
      observations: 'Troca concluída',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/api/v1/services/me/o1/finish')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    const body = init.body as FormData
    expect(body.getAll('photos')).toHaveLength(2)
    expect(body.get('observations')).toBe('Troca concluída')
    // No JSON content type: the browser sets the multipart boundary.
    expect(init.headers as Record<string, string>).not.toHaveProperty(
      'Content-Type',
    )
  })

  it('finish omits observations when null', async () => {
    const api = await loadTrackingApi(false)
    fetchMock.mockResolvedValue(jsonResponse({ orderId: 'o1' }))

    await api.finishTrackedService('tok', 'o1', {
      photos: [imageFile()],
      observations: null,
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = init.body as FormData
    expect(body.has('observations')).toBe(false)
  })

  it('photo view resolves the presigned url route', async () => {
    const api = await loadTrackingApi(false)
    fetchMock.mockResolvedValue(
      jsonResponse({ url: 'https://storage.test/signed.webp' }),
    )

    const result = await api.getEvidencePhotoViewUrl('tok', 'photo-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/services/photos/photo-1/view',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual({ url: 'https://storage.test/signed.webp' })
  })
})
