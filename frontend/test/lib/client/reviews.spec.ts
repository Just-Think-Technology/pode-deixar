// Reviews mappers spec — red phase of JTT-108 (module does not exist yet)

import { describe, it, expect } from 'vitest'

import {
  toDisplayName,
  formatAverage,
  formatReviewDate,
  mapProviderReview,
  buildLocalSummary,
} from '@/lib/client/reviews/mappers'

describe('toDisplayName', () => {
  it('abbreviates full name to first name plus last initial', () => {
    expect(toDisplayName('João Silva')).toBe('João S.')
  })

  it('keeps single names untouched', () => {
    expect(toDisplayName('Madonna')).toBe('Madonna')
  })

  it('falls back to Cliente when name is missing', () => {
    expect(toDisplayName(null)).toBe('Cliente')
    expect(toDisplayName('')).toBe('Cliente')
  })
})

describe('formatAverage', () => {
  it('formats with one decimal in pt-BR', () => {
    expect(formatAverage(4.8)).toBe('4,8')
    expect(formatAverage(5)).toBe('5,0')
  })
})

describe('formatReviewDate', () => {
  it('formats ISO date as dd/mm/yyyy', () => {
    expect(formatReviewDate('2026-09-12T10:00:00.000Z')).toBe('12/09/2026')
  })
})

describe('mapProviderReview', () => {
  it('maps raw backend review preserving null comment', () => {
    const mapped = mapProviderReview({
      id: 'r1',
      rating: 5,
      comment: null,
      created_at: '2026-09-12T10:00:00.000Z',
      reviewer_id: 'u1',
    })

    expect(mapped).toEqual({
      id: 'r1',
      rating: 5,
      comment: null,
      createdAt: '2026-09-12T10:00:00.000Z',
      reviewer: { displayName: 'Cliente', avatarUrl: null },
    })
  })

  it('derives reviewer display name from embedded reviewer payload', () => {
    const mapped = mapProviderReview({
      id: 'r2',
      rating: 4,
      comment: 'Ótimo trabalho.',
      created_at: '2026-09-10T10:00:00.000Z',
      reviewer: { display_name: 'Maria Santos', avatar_url: 'https://img/a.png' },
    })

    expect(mapped.reviewer).toEqual({
      displayName: 'Maria S.',
      avatarUrl: 'https://img/a.png',
    })
    expect(mapped.comment).toBe('Ótimo trabalho.')
  })
})

describe('buildLocalSummary', () => {
  it('returns null average when there are no reviews', () => {
    expect(buildLocalSummary(0, 0)).toEqual({
      average: null,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
  })

  it('keeps profile aggregate when reviews exist', () => {
    const summary = buildLocalSummary(4.8, 24)

    expect(summary.average).toBe(4.8)
    expect(summary.total).toBe(24)
  })
})
