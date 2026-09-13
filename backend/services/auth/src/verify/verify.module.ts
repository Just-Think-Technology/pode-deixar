import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { VerifyRepository } from './verify.repository';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { JWT_AUDIENCE, JWT_ISSUER } from '../jwt/jwt.constants';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
      }),
    }),
  ],
  controllers: [VerifyController],
  providers: [VerifyService, VerifyRepository, AuthLoggerService],
  exports: [VerifyService],
})
export class VerifyModule {}
