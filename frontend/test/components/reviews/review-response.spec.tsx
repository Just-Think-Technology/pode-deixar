// Review response spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import ReviewResponse from '@/components/shared/reviews/review-response'

const baseProps = {
  reviewId: 'r1',
  response: null,
  onReply: vi.fn(),
}

describe('ReviewResponse', () => {
  it('shows the reply form when there is no response yet', () => {
    render(<ReviewResponse {...baseProps} />)

    expect(
      screen.getByPlaceholderText('Escreva sua resposta…'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled()
  })

  it('displays the existing response instead of the form', () => {
    render(
      <ReviewResponse
        {...baseProps}
        response={{
          message: 'Obrigado pela preferência!',
          createdAt: '2026-09-13T10:00:00.000Z',
        }}
      />,
    )

    expect(
      screen.getByText('Obrigado pela preferência!'),
    ).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Escreva sua resposta…'),
    ).not.toBeInTheDocument()
  })

  it('blocks submit above the character limit', () => {
    render(<ReviewResponse {...baseProps} />)

    fireEvent.change(screen.getByPlaceholderText('Escreva sua resposta…'), {
      target: { value: 'x'.repeat(501) },
    })

    expect(screen.getByRole('button', { name: 'Responder' })).toBeDisabled()
    expect(screen.getByText(/500 caracteres/)).toBeInTheDocument()
  })

  it('submits the reply and shows success state', async () => {
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<ReviewResponse {...baseProps} onReply={onReply} />)

    fireEvent.change(screen.getByPlaceholderText('Escreva sua resposta…'), {
      target: { value: 'Obrigado!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))

    await waitFor(() => {
      expect(onReply).toHaveBeenCalledWith('r1', 'Obrigado!')
    })
  })

  it('shows retry when the reply fails', async () => {
    const onReply = vi.fn().mockRejectedValue(new Error('Falha de rede'))
    render(<ReviewResponse {...baseProps} onReply={onReply} />)

    fireEvent.change(screen.getByPlaceholderText('Escreva sua resposta…'), {
      target: { value: 'Obrigado!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))

    await waitFor(() => {
      expect(screen.getByText('Falha de rede')).toBeInTheDocument()
    })
  })
})
