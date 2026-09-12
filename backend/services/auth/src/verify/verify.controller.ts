import { Controller, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { VerifyService } from './verify.service';

// --- Public API ---
@Controller('auth')
@ApiTags('Access')
export class VerifyController {
  constructor(private readonly verifyService: VerifyService) {}

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate access token and return user data',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Authentication token (Bearer)',
    required: false,
  })
  async verify(@Headers('authorization') authorization?: string) {
    const accessToken = authorization?.replace('Bearer ', '') ?? null;
    return this.verifyService.verify(accessToken);
  }
}
