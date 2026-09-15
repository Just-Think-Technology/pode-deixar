// Authenticated request — JWT subject attached by the JwtAuthGuard

export interface AuthenticatedRequest {
  user: {
    sub: string;
  };
}
