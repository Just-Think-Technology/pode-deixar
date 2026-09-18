// Completion photo URLs spec — view-endpoint detection and display fallback

import { describe, expect, it } from 'vitest'

import {
  getDisplayPhotoUrl,
  needsPhotoUrlResolution,
} from '@/lib/worker/orders/photo-urls'

describe('needsPhotoUrlResolution', () => {
  it('flags backend view-endpoint paths', () => {
    expect(
      needsPhotoUrlResolution('/api/services/photos/photo-1/view'),
    ).toBe(true)
  })

  it('skips direct URLs', () => {
    expect(needsPhotoUrlResolution('blob:preview-1')).toBe(false)
    expect(needsPhotoUrlResolution('https://cdn.test/foto.webp')).toBe(false)
    expect(needsPhotoUrlResolution('data:image/png;base64,xx')).toBe(false)
  })

  it('skips non-view API paths', () => {
    expect(needsPhotoUrlResolution('/api/services/photos/photo-1')).toBe(false)
    expect(needsPhotoUrlResolution('/api/services/me/order-1')).toBe(false)
  })
})

describe('getDisplayPhotoUrl', () => {
  it('keeps direct URLs as-is', () => {
    expect(getDisplayPhotoUrl('blob:preview-1', undefined)).toBe(
      'blob:preview-1',
    )
    expect(
      getDisplayPhotoUrl('https://cdn.test/foto.webp', 'https://other.test/x'),
    ).toBe('https://cdn.test/foto.webp')
  })

  it('uses the resolved URL for view endpoints', () => {
    expect(
      getDisplayPhotoUrl(
        '/api/services/photos/photo-1/view',
        'https://storage.test/signed',
      ),
    ).toBe('https://storage.test/signed')
  })

  it('falls back to blank when nothing renderable exists', () => {
    expect(
      getDisplayPhotoUrl('/api/services/photos/photo-1/view', undefined),
    ).toBe('about:blank')
    expect(
      getDisplayPhotoUrl('/api/services/photos/photo-1/view', 'about:blank'),
    ).toBe('about:blank')
  })
})
