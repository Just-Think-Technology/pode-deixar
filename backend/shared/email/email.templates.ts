function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pode Deixar</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
          <tr>
            <td align="center" style="padding:0 0 24px">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle">
                    <span style="font-size:28px;font-weight:700;color:#eab308">Pode</span>
                    <span style="font-size:28px;font-weight:300;color:#18181b">Deixar</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              ${content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 16px 0;font-size:13px;color:#a1a1aa">
              <p style="margin:0 0 4px">Pode Deixar — Sua plataforma de serviços</p>
              <p style="margin:0">Se você não solicitou este email, ignore-o.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr>
      <td align="center" style="background-color:#eab308;border-radius:8px;padding:0">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:600;color:#18181b;text-decoration:none;letter-spacing:0.3px;border-radius:8px">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function verificationTemplate(verificationUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b">Bem-vindo!</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#52525b;line-height:1.6">
      Obrigado por se cadastrar. Para começar a usar sua conta, confirme seu endereço de email.
    </p>
    ${button(verificationUrl, 'Verificar Email')}
    <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5">
      Este link expira em <strong>24 horas</strong>.<br />
      Se você não criou uma conta, ignore este email.
    </p>
  `);
}

export function passwordResetTemplate(resetUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b">Redefinição de senha</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#52525b;line-height:1.6">
      Recebemos uma solicitação para redefinir a senha da sua conta.
    </p>
    ${button(resetUrl, 'Redefinir Senha')}
    <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5">
      Este link expira em <strong>1 hora</strong>.<br />
      Se você não solicitou esta redefinição, ignore este email.
    </p>
  `);
}
