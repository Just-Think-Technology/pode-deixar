// Security barrel — public security package exports

export { getHelmetConfig } from './helmet-config';
export * from './helmet-config';
export { RedisThrottlerStorage } from './redis-throttler-storage';
export { sanitizeSensitiveData } from './src/sanitize-sensitive-data';
export { resolverErroPrisma } from './src/resolver-erro-prisma';
export type { ErroPrismaResolvido } from './src/resolver-erro-prisma';
export { JwtAuthGuard } from './src/guards/jwt-auth.guard';
export { RolesGuard } from './src/guards/roles.guard';
export { ROLES_KEY, Roles } from './src/guards/roles.decorator';
export { GlobalExceptionFilter } from './src/global-exception.filter';
export { assertTokenPayload, checkTokenRevocation } from './src/token-validation';
export type { TokenPayload } from './src/token-validation';
