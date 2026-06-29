import { Module } from '@nestjs/common';
import { LoginModule } from './login/login.module';
import { RegisterModule } from './register/register.module';
import { PasswordModule } from './password/password.module';
import { VerifyModule } from './verify/verify.module';

@Module({
  imports: [LoginModule, RegisterModule, PasswordModule, VerifyModule],
  exports: [LoginModule, RegisterModule, PasswordModule, VerifyModule],
})
export class AuthModule {}
