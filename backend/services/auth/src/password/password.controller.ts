import { Controller, Post, Put, Body, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PasswordManagementService } from './password-management.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import getLogger from '../shared/shared-logger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';

const logger = getLogger('password');

@Controller('auth')
@ApiTags('Senha')
export class PasswordController {
  constructor(private readonly passwordService: PasswordManagementService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgot(@Body() dto: ForgotPasswordDto) {
    try { logger.info('auth.endpoint', `Forgot password requested for ${dto.email}`); } catch {}
    return this.passwordService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async reset(@Body() dto: ResetPasswordDto) {
    try { logger.info('auth.endpoint', `Reset password token used`); } catch {}
    return this.passwordService.resetPassword(dto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async change(@Request() req: any, @Body() dto: ChangePasswordDto) {
    try { logger.info('auth.endpoint', `Change password requested for user ${req.user?.id}`); } catch {}
    return this.passwordService.changePassword(req.user.id, dto);
  }
}
