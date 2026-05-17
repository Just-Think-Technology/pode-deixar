import { Controller, Post, Body, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { PasswordManagementService } from './password-management.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import getLogger from '../shared/shared-logger';

const logger = getLogger('password');

@Controller('auth/password')
export class PasswordController {
  constructor(private readonly passwordService: PasswordManagementService) {}

  @Post('forgot')
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() dto: ForgotPasswordDto) {
    try { logger.info('auth.endpoint', `Forgot password requested for ${dto.email}`); } catch (e) {}
    return this.passwordService.forgotPassword(dto);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async reset(@Body() dto: ResetPasswordDto) {
    try { logger.info('auth.endpoint', `Reset password token used`); } catch (e) {}
    return this.passwordService.resetPassword(dto);
  }

  @Post('change')
  @HttpCode(HttpStatus.OK)
  async change(@Request() req: any, @Body() dto: ChangePasswordDto) {
    try { logger.info('auth.endpoint', `Change password requested for user ${req.user?.id}`); } catch (e) {}
    return this.passwordService.changePassword(req.user.id, dto);
  }
}
