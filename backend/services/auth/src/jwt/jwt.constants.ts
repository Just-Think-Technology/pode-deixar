// Fixed JWT parameters shared by signing, verification, and the Passport strategy to prevent drift between them.
export const JWT_ISSUER = 'pode-deixar-auth';
export const JWT_AUDIENCE = 'pode-deixar';
export const JWT_ALGORITHMS = ['HS256'] as const;
