// Review card spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import ReviewCard from '@/components/shared/reviews/review-card'

const baseReview = {
  id: 'r1',
  rating: 5,
  comment: 'Prestador muito profissional, pontual e cuidadoso.',
  createdAt: '2026-09-12T10:00:00.000Z',
  reviewer: { displayName: 'João S.', avatarUrl: null },
}

describe('ReviewCard', () => {
  it('renders reviewer name, stars, comment and date', () => {
    render(<ReviewCard review={baseReview} />)

    expect(screen.getByText('João S.')).toBeInTheDocument()
    expect(
      screen.getByText('Prestador muito profissional, pontual e cuidadoso.'),
    ).toBeInTheDocument()
    expect(screen.getByText('12/09/2026')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '5,0 de 5')
  })

  it('omits comment block when the client did not write one', () => {
    const { container } = render(
      <ReviewCard review={{ ...baseReview, comment: null }} />,
    )

    expect(screen.getByText('12/09/2026')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="review-comment"]')).toBeNull()
  })
})
