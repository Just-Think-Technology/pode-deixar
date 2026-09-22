// Star display spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import StarDisplay from '@/components/shared/reviews/star-display'

describe('StarDisplay', () => {
  it('exposes an accessible label with pt-BR value', () => {
    render(<StarDisplay value={4.8} />)

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', '4,8 de 5')
  })

  it('renders five stars without rounding the value up', () => {
    const { container } = render(<StarDisplay value={4.8} />)

    expect(container.querySelectorAll('svg').length).toBe(5)
  })
})
