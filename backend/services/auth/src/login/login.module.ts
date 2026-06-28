import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LoginService } from './login.service';
import { LoginController } from './login.controller';

import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from '../password/password.service';
import { JwtStrategy } from '../jwt/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [LoginController],
  providers: [
    LoginService,
    PrismaService,
    AuthLoggerService,
    PasswordService,
    JwtStrategy,
  ],
  exports: [LoginService, JwtStrategy, PassportModule],
})
export class LoginModule {}
