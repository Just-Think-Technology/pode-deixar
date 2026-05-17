import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { EmailService } from '../send_email/email.service';
import { PasswordService } from '../password/password.service';

@Module({
  controllers: [RegisterController],
  providers: [RegisterService, PrismaService, AuthLoggerService, EmailService, PasswordService],
  exports: [RegisterService],
})
export class RegisterModule {}
