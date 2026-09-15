// Authenticated request — Express request with the JWT user attached

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    jti?: string;
  };
}
