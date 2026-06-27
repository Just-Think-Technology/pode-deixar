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
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';1
import getLogger from '../shared/shared-logger';

const logger = getLogger('login');

@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiTags('Acesso')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e retornar tokens JWT' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Headers('x-forwarded-for') ip?: string) {
    try { logger.info('auth.endpoint', `Login called for ${dto.email}`); } catch (e) {}
    return this.loginService.login(dto, ip);
  }

  @ApiTags('Acesso')
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try { logger.info('auth.endpoint', `Refresh token requested`); } catch (e) {}
    return this.loginService.refreshToken(dto);
  }

  @ApiTags('Acesso')
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout do usuário (invalidar refresh token)' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Token de autenticação', required: true })
  async logout(@Request() req: any) {
    try { logger.info('auth.endpoint', `Logout requested for user ${req.user?.id}`); } catch (e) {}
    return this.loginService.logout(req.user.id);
  }
}
