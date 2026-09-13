// Sensitive data sanitizer — card and secret redaction for logs

const SENSITIVE_FIELD =
  /(\b[a-z_]*(?:cvv|cvc|security_code|card_number|cardholder|expiration|expiry|pan|card_data|password|passwd|pwd|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|jwt|bearer|client[_-]?secret|private[_-]?key)\b[^=:]*[:=]\s*)([^;\s,{}]+)/gi;

function redactCardNumber(text: string): string {
  return text.replace(/(?<![\d-])(\d[\d\s-]{11,17}\d)(?![\d-])/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return match;
    return `[CARD-****${digits.slice(-4)}]`;
  });
}

export function sanitizeSensitiveData(text: string): string {
  if (!text) return text;

  const withFieldsRedacted = text.replace(
    SENSITIVE_FIELD,
    (_match, prefix: string) => `${prefix}[REDACTED]`,
  );

  return redactCardNumber(withFieldsRedacted);
}
