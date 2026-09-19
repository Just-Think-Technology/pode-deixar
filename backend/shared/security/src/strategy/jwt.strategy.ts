// JWT strategy — access-token validation

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "@pode-deixar/prisma";
import {
  assertTokenPayload,
  checkTokenRevocation,
  TokenPayload,
} from "../token-validation";
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from "../jwt.constants";

interface StrategyPayload extends TokenPayload {
  email?: unknown;
  type?: unknown;
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
      algorithms: [...JWT_ALGORITHMS],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  // --- Public API ---

  async validate(payload: StrategyPayload) {
    if (payload.type !== "access") {
      assertTokenPayload({ sub: null, role: null });
    }
    assertTokenPayload(payload);
    await checkTokenRevocation(
      (jti) => this.prisma.tokenBlacklist.findUnique({ where: { jti } }),
      payload.jti,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      const { UnauthorizedException } = await import("@nestjs/common");
      throw new UnauthorizedException("Usuário não encontrado ou inativo");
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
