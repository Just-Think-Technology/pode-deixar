import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../common/auth-logger.service';
import { EmailService } from '../common/email.service';
import { PasswordService } from '../common/password.service';

@Module({
  controllers: [RegisterController],
  providers: [RegisterService, PrismaService, AuthLoggerService, EmailService, PasswordService],
  exports: [RegisterService],
})
export class RegisterModule {}
