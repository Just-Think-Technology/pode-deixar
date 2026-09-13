// Sensitive data sanitizer — PAN and PII redaction

const SENSITIVE_FIELD =
  /(\b[a-z_]*(?:token|password|senha|secret|cvv|cvc|card_number|pan|authorization|access_token|refresh_token)\b[^=:]*[:=]\s*)([^;\s,{}]+)/gi;

const SENSITIVE_KEY =
  /(token|password|senha|secret|authorization|cvv|cvc|card.?num|pan|verification|cpf|cnpj|api.?key|client_secret|cookie|session|pix)/i;

const BARE_PAN = /\b\d(?:[ -]?\d){12,18}\b/g;
const BARE_CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function sanitizeSensitiveData(
  value: unknown,
  visited: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof value === 'string') {
    const withFields = value.replace(
      SENSITIVE_FIELD,
      (_match, prefix: string) => `${prefix}[REDACTED]`,
    );
    const withPan = withFields.replace(BARE_PAN, (chunk) => {
      const digits = chunk.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return chunk;
      return isValidLuhn(digits) ? '[REDACTED]' : chunk;
    });
    return withPan.replace(BARE_CPF, '[REDACTED]');
  }

  if (Array.isArray(value)) {
    if (visited.has(value)) return '[CIRCULAR]';
    visited.add(value);
    return value.map((item) => sanitizeSensitiveData(item, visited));
  }

  if (value && typeof value === 'object') {
    if (visited.has(value)) return '[CIRCULAR]';
    visited.add(value);
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      // Copying these keys would enable prototype pollution.
      if (DANGEROUS_KEYS.has(key)) continue;
      // Safe: the key comes from the source object's own entries.
      // eslint-disable-next-line security/detect-object-injection
      result[key] = SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : sanitizeSensitiveData(item, visited);
    }
    return result;
  }

  return value;
}
