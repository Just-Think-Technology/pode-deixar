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
import { extrairIpSeguro } from '../shared/extrair-ip-seguro';
import { anonimizarEmailParaLog } from '../shared/auth-logger.service';
import getLogger from '../shared/shared-logger';

const logger = getLogger('login');

@Controller('auth')
@UseGuards(ThrottlerGuard)
@ApiTags('Acesso')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Autenticar usuário e retornar tokens JWT' })
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Headers('x-forwarded-for') ip?: string) {
    try {
      logger.info(
        'auth.endpoint',
        `Login called for ${anonimizarEmailParaLog(dto.email)}`,
      );
    } catch {}
    return this.loginService.login(dto, extrairIpSeguro(ip));
  }

  @ApiTags('Acesso')
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Atualizar token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try {
      logger.info('auth.endpoint', `Refresh token requested`);
    } catch {}
    return this.loginService.refreshToken(dto);
  }

  @ApiTags('Acesso')
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout do usuário (invalidar tokens)' })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'Authorization',
    description: 'Token de autenticação',
    required: true,
  })
  async logout(@Request() req: any) {
    try {
      logger.info('auth.endpoint', `Logout requested for user ${req.user?.id}`);
    } catch {}
    return this.loginService.logout(req.user.id, req.user.jti);
  }
}
