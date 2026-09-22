// Review list spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import ReviewList from '@/components/shared/reviews/review-list'

const reviews = [
  {
    id: 'r1',
    rating: 5,
    comment: 'Excelente.',
    createdAt: '2026-09-12T10:00:00.000Z',
    reviewer: { displayName: 'João S.', avatarUrl: null },
  },
  {
    id: 'r2',
    rating: 4,
    comment: null,
    createdAt: '2026-09-10T10:00:00.000Z',
    reviewer: { displayName: 'Maria S.', avatarUrl: null },
  },
]

describe('ReviewList', () => {
  it('renders reviews in the given order with load more button', () => {
    const onLoadMore = vi.fn()
    render(
      <ReviewList
        reviews={reviews}
        hasMore
        onLoadMore={onLoadMore}
      />,
    )

    const names = screen.getAllByTestId('review-reviewer-name').map((el) => el.textContent)
    expect(names).toEqual(['João S.', 'Maria S.'])
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument()
  })

  it('informs when there are no more reviews to load', () => {
    render(<ReviewList reviews={reviews} hasMore={false} />)

    expect(screen.getByText('Você viu todas as avaliações.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument()
  })

  it('shows loading state while fetching more reviews', () => {
    render(<ReviewList reviews={reviews} hasMore isLoadingMore />)

    expect(screen.getByRole('button', { name: 'Carregando…' })).toBeDisabled()
  })

  it('shows error state when loading more fails', () => {
    render(
      <ReviewList
        reviews={reviews}
        hasMore
        loadMoreError="Não foi possível carregar mais avaliações."
      />,
    )

    expect(
      screen.getByText('Não foi possível carregar mais avaliações.'),
    ).toBeInTheDocument()
  })
})
