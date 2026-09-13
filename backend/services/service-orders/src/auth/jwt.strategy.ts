// JWT strategy — access-token validation

import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import {
  assertTokenPayload,
  checkTokenRevocation,
  TokenPayload,
} from "@pode-deixar/security";
import { PrismaService } from "../prisma/prisma.service";

interface StrategyPayload extends TokenPayload {
  email?: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  // --- Public API ---

  async validate(payload: StrategyPayload) {
    assertTokenPayload(payload);
    await checkTokenRevocation(
      (jti) => this.prisma.tokenBlacklist.findUnique({ where: { jti } }),
      payload.jti,
    );

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
