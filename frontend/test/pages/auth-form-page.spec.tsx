// Auth forms spec — login and registration rendering with jsdom workarounds

import { describe, it, expect, vitest, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// The forms import (via lib/auth) the `server-only` package, which throws
// outside Server Components — neutralized for unit tests in jsdom.
vi.mock('server-only', () => ({}))

// The handlers use the App Router useRouter, unavailable in jsdom — stub.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

import { ClientLoginForm } from '@/components/pages/auth-form-page'
import { WorkerLoginForm } from '@/components/pages/auth-form-page'
import { ClientRegisterForm } from '@/components/pages/auth-form-page'
import { WorkerRegisterForm } from '@/components/pages/auth-form-page'

describe('Authentication Forms', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  describe('ClientLoginForm', () => {
    it('should render login form', () => {
      render(<ClientLoginForm />)

      const emailInput = screen.getByRole('textbox', {
        name: /e-mail/i,
      })
      expect(emailInput).toBeInTheDocument()

    const passwordInput = screen.getByLabelText(/senha/i)
      expect(passwordInput).toBeInTheDocument()

      const loginButton = screen.getByRole('button', {
        name: /entrar/i,
      })
      expect(loginButton).toBeInTheDocument()

      const forgotLink = screen.getByRole('link', {
        name: /esqueceu sua senha/i,
      })
      expect(forgotLink).toBeInTheDocument()
    })

    it('should have form structure', () => {
      const { container } = render(<ClientLoginForm />)
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })
  })

  describe('WorkerLoginForm', () => {
    it('should render worker login form', () => {
      render(<WorkerLoginForm />)

      const emailInput = screen.getByRole('textbox', {
        name: /e-mail/i,
      })
      expect(emailInput).toBeInTheDocument()

    const passwordInput = screen.getByLabelText(/senha/i)
      expect(passwordInput).toBeInTheDocument()

      const loginButton = screen.getByRole('button', {
        name: /entrar/i,
      })
      expect(loginButton).toBeInTheDocument()
    })
  })

  describe('ClientRegisterForm', () => {
    it('should render client registration form', () => {
      render(<ClientRegisterForm />)

      const nameInput = screen.getByRole('textbox', {
        name: /nome completo/i,
      })
      expect(nameInput).toBeInTheDocument()

      const emailInput = screen.getByRole('textbox', {
        name: /e-mail/i,
      })
      expect(emailInput).toBeInTheDocument()

      const phoneInput = screen.getByRole('textbox', {
        name: /telefone/i,
      })
      expect(phoneInput).toBeInTheDocument()

      const postalInput = screen.getByRole('textbox', {
        name: /cep/i,
      })
      expect(postalInput).toBeInTheDocument()

      const passwordInput = screen.getByLabelText(/^senha$/i)
      expect(passwordInput).toBeInTheDocument()

      const confirmPasswordInput = screen.getByLabelText(/confirmar senha/i)
      expect(confirmPasswordInput).toBeInTheDocument()

      const registerButton = screen.getByRole('button', {
        name: /criar conta/i,
      })
      expect(registerButton).toBeInTheDocument()
    })
  })

  describe('WorkerRegisterForm', () => {
    it('should render worker registration form', () => {
      render(<WorkerRegisterForm />)

      const nameInput = screen.getByRole('textbox', {
        name: /nome completo/i,
      })
      expect(nameInput).toBeInTheDocument()

      const emailInput = screen.getByRole('textbox', {
        name: /e-mail/i,
      })
      expect(emailInput).toBeInTheDocument()

      const phoneInput = screen.getByRole('textbox', {
        name: /telefone/i,
      })
      expect(phoneInput).toBeInTheDocument()

      const postalInput = screen.getByRole('textbox', {
        name: /cep/i,
      })
      expect(postalInput).toBeInTheDocument()

      const passwordInput = screen.getByLabelText(/^senha$/i)
      expect(passwordInput).toBeInTheDocument()

      const registerButton = screen.getByRole('button', {
        name: /criar conta/i,
      })
      expect(registerButton).toBeInTheDocument()
    })
  })
})