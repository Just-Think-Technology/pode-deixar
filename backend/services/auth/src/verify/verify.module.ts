import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerifyController } from './verify.controller';
import { VerifyService } from './verify.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { AUDIENCIA_JWT, EMISSOR_JWT } from '../jwt/jwt.constantes';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { issuer: EMISSOR_JWT, audience: AUDIENCIA_JWT },
      }),
    }),
  ],
  controllers: [VerifyController],
  providers: [VerifyService, PrismaService, AuthLoggerService],
  exports: [VerifyService],
})
export class VerifyModule {}
