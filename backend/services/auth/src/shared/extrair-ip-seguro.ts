import { isIP } from 'net';

/**
 * Extrai o IP do cliente a partir do valor bruto do cabeçalho
 * `x-forwarded-for` de forma segura contra spoofing/injeção de log:
 * remove CR/LF, considera apenas a primeira entrada (cliente original
 * segundo o proxy confiável) e só aceita IPv4/IPv6 válido.
 * Retorna 'unknown' quando ausente ou inválido.
 */
export function extrairIpSeguro(valor?: string): string {
  if (!valor) return 'unknown';
  const primeiro = valor
    .split(',')[0]
    .replace(/[\r\n]/g, '')
    .trim();
  return isIP(primeiro) ? primeiro : 'unknown';
}
