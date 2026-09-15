import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { JwtStrategy } from "../strategy/jwt.strategy";

export interface AuthSharedModuleOptions {
  logger?: Type;
}

@Global()
@Module({})
export class AuthSharedModule {
  static register(options: AuthSharedModuleOptions): DynamicModule {
    const extras = options.logger ? [options.logger] : [];
    return {
      module: AuthSharedModule,
      global: true,
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
      providers: [JwtStrategy, JwtAuthGuard, RolesGuard, ...extras],
      exports: [
        JwtModule,
        PassportModule,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        ...extras,
      ],
    };
  }
}
