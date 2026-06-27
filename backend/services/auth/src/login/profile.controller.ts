import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { LoginService } from './login.service';
import { PrismaService } from '../prisma/prisma.service';
import getLogger from '../shared/shared-logger';

const logger = getLogger('profile');

@Controller('auth')
@ApiTags('Perfil')
export class ProfileController {
  constructor(
    private readonly loginService: LoginService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('default-profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter perfil do usuário atual' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Token de autenticação', required: true })
  async getProfile(@Request() req: any) {
    try { logger.info('auth.endpoint', `Profile requested for user ${req.user?.id}`); } catch (e) {}
    const profile = await this.loginService.getProfile(req.user.id);
    return { user: profile };
  }

  @Get('client-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Endpoint exclusivo para clientes' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Token de autenticação', required: true })
  async clientOnly() {
    return { message: 'Apenas clientes podem acessar este recurso' };
  }

  @Get('admin-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Endpoint exclusivo para administradores' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Token de autenticação', required: true })
  async adminOnly() {
    return { message: 'Apenas administradores podem acessar este recurso' };
  }

  @Get('provider-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @ApiOperation({ summary: 'Endpoint exclusivo para prestadores' })
  @ApiBearerAuth()
  @ApiHeader({ name: 'Authorization', description: 'Token de autenticação', required: true })
  async providerOnly() {
    return { message: 'Apenas prestadores podem acessar este recurso' };
  }

  @Patch('users/:id/promote-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Promover usuário a ADMIN (apenas admin)' })
  @ApiBearerAuth()
  async promoteToAdmin(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role: Role.ADMIN },
      select: { id: true, email: true, role: true },
    });
  }
}