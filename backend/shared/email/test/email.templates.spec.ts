// Email template tests — layout and component rendering

import {
  baseLayout,
  button,
  secondaryButton,
  divider,
  verificationTemplate,
  passwordResetTemplate,
} from '../email.templates';

// --- Tests ---

describe('email.templates', () => {
  describe('baseLayout()', () => {
    it('should generate an HTML document with the Pode Deixar brand', () => {
      const html = baseLayout('<p>conteúdo</p>');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Pode');
      expect(html).toContain('Deixar');
      expect(html).toContain('<p>conteúdo</p>');
    });
  });

  describe('button() / secondaryButton() / divider()', () => {
    it('should embed label and href in the primary button', () => {
      const html = button('Clique aqui', 'https://app.example.com/x?token=abc');

      expect(html).toContain('Clique aqui');
      expect(html).toContain('href="https://app.example.com/x?token=abc"');
    });

    it('should neutralize CRLF and quotes in the primary button href', () => {
      const html = button('Clique', 'https://app.example.com/x?token=abc"\r\ninjetado');
      const href = html.match(/href="([^"]*)"/)?.[1] ?? '';

      expect(href).not.toMatch(/[\r\n"]/);
      expect(href).toBe('https://app.example.com/x?token=abc%22injetado');
    });

    it('should embed label and href in the secondary button', () => {
      const html = secondaryButton('Ver', 'https://app.example.com/y');

      expect(html).toContain('Ver');
      expect(html).toContain('href="https://app.example.com/y"');
    });

    it('should generate a divider', () => {
      expect(divider()).toContain('<table');
    });
  });

  describe('verificationTemplate()', () => {
    it('should contain the URL with the token and the 24-hour window', () => {
      const html = verificationTemplate('https://app.example.com/verify-email?token=tok-1');

      expect(html).toContain('https://app.example.com/verify-email?token=tok-1');
      expect(html).toContain('Confirmar E-mail');
      expect(html).toContain('24 horas');
    });
  });

  describe('passwordResetTemplate()', () => {
    it('should contain the URL with the token and the 1-hour window', () => {
      const html = passwordResetTemplate('https://app.example.com/reset-password?token=tok-2');

      expect(html).toContain('https://app.example.com/reset-password?token=tok-2');
      expect(html).toContain('Redefinir Senha');
      expect(html).toContain('1 hora');
    });
  });
});
