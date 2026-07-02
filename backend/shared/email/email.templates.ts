const COLORS = {
  primary: '#2F80ED',
  secondary: '#27AE60',
  accent: '#F2C94C',
  background: '#F5F6FA',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  white: '#FFFFFF',
  border: '#E0E0E0',
} as const;

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pode Deixar</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
    * { font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.background};font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.background}">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <tr>
            <td align="center" style="padding:0 0 32px">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle">
                    <span style="font-size:28px;font-weight:700;color:${COLORS.primary}">Pode</span>
                    <span style="font-size:28px;font-weight:300;color:${COLORS.secondary}">Deixar</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLORS.white};border-radius:16px;padding:40px 32px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 16px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 12px;font-size:0;line-height:0">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:48px;height:3px;background-color:${COLORS.accent};border-radius:2px">
                      <tr><td style="width:48px;height:3px;background-color:${COLORS.accent};border-radius:2px"></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size:13px;color:${COLORS.textMuted};line-height:1.5">
                    <p style="margin:0 0 4px">Pode Deixar — Sua plataforma de serviços</p>
                    <p style="margin:0">Se você não solicitou este email, ignore-o.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td align="center" style="background-color:${COLORS.primary};border-radius:8px;padding:0">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;letter-spacing:0.3px;border-radius:8px">${label}</a>
      </td>
    </tr>
  </table>`;
}

function secondaryButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td align="center" style="background-color:${COLORS.secondary};border-radius:8px;padding:0">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;letter-spacing:0.3px;border-radius:8px">${label}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td style="height:1px;background-color:${COLORS.border};font-size:0;line-height:0">&nbsp;</td>
    </tr>
  </table>`;
}

function verificationTemplate(verificationUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${COLORS.primary}">Verifique seu e-mail</h1>
    <p style="margin:0 0 4px;font-size:15px;color:${COLORS.text};line-height:1.6">
      Olá! Obrigado por se cadastrar no <strong>Pode Deixar</strong>.
    </p>
    <p style="margin:12px 0 0;font-size:15px;color:${COLORS.text};line-height:1.6">
      Clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta.
    </p>
    ${button('Confirmar E-mail', verificationUrl)}
    <p style="margin:16px 0 0;font-size:13px;color:${COLORS.textMuted};line-height:1.5">
      Link válido por <strong>24 horas</strong>.<br />
      Se não foi você que criou esta conta, ignore este e-mail.
    </p>
  `);
}

function passwordResetTemplate(resetUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${COLORS.primary}">Redefinição de senha</h1>
    <p style="margin:0 0 4px;font-size:15px;color:${COLORS.text};line-height:1.6">
      Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Pode Deixar</strong>.
    </p>
    <p style="margin:12px 0 0;font-size:15px;color:${COLORS.text};line-height:1.6">
      Clique no botão abaixo para criar uma nova senha.
    </p>
    ${button('Redefinir Senha', resetUrl)}
    <p style="margin:16px 0 0;font-size:13px;color:${COLORS.textMuted};line-height:1.5">
      Link válido por <strong>1 hora</strong>.<br />
      Se não foi você que solicitou, ignore este e-mail.
    </p>
  `);
}

export {
  baseLayout,
  button,
  secondaryButton,
  divider,
  verificationTemplate,
  passwordResetTemplate,
};
