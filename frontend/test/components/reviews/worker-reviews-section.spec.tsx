// Worker reviews section spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import WorkerReviewsSection from '@/components/shared/reviews/worker-reviews-section'

vi.mock('@/lib/worker/reviews/actions', () => ({
  getMyReviewsAction: vi.fn(),
  replyToReviewAction: vi.fn(),
  reportReviewAction: vi.fn(),
}))

import {
  getMyReviewsAction,
  replyToReviewAction,
  reportReviewAction,
} from '@/lib/worker/reviews/actions'

const mockReviews = [
  {
    id: 'r1',
    rating: 5,
    comment: 'Ótimo serviço.',
    createdAt: '2026-09-12T10:00:00.000Z',
    reviewer: { displayName: 'Carlos M.', avatarUrl: null },
    response: null,
    reportStatus: 'NONE' as const,
  },
  {
    id: 'r2',
    rating: 2,
    comment: 'Péssimo, não recomendo.',
    createdAt: '2026-09-10T10:00:00.000Z',
    reviewer: { displayName: 'Ana P.', avatarUrl: null },
    response: null,
    reportStatus: 'NONE' as const,
  },
]

const summary = {
  average: 3.5,
  total: 2,
  distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 },
}

describe('WorkerReviewsSection', () => {
  beforeEach(() => {
    vi.mocked(getMyReviewsAction).mockResolvedValue(mockReviews)
    vi.mocked(replyToReviewAction).mockResolvedValue({
      message: 'Obrigado!',
      createdAt: '2026-09-13T10:00:00.000Z',
    })
    vi.mocked(reportReviewAction).mockResolvedValue(undefined)
  })

  it('loads and renders the worker own reviews with reply and report actions', async () => {
    render(<WorkerReviewsSection initialSummary={summary} />)

    await waitFor(() => {
      expect(screen.getByText('Ótimo serviço.')).toBeInTheDocument()
    })
    expect(screen.getByText('Péssimo, não recomendo.')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Responder' }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('button', { name: 'Denunciar' }).length,
    ).toBeGreaterThan(0)
  })

  it('shows the empty state when the worker has no reviews', async () => {
    vi.mocked(getMyReviewsAction).mockResolvedValue([])

    render(
      <WorkerReviewsSection
        initialSummary={{ average: null, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/ainda não recebeu avaliações/i),
      ).toBeInTheDocument()
    })
  })

  it('shows retry when loading the reviews fails', async () => {
    vi.mocked(getMyReviewsAction).mockRejectedValue(
      new Error('Não foi possível carregar as avaliações.'),
    )

    render(<WorkerReviewsSection initialSummary={summary} />)

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar as avaliações.'),
      ).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeInTheDocument()
  })
})
