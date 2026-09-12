import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterRepository } from './register.repository';
import { RegisterController } from './register.controller';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from '../password/password.service';

@Module({
  controllers: [RegisterController],
  providers: [
    RegisterService,
    RegisterRepository,
    AuthLoggerService,
    PasswordService,
  ],
  exports: [RegisterService],
})
export class RegisterModule {}
