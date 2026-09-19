// Tracking finish validation spec — photo and observations bounds

import { describe, it, expect } from 'vitest'

import {
  MAX_FINISH_OBSERVATIONS_LENGTH,
  validateFinishInput,
} from '@/lib/tracking/validation'

function imageFile(size = 1024, type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], 'evidencia.jpg', { type })
}

describe('lib/tracking/validation validateFinishInput', () => {
  it('rejects conclusion without photos', () => {
    const result = validateFinishInput([], null)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.values(result.errors)[0]).toMatch(/pelo menos uma foto/)
    }
  })

  it('rejects more than 10 photos', () => {
    const photos = Array.from({ length: 11 }, () => imageFile())

    expect(validateFinishInput(photos, null).ok).toBe(false)
  })

  it('rejects unsupported mime or oversized files', () => {
    expect(validateFinishInput([imageFile(1024, 'application/pdf')], null).ok).toBe(
      false,
    )
    expect(
      validateFinishInput([imageFile(6 * 1024 * 1024)], null).ok,
    ).toBe(false)
  })

  it('rejects observations beyond 2000 chars', () => {
    const observations = 'x'.repeat(MAX_FINISH_OBSERVATIONS_LENGTH + 1)

    const result = validateFinishInput([imageFile()], observations)

    expect(result.ok).toBe(false)
  })

  it('accepts photos with optional observations', () => {
    expect(validateFinishInput([imageFile()], null)).toEqual({ ok: true })
    expect(validateFinishInput([imageFile()], '  Serviço ok  ')).toEqual({
      ok: true,
    })
  })
})
