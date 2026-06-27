<<<<<<< HEAD
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "./database.health";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Saúde")
@Controller("health")
=======
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
>>>>>>> 68d7f77 (Develop (#13))
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
<<<<<<< HEAD
  @ApiOperation({ summary: "Endpoint de verificação de saúde" })
  @ApiResponse({ status: 200, description: "Serviço saudável" })
  @ApiResponse({ status: 503, description: "Serviço não saudável" })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy("database")]);
  }

  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Endpoint de verificação de prontidão" })
  @ApiResponse({ status: 200, description: "Serviço pronto" })
  @ApiResponse({ status: 503, description: "Serviço não pronto" })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy("database")]);
  }

  @Get("live")
  @ApiOperation({ summary: "Endpoint de verificação de atividade" })
  @ApiResponse({ status: 200, description: "Serviço ativo" })
  async live(): Promise<{ status: string; timestamp: string }> {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
=======
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy('database')]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
>>>>>>> 68d7f77 (Develop (#13))
