import { describe, it, expect, vitest } from 'vitest'
import { render, screen } from '@testing-library/react'

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

      // Should have email field
      const emailInput = screen.getByRole('textbox', {
        name: /e-mail/i,
      })
      expect(emailInput).toBeInTheDocument()

      // Should have password field
      const passwordInput = screen.getByRole('textbox', {
        name: /senha/i,
      })
      expect(passwordInput).toBeInTheDocument()

      // Should have login button
      const loginButton = screen.getByRole('button', {
        name: /entrar/i,
      })
      expect(loginButton).toBeInTheDocument()

      // Should have "Esqueceu sua senha?" link
      const forgotLink = screen.getByLinkText(/esqueceu sua senha/i)
      expect(forgotLink).toBeInTheDocument()
    })

    it('should have form structure', () => {
      render(<ClientLoginForm />)
      const form = screen.getByRole('form')
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

      const passwordInput = screen.getByRole('textbox', {
        name: /senha/i,
      })
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

      // Should have name field
      const nameInput = screen.getByRole('textbox', {
        name: /nome completo/i,
      })
      expect(nameInput).toBeInTheDocument()

      // Should have email field
      const emailInput = screen.getByRole('textbox', {
        name: /e-mail/i,
      })
      expect(emailInput).toBeInTheDocument()

      // Should have phone field
      const phoneInput = screen.getByRole('textbox', {
        name: /telefone/i,
      })
      expect(phoneInput).toBeInTheDocument()

      // Should have postal code field
      const postalInput = screen.getByRole('textbox', {
        name: /cep/i,
      })
      expect(postalInput).toBeInTheDocument()

      // Should have password field
      const passwordInput = screen.getByRole('textbox', {
        name: /senha/i,
      })
      expect(passwordInput).toBeInTheDocument()

      // Should have confirm password field
      const confirmPasswordInput = screen.getByRole('textbox', {
        name: /confirmar senha/i,
      })
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

      const passwordInput = screen.getByRole('textbox', {
        name: /senha/i,
      })
      expect(passwordInput).toBeInTheDocument()

      const registerButton = screen.getByRole('button', {
        name: /criar conta/i,
      })
      expect(registerButton).toBeInTheDocument()
    })
  })
})