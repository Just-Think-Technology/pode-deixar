// Authenticated request — JWT subject and role attached by the JwtAuthGuard

export interface AuthenticatedRequest {
  user: {
    sub: string;
    role: string;
  };
  ip?: string;
}
