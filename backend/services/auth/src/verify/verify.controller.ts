import { Controller, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { VerifyService } from './verify.service';

@Controller('auth')
@ApiTags('Acesso')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validar token de acesso e retornar dados do usuário',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Token de autenticação (Bearer)',
    required: false,
  })
  async verify(@Headers('authorization') authorization?: string) {
    const accessToken = authorization?.replace('Bearer ', '') ?? null;
    return this.verifyService.verify(accessToken);
  }
}
