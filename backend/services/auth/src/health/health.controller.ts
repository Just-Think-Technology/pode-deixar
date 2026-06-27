import { Controller, Get } from '@nestjs/common';
<<<<<<< HEAD
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Saúde')
=======
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
>>>>>>> 68d7f77 (Develop (#13))
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
<<<<<<< HEAD
  @ApiOperation({ summary: 'Endpoint de verificação de saúde' })
  @ApiResponse({ status: 200, description: 'Serviço saudável' })
  @ApiResponse({ status: 503, description: 'Serviço não saudável' })
=======
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
>>>>>>> 68d7f77 (Develop (#13))
  async check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Get('ready')
  @HealthCheck()
<<<<<<< HEAD
  @ApiOperation({ summary: 'Endpoint de verificação de prontidão' })
  @ApiResponse({ status: 200, description: 'Serviço pronto' })
  @ApiResponse({ status: 503, description: 'Serviço não pronto' })
=======
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
>>>>>>> 68d7f77 (Develop (#13))
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Get('live')
<<<<<<< HEAD
  @ApiOperation({ summary: 'Endpoint de verificação de atividade' })
  @ApiResponse({ status: 200, description: 'Serviço ativo' })
  async live(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
=======
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
>>>>>>> 68d7f77 (Develop (#13))
