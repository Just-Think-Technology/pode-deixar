import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
<<<<<<< HEAD
import { PrismaService } from "../prisma/prisma.service";

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
=======

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "default-secret",
>>>>>>> 68d7f77 (Develop (#13))
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.role) {
<<<<<<< HEAD
      throw new UnauthorizedException("Payload do token inválido");
    }

    if (payload.jti) {
      try {
        const blacklisted = await this.prisma.tokenBlacklist.findUnique({
          where: { jti: payload.jti },
        });

        if (blacklisted) {
          throw new UnauthorizedException("Token revogado");
        }
      } catch (e: any) {
        if (e?.code !== "P2021") throw e;
      }
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
=======
      throw new UnauthorizedException("Invalid token payload");
    }
    return { sub: payload.sub, email: payload.email, role: payload.role };
>>>>>>> 68d7f77 (Develop (#13))
  }
}
