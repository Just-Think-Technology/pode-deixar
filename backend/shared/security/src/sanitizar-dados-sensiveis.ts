const CAMPO_SENSIVEL =
  /(\b[a-z_]*(?:token|password|senha|secret|cvv|cvc|card_number|pan|authorization|access_token|refresh_token)\b[^=:]*[:=]\s*)([^;\s,{}]+)/gi;

const CHAVE_SENSIVEL =
  /(token|password|senha|secret|authorization|cvv|cvc|card_number|pan|verification)/i;

export function sanitizarDadosSensiveis(valor: unknown): unknown {
  if (typeof valor === 'string') {
    return valor.replace(
      CAMPO_SENSIVEL,
      (_match, prefixo: string) => `${prefixo}[REDACTED]`,
    );
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizarDadosSensiveis(item));
  }

  if (valor && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    const resultado: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(objeto)) {
      // eslint-disable-next-line security/detect-object-injection
      resultado[chave] = CHAVE_SENSIVEL.test(chave)
        ? '[REDACTED]'
        : sanitizarDadosSensiveis(item);
    }
    return resultado;
  }

  return valor;
}
