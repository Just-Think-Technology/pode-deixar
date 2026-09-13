// Register module — signup and email verification wiring

import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from '../password/password.service';

@Module({

  // --- Controllers ---

  controllers: [RegisterController],

  // --- Providers ---

  providers: [
    RegisterService,
    PrismaService,
    AuthLoggerService,
    PasswordService,
  ],
  exports: [RegisterService],
})
export class RegisterModule {}
