const CAMPO_SENSIVEL =
  /(\b[a-z_]*(?:cvv|cvc|security_code|card_number|cardholder|expiration|expiry|pan|card_data)\b[^=:]*[:=]\s*)([^;\s,{}]+)/gi;

function redigirNumeroCartao(texto: string): string {
  return texto.replace(/(?<![\d-])(\d[\d\s-]{11,17}\d)(?![\d-])/g, (match) => {
    const digitos = match.replace(/\D/g, "");
    if (digitos.length < 13 || digitos.length > 19) return match;
    return `[CARD-****${digitos.slice(-4)}]`;
  });
}

export function sanitizarDadosSensiveis(texto: string): string {
  if (!texto) return texto;

  const comCamposRedigidos = texto.replace(
    CAMPO_SENSIVEL,
    (_match, prefixo: string) => `${prefixo}[REDACTED]`,
  );

  return redigirNumeroCartao(comCamposRedigidos);
}
