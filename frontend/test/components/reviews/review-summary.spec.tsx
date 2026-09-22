// Review summary spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import ReviewSummary from '@/components/shared/reviews/review-summary'

describe('ReviewSummary', () => {
  it('shows empty state instead of 0,0 when there are no reviews', () => {
    render(
      <ReviewSummary
        summary={{ average: null, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }}
      />,
    )

    expect(
      screen.getByText('Este prestador ainda não recebeu avaliações.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('0,0')).not.toBeInTheDocument()
  })

  it('shows average, total and distribution', () => {
    render(
      <ReviewSummary
        summary={{
          average: 4.8,
          total: 24,
          distribution: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 20 },
        }}
      />,
    )

    expect(screen.getByText('4,8')).toBeInTheDocument()
    expect(screen.getByText('Baseado em 24 avaliações')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('shows loading skeleton while summary loads', () => {
    render(
      <ReviewSummary
        isLoading
        summary={{ average: null, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }}
      />,
    )

    expect(screen.getByTestId('review-summary-skeleton')).toBeInTheDocument()
  })

  it('shows error with retry action', () => {
    const onRetry = vi.fn()
    render(
      <ReviewSummary
        error="Não foi possível carregar a média."
        onRetry={onRetry}
        summary={{ average: null, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }}
      />,
    )

    expect(screen.getByText('Não foi possível carregar a média.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
