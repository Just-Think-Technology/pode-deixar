import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiHeader } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoginService } from './login.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import getLogger from '../common/shared-logger';

const logger = getLogger('auth-service');

@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiTags('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Headers('x-forwarded-for') ip?: string, @Headers('user-agent') userAgent?: string) {
    try { logger.info('auth.endpoint', `Login called for ${dto.email}`); } catch (e) {}
    return this.loginService.login(dto, ip, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try { logger.info('auth.endpoint', `Refresh token requested`); } catch (e) {}
    return this.loginService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user (invalidate refresh token)' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Bearer token', required: true })
  async logout(@Request() req: any) {
    try { logger.info('auth.endpoint', `Logout requested for user ${req.user?.id}`); } catch (e) {}
    return this.loginService.logout(req.user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Bearer token', required: true })
  async getProfile(@Request() req: any) {
    try { logger.info('auth.endpoint', `Profile requested for user ${req.user?.id}`); } catch (e) {}
    const profile = await this.loginService.getProfile(req.user.id);
    return { user: profile };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin-only endpoint' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Bearer token', required: true })
  async adminOnly() {
    return { message: 'This is admin only data' };
  }
}
