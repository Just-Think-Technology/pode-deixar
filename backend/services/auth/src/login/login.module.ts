import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LoginService } from './login.service';
import { LoginController } from './login.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthLoggerService } from '../common/auth-logger.service';
import { PasswordService } from '../common/password.service';

@Module({
  imports: [ConfigModule, JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => ({
      secret: config.get<string>('JWT_ACCESS_SECRET'),
    }),
  })],
  controllers: [LoginController],
  providers: [LoginService, PrismaService, AuthLoggerService, PasswordService],
  exports: [LoginService],
})
export class LoginModule {}
