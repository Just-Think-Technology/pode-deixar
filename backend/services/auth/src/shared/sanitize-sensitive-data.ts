const SENSITIVE_FIELD =
  /(\b[a-z_]*(?:token|password|senha|secret|cvv|cvc|card_number|pan|authorization|access_token|refresh_token)\b[^=:]*[:=]\s*)([^;\s,{}]+)/gi;

const SENSITIVE_KEY =
  /(token|password|senha|secret|authorization|cvv|cvc|card_number|pan|verification)/i;

export function sanitizeSensitiveData(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(
      SENSITIVE_FIELD,
      (_match, prefix: string) => `${prefix}[REDACTED]`,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(source)) {
      // Safe: the key comes from the source object's own entries.
      // eslint-disable-next-line security/detect-object-injection
      result[key] = SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : sanitizeSensitiveData(item);
    }
    return result;
  }

  return value;
}
