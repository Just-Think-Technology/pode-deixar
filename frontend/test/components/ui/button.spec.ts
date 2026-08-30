import { describe, it, expect, vitest, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from '@/components/ui/button'

describe('Button Component', () => {
  beforeEach(() => {
    // Clean up any mocks between tests
    vitest.resetAllMocks()
  })

  it('should render children text', () => {
    render(<Button>Clique aqui</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Clique aqui')
  })

  it('should apply default variants', () => {
    render(<Button>Botão</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('inline-flex')
    expect(button).toHaveClass('rounded-lg')
  })

  it('should apply primary variant', () => {
    render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-primary-foreground')
  })

  it('should apply outline variant', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('bg-background')
  })

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-secondary')
    expect(button).toHaveClass('text-secondary-foreground')
  })

  it('should apply destructive variant', () => {
    render(<Button variant="destructive">Destructive</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive/10')
    expect(button).toHaveClass('text-destructive')
  })

  it('should apply ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-muted')
    expect(button).toHaveClass('hover:text-foreground')
  })

  it('should apply link variant', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('underline-offset-4')
    expect(button).toHaveClass('hover:underline')
  })

  it('should apply default size', () => {
    render(<Button>Default Size</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-8')
    expect(button).toHaveClass('px-2.5')
  })

  it('should apply xs size', () => {
    render(<Button size="xs">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-6')
    expect(button).toHaveClass('px-2')
    expect(button).toHaveClass('text-xs')
  })

  it('should apply sm size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-7')
    expect(button).toHaveClass('px-2.5')
    expect(button).toHaveClass('text-[0.8rem]')
  })

  it('should apply lg size', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-9')
    expect(button).toHaveClass('px-2.5')
  })

  it('should apply icon size', () => {
    render(<Button size="icon">Icon</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('size-8')
  })

  it('should apply icon-xs size', () => {
    render(<Button size="icon-xs">Icon Xs</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('size-6')
  })

  it('should apply icon-sm size', () => {
    render(<Button size="icon-sm">Icon Sm</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('size-7')
  })

  it('should apply icon-lg size', () => {
    render(<Button size="icon-lg">Icon Lg</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('size-9')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Desabilitado</Button>)
    const button = screen.getByRole('button', { disabled: true })
    expect(button).toHaveClass('pointer-events-none')
    expect(button).toHaveClass('opacity-50')
  })

  it('should call onClick handler', () => {
    const handleClick = vitest.fn()
    render(<Button onClick={handleClick}>Enviar</Button>)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should call onClick handler with correct argument', () => {
    const handleClick = vitest.fn((e: MouseEvent) => {
      expect(e).toBeInstanceOf(MouseEvent)
    })
    render(<Button onClick={handleClick}>Enviar</Button>)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should render with additional props', () => {
    render(<Button data-testid="custom-button">Teste</Button>)
    const button = screen.getByRole('button', { name: 'Teste' })
    expect(button).toHaveAttribute('data-testid', 'custom-button')
  })

  it('should render with className augmentation', () => {
    render(
      <Button className="custom-class">
        Com Classe
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('should render icon-only button', () => {
    render(<Button size="icon"><svg aria-hidden="true" data-slot="icon" /></Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('pointer-events-none')
  })
})