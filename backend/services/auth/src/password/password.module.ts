// Password module — reset and change flow wiring

import { Module } from '@nestjs/common';
import { PasswordManagementService } from './password-management.service';
import { PasswordController } from './password.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from './password.service';
import { LoginModule } from '../login/login.module';

@Module({

  // --- Imports ---

  imports: [LoginModule],

  // --- Controllers ---

  controllers: [PasswordController],

  // --- Providers ---

  providers: [
    PasswordManagementService,
    PrismaService,
    AuthLoggerService,
    PasswordService,
  ],
  exports: [PasswordManagementService],
})
export class PasswordModule {}
