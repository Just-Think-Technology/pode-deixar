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
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
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
