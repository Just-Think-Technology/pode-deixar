// Health controller — liveness and readiness endpoints

import { Controller, Get } from "@nestjs/common";
import { HealthCheckService, HealthCheckResult } from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "./database.health";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  // --- Public API ---

  @Get()
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({ status: 200, description: "Service healthy" })
  @ApiResponse({ status: 503, description: "Service unhealthy" })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy("database")]);
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness check endpoint" })
  @ApiResponse({ status: 200, description: "Service ready" })
  @ApiResponse({ status: 503, description: "Service not ready" })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.isHealthy("database")]);
  }

  @Get("live")
  @ApiOperation({ summary: "Liveness check endpoint" })
  @ApiResponse({ status: 200, description: "Service alive" })
  async live(): Promise<{ status: string; timestamp: string }> {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
