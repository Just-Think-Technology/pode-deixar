import {
  baseLayout,
  button,
  secondaryButton,
  divider,
  verificationTemplate,
  passwordResetTemplate,
} from '../email.templates';

// ─── Tests ──────────────────────────────────────────────────────────────────
// Regressão: trava o conteúdo mínimo dos templates (URLs com token, janelas
// de validade e identidade visual). Mudança silenciosa aqui quebra os fluxos
// de verificação de email e reset de senha sem quebrar nenhum teste de API.

describe('email.templates', () => {
  describe('baseLayout()', () => {
    it('deve gerar documento HTML com marca Pode Deixar', () => {
      const html = baseLayout('<p>conteúdo</p>');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Pode');
      expect(html).toContain('Deixar');
      expect(html).toContain('<p>conteúdo</p>');
    });
  });

  describe('button() / secondaryButton() / divider()', () => {
    it('deve embutir label e href no botão primário', () => {
      const html = button('Clique aqui', 'https://app.example.com/x?token=abc');

      expect(html).toContain('Clique aqui');
      expect(html).toContain('href="https://app.example.com/x?token=abc"');
    });

    it('deve neutralizar CRLF e aspas no href do botão primário', () => {
      const html = button('Clique', 'https://app.example.com/x?token=abc"\r\ninjetado');
      const href = html.match(/href="([^"]*)"/)?.[1] ?? '';

      expect(href).not.toMatch(/[\r\n"]/);
      expect(href).toBe('https://app.example.com/x?token=abc%22injetado');
    });

    it('deve embutir label e href no botão secundário', () => {
      const html = secondaryButton('Ver', 'https://app.example.com/y');

      expect(html).toContain('Ver');
      expect(html).toContain('href="https://app.example.com/y"');
    });

    it('deve gerar um divisor', () => {
      expect(divider()).toContain('<table');
    });
  });

  describe('verificationTemplate()', () => {
    it('deve conter a URL com o token e a janela de 24 horas', () => {
      const html = verificationTemplate('https://app.example.com/verify-email?token=tok-1');

      expect(html).toContain('https://app.example.com/verify-email?token=tok-1');
      expect(html).toContain('Confirmar E-mail');
      expect(html).toContain('24 horas');
    });
  });

  describe('passwordResetTemplate()', () => {
    it('deve conter a URL com o token e a janela de 1 hora', () => {
      const html = passwordResetTemplate('https://app.example.com/reset-password?token=tok-2');

      expect(html).toContain('https://app.example.com/reset-password?token=tok-2');
      expect(html).toContain('Redefinir Senha');
      expect(html).toContain('1 hora');
    });
  });
});
