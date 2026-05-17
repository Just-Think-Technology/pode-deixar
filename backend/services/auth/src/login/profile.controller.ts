import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { LoginService } from './login.service';
import getLogger from '../shared/shared-logger';

const logger = getLogger('profile');

@Controller('auth')
@ApiTags('Perfil')
export class ProfileController {
  constructor(private readonly loginService: LoginService) {}

  @Get('default-profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Bearer token', required: true })
  async getProfile(@Request() req: any) {
    try { logger.info('auth.endpoint', `Profile requested for user ${req.user?.id}`); } catch (e) {}
    const profile = await this.loginService.getProfile(req.user.id);
    return { user: profile };
  }

  @Get('admin-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin-only endpoint' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Bearer token', required: true })
  async adminOnly() {
    return { message: 'This is admin only data' };
  }
}
