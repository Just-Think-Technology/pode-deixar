import { Module } from '@nestjs/common';
import { PasswordManagementService } from './password-management.service';
import { PasswordManagementRepository } from './password-management.repository';
import { PasswordController } from './password.controller';
import { AuthLoggerService } from '../shared/auth-logger.service';
import { PasswordService } from './password.service';
import { LoginModule } from '../login/login.module';

@Module({
  imports: [LoginModule],
  controllers: [PasswordController],
  providers: [
    PasswordManagementService,
    PasswordManagementRepository,
    AuthLoggerService,
    PasswordService,
  ],
  exports: [PasswordManagementService],
})
export class PasswordModule {}
