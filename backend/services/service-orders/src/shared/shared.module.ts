// Shared module — global auth and logging wiring

import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../auth/jwt.strategy";
import { JwtAuthGuard, RolesGuard } from "@pode-deixar/security";
import { ServicesLoggerService } from "./services-logger.service";

@Global()
@Module({

  // --- Imports ---

  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: "1h" },
      }),
      inject: [ConfigService],
    }),
  ],

  // --- Providers ---

  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, ServicesLoggerService],
  exports: [
    JwtModule,
    PassportModule,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ServicesLoggerService,
  ],
})
export class SharedModule {}
