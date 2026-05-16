import {
  Body,
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import getLogger from '@pode-deixar/common/shared-logger';

const logger = getLogger('auth-service');

@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiTags('auth')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            complete_name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            phone: { type: 'string' },
            postal_code: { type: 'string' },
            email_verified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() dto: RegisterDto,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    try { logger.info('auth.endpoint', `Register called for ${dto.email}`); } catch (e) {}
    return this.registerService.register(dto, ip);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    try { logger.info('auth.endpoint', `Verify email requested`); } catch (e) {}
    return this.registerService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified',
  })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerificationEmail(@Body() dto: ResendVerificationDto) {
    try { logger.info('auth.endpoint', `Resend verification requested for ${dto.email}`); } catch (e) {}
    return this.registerService.resendVerificationEmail(dto);
  }
}