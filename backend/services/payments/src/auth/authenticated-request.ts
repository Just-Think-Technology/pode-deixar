// Authenticated request — Express request with the JWT subject attached

import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}
