// Authenticated request — JWT user attached by the JwtAuthGuard

import { IUser } from "./user.decorator";

export interface AuthenticatedRequest {
  user: IUser;
  ip?: string;
}
