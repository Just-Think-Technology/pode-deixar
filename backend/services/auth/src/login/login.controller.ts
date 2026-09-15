// Login controller — authentication and token refresh endpoints

import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LoginService } from './login.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { extractSafeIp } from '../shared/extract-safe-ip';
import { anonymizeEmailForLog } from '../shared/auth-logger.service';
import getLogger from '../shared/shared-logger';

const logger = getLogger('login');

@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiTags('Access')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  // --- Public API ---

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Headers('x-forwarded-for') ip?: string) {
    try {
      logger.info(
        'auth.endpoint',
        `Login called for ${anonymizeEmailForLog(dto.email)}`,
      );
    } catch {}
    return this.loginService.login(dto, extractSafeIp(ip));
  }

  @ApiTags('Access')
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try {
      logger.info('auth.endpoint', `Refresh token requested`);
    } catch {}
    return this.loginService.refreshToken(dto);
  }

  @ApiTags('Access')
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out user (invalidate tokens)' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'Authorization',
    description: 'Authentication token',
    required: true,
  })
  async logout(@Request() req: any) {
    try {
      logger.info('auth.endpoint', `Logout requested for user ${req.user?.id}`);
    } catch {}
    return this.loginService.logout(req.user.id, req.user.jti);
  }
}
