import { describe, it, expect, vitest } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  it('should render input element', () => {
    render(<Input type="text" />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('should render input with type text', () => {
    render(<Input type="text" data-testid="text-input" />)
    const input = screen.getByRole('textbox', { name: /text-input/ })
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should render input with type email', () => {
    render(<Input type="email" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('should render input with type password', () => {
    render(<Input type="password" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('should render input with type number', () => {
    render(<Input type="number" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('type', 'number')
  })

  it('should render input with placeholder', () => {
    render(<Input placeholder="Seu e-mail" />)
    const input = screen.getByRole('textbox')
    expect(input).toHavePlaceholder('Seu e-mail')
  })

  it('should apply default classes', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('h-8')
    expect(input).toHaveClass('w-full')
    expect(input).toHaveClass('rounded-lg')
    expect(input).toHaveClass('border-input')
  })

  it('should be disabled when disabled', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox', { disabled: true })
    expect(input).toHaveClass('disabled:pointer-events-none')
    expect(input).toHaveClass('disabled:cursor-not-allowed')
    expect(input).toHaveClass('disabled:bg-input/50')
    expect(input).toHaveClass('disabled:opacity-50')
  })

  it('should apply focused state classes', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input')
    if (input) {
      input.focus()
      expect(input).toHaveClass('focus-visible:border-ring')
      expect(input).toHaveClass('focus-visible:ring-3')
      expect(input).toHaveClass('focus-visible:ring-ring/50')
    }
  })

  it('should apply dark mode classes when dark', () => {
    render(
      <Input className="dark:bg-input/30" />
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('dark:bg-input/30')
  })

  it('should apply invalid state classes', () => {
    render(<Input aria-invalid="true" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('aria-invalid:border-destructive')
    expect(input).toHaveClass('aria-invalid:ring-3')
    expect(input).toHaveClass('aria-invalid:ring-destructive/20')
  })

  it('should render with custom className', () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })
})