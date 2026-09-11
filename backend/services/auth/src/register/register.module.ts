import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { PrismaService } from '@pode-deixar/prisma';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from '../password/password.service';

@Module({
  controllers: [RegisterController],
  providers: [
    RegisterService,
    PrismaService,
    AuthLoggerService,
    PasswordService,
  ],
  exports: [RegisterService],
})
export class RegisterModule {}
