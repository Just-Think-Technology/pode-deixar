import { Body, Controller, Post, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import getLogger from '../shared/shared-logger';

const logger = getLogger('register');

@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiTags('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() dto: RegisterDto, @Headers('x-forwarded-for') ip?: string) {
    try { logger.info('auth.endpoint', `Register called for ${dto.email}`); } catch (e) {}
    return this.registerService.register(dto, ip);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    try { logger.info('auth.endpoint', `Verify email requested`); } catch (e) {}
    return this.registerService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerificationEmail(@Body() dto: ResendVerificationDto) {
    try { logger.info('auth.endpoint', `Resend verification requested for ${dto.email}`); } catch (e) {}
    return this.registerService.resendVerificationEmail(dto);
  }
}
