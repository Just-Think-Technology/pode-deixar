import { describe, it, expect, vitest } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

describe('InputOTP Component', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  it('should render InputOTPGroup', () => {
    render(<InputOTPGroup>Group</InputOTPGroup>)
    const group = screen.getByRole('group')
    expect(group).toBeInTheDocument()
    expect(group).toHaveClass('flex')
    expect(group).toHaveClass('items-center')
  })

  it('should apply default classes to InputOTPGroup', () => {
    render(<InputOTPGroup />)
    const group = screen.getByRole('group')
    expect(group).toHaveClass('rounded-lg')
    expect(group).toHaveClass('has-aria-invalid:border-destructive')
    expect(group).toHaveClass('has-aria-invalid:ring-3')
    expect(group).toHaveClass('has-aria-invalid:ring-destructive/20')
    expect(group).toHaveClass('dark:has-aria-invalid:ring-destructive/40')
  })

  it('should render InputOTPSlot', () => {
    const { container } = render(
      <InputOTP>
        <InputOTPSlot index={0} />
      </InputOTP>
    )
    const slot = container.querySelector('[data-slot="input-otp-slot"]')
    expect(slot).toBeInTheDocument()
  })

  it('should apply default classes to InputOTPSlot', () => {
    const { container } = render(
      <InputOTP>
        <InputOTPSlot index={0} />
      </InputOTP>
    )
    const slot = container.querySelector('[data-slot="input-otp-slot"]')
    if (slot) {
      expect(slot).toHaveClass('relative')
      expect(slot).toHaveClass('flex')
      expect(slot).toHaveClass('size-8')
      expect(slot).toHaveClass('items-center')
      expect(slot).toHaveClass('justify-center')
      expect(slot).toHaveClass('border-y')
      expect(slot).toHaveClass('border-r')
      expect(slot).toHaveClass('border-input')
      expect(slot).toHaveClass('text-sm')
    }
  })

  it('should render InputOTPSeparator', () => {
    const { container } = render(
      <div>
        <InputOTPSeparator />
      </div>
    )
    const separator = container.querySelector('[data-slot="input-otp-separator"]')
    expect(separator).toBeInTheDocument()
  })

  it('should apply default classes to InputOTPSeparator', () => {
    const { container } = render(
      <div>
        <InputOTPSeparator />
      </div>
    )
    const separator = container.querySelector('[data-slot="input-otp-separator"]')
    if (separator) {
      expect(separator).toHaveClass('flex')
      expect(separator).toHaveClass('items-center')
      expect(separator).toHaveClass('[&_svg:not([class*="size-"])]:size-4')
    }
  })
})