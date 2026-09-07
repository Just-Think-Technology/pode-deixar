/**
 * Parâmetros JWT fixos do serviço de autenticação.
 * Centraliza emissor, audiência e algoritmos para evitar divergência
 * entre emissão (sign), verificação (verify) e estratégia Passport.
 */
export const EMISSOR_JWT = 'pode-deixar-auth';
export const AUDIENCIA_JWT = 'pode-deixar';
export const ALGORITMOS_JWT = ['HS256'] as const;
