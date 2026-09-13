import { describe, it, expect, vi, beforeEach } from 'vitest'

// The actions import (via lib/auth) the `server-only` package, which throws
// outside Server Components — neutralized for unit tests in jsdom.
vi.mock('server-only', () => ({}))

// Stub session + API base so no cookies or network are touched.
vi.mock('@/lib/auth/session.server', () => ({
  getAccessToken: vi.fn(),
}))
vi.mock('@/api/client', () => ({
  getApiBaseUrl: () => 'https://api.test',
}))

import { getAccessToken } from '@/lib/auth/session.server'
import {
  uploadServiceImageAction,
  deleteServiceImageAction,
} from '@/lib/auth/image-actions'

const UUID = '123e4567-e89b-12d3-a456-426614174000'

function pngFile(): File {
  // Minimal PNG header so magic-bytes validation passes.
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return new File([bytes], 'avatar.png', { type: 'image/png' })
}

function formWithFile(): FormData {
  const form = new FormData()
  form.append('file', pngFile())
  return form
}

describe('Image actions resource-ID allowlist', () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockResolvedValue('test-token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }))
  })

  it('rejects path traversal in serviceId without fetching', async () => {
    await expect(
      uploadServiceImageAction('../../admin', formWithFile()),
    ).rejects.toThrow('Serviço inválido')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects absolute URLs in serviceId without fetching', async () => {
    await expect(
      uploadServiceImageAction('https://evil.test/x', formWithFile()),
    ).rejects.toThrow('Serviço inválido')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects empty serviceId without fetching', async () => {
    await expect(
      uploadServiceImageAction('   ', formWithFile()),
    ).rejects.toThrow('Serviço inválido')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects traversal in imageId without fetching', async () => {
    await expect(deleteServiceImageAction(UUID, '../other')).rejects.toThrow(
      'Imagem inválida',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('accepts UUID ids and calls the backend', async () => {
    await deleteServiceImageAction(UUID, UUID)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `https://api.test/providers/me/services/${UUID}/images/${UUID}`,
    )
  })

  it('accepts mock- ids used by mock mode', async () => {
    await deleteServiceImageAction('mock-svc-001', 'mock-img-001')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
