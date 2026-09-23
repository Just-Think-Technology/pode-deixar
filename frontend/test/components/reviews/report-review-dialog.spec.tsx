// Report review dialog spec — red phase of JTT-108 (component does not exist yet)

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import ReportReviewDialog from '@/components/shared/reviews/report-review-dialog'

const baseProps = {
  reviewId: 'r1',
  reportStatus: 'NONE' as const,
  onReport: vi.fn(),
}

describe('ReportReviewDialog', () => {
  it('requires a reason before enabling submit', () => {
    render(<ReportReviewDialog {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Denunciar' }))

    expect(screen.getByText('Motivo da denúncia')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar denúncia' }),
    ).toBeDisabled()
  })

  it('submits the report with reason and description', async () => {
    const onReport = vi.fn().mockResolvedValue(undefined)
    render(<ReportReviewDialog {...baseProps} onReport={onReport} />)

    fireEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    fireEvent.click(screen.getByRole('radio', { name: /baixo calão/i }))
    fireEvent.change(screen.getByPlaceholderText(/detalhes/i), {
      target: { value: 'Contém palavrões.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    await waitFor(() => {
      expect(onReport).toHaveBeenCalledWith('r1', {
        reason: 'PALAVRAO',
        description: 'Contém palavrões.',
      })
    })
    expect(
      await screen.findByText(/denúncia enviada/i),
    ).toBeInTheDocument()
  })

  it('disables reporting while a report is pending', () => {
    render(<ReportReviewDialog {...baseProps} reportStatus="PENDING" />)

    expect(
      screen.getByRole('button', { name: 'Denúncia em análise' }),
    ).toBeDisabled()
  })

  it('shows retry when the report fails', async () => {
    const onReport = vi.fn().mockRejectedValue(new Error('Falha de rede'))
    render(<ReportReviewDialog {...baseProps} onReport={onReport} />)

    fireEvent.click(screen.getByRole('button', { name: 'Denunciar' }))
    fireEvent.click(screen.getByRole('radio', { name: /ofensa/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }))

    await waitFor(() => {
      expect(screen.getByText('Falha de rede')).toBeInTheDocument()
    })
  })
})
