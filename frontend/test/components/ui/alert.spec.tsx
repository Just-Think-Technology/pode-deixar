import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'

describe('Alert Component', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  it('should render alert element with default variant', () => {
    render(<Alert>Alert content</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveClass('bg-card')
    expect(alert).toHaveClass('text-card-foreground')
  })

  it('should render alert with destructive variant', () => {
    render(<Alert variant="destructive">Destroy alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveClass('bg-card')
    expect(alert).toHaveClass('text-destructive')
    expect(screen.getByRole('alert')).toHaveTextContent('text-destructive/90')
  })

  it('should render alert title', () => {
    render(
      <Alert>
        <AlertTitle>Título do Alerta</AlertTitle>
      </Alert>
    )
    expect(screen.getByText('Título do Alerta')).toBeInTheDocument()
  })

  it('should render alert description', () => {
    render(
      <Alert>
        <AlertDescription>Descrição do alerta importante.</AlertDescription>
      </Alert>
    )
    expect(screen.getByText('Descrição do alerta importante.')).toBeInTheDocument()
  })

  it('should render alert action (close button)', () => {
    render(
      <Alert>
        <AlertAction />
      </Alert>
    )
    const action = screen.getByRole('alert-action')
    expect(action).toBeInTheDocument()
  })

  it('should apply dark mode classes', () => {
    render(
      <Alert className="dark:text-destructive/90" />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('dark:text-destructive/90')
  })
})