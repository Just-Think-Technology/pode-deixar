const CAMPO_SENSIVEL =
  /(\b[a-z_]*(?:token|password|senha|secret|cvv|cvc|card_number|pan|authorization|access_token|refresh_token)\b[^=:]*[:=]\s*)([^;\s,{}]+)/gi;

const CHAVE_SENSIVEL =
  /(token|password|senha|secret|authorization|cvv|cvc|card.?num|pan|verification|cpf|cnpj|api.?key|client_secret|cookie|session|pix)/i;

// PAN solto (13–19 dígitos, com espaços/hífens opcionais) — validado via Luhn.
const PAN_SOLTO = /\b\d(?:[ -]?\d){12,18}\b/g;
// CPF solto (formatado ou só dígitos) — redação direta, sem validação de dígito.
const CPF_SOLTO = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g;

const CHAVE_PERIGOSA = new Set(['__proto__', 'constructor', 'prototype']);

function luhnValido(digitos: string): boolean {
  let soma = 0;
  let dobrar = false;
  for (let i = digitos.length - 1; i >= 0; i--) {
    let d = Number(digitos[i]);
    if (dobrar) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
    dobrar = !dobrar;
  }
  return soma % 10 === 0;
}

export function sanitizarDadosSensiveis(
  valor: unknown,
  visitados: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof valor === 'string') {
    const comCampos = valor.replace(
      CAMPO_SENSIVEL,
      (_match, prefixo: string) => `${prefixo}[REDACTED]`,
    );
    const comPan = comCampos.replace(PAN_SOLTO, (trecho) => {
      const digitos = trecho.replace(/\D/g, '');
      if (digitos.length < 13 || digitos.length > 19) return trecho;
      return luhnValido(digitos) ? '[REDACTED]' : trecho;
    });
    return comPan.replace(CPF_SOLTO, '[REDACTED]');
  }

  if (Array.isArray(valor)) {
    if (visitados.has(valor)) return '[CIRCULAR]';
    visitados.add(valor);
    return valor.map((item) => sanitizarDadosSensiveis(item, visitados));
  }

  if (valor && typeof valor === 'object') {
    if (visitados.has(valor)) return '[CIRCULAR]';
    visitados.add(valor);
    const objeto = valor as Record<string, unknown>;
    const resultado: Record<string, unknown> = {};
    for (const [chave, item] of Object.entries(objeto)) {
      // Ignora chaves de prototype pollution — nunca copia nem interpreta.
      if (CHAVE_PERIGOSA.has(chave)) continue;
      // eslint-disable-next-line security/detect-object-injection
      resultado[chave] = CHAVE_SENSIVEL.test(chave)
        ? '[REDACTED]'
        : sanitizarDadosSensiveis(item, visitados);
    }
    return resultado;
  }

  return valor;
}
