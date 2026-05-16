import { Module } from '@nestjs/common';
import { PasswordManagementService } from './password-management.service';
import { PasswordController } from './password.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../common/auth-logger.service';
import { EmailService } from '../common/email.service';
import { PasswordService } from '../common/password.service';

@Module({
  controllers: [PasswordController],
  providers: [PasswordManagementService, PrismaService, AuthLoggerService, EmailService, PasswordService],
  exports: [PasswordManagementService],
})
export class PasswordModule {}
