import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../auth/jwt.strategy";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
<<<<<<< HEAD
import { UsersLoggerService } from "./users-logger.service";
=======
>>>>>>> 68d7f77 (Develop (#13))

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
<<<<<<< HEAD
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
=======
        secret: config.get<string>("JWT_SECRET") || "default-secret",
>>>>>>> 68d7f77 (Develop (#13))
        signOptions: { expiresIn: "1h" },
      }),
      inject: [ConfigService],
    }),
  ],
<<<<<<< HEAD
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard, UsersLoggerService],
  exports: [
    JwtModule,
    PassportModule,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    UsersLoggerService,
  ],
=======
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, PassportModule, JwtStrategy, JwtAuthGuard, RolesGuard],
>>>>>>> 68d7f77 (Develop (#13))
})
export class SharedModule {}
