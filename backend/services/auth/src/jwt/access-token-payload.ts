// Access token payload — single shape shared by verification and strategy

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  jti?: string;
}
