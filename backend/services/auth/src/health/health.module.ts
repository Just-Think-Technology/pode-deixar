// Health module — liveness and database check wiring

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health';
import { PrismaModule } from '../prisma/prisma.module';

@Module({

  // --- Imports ---

  imports: [TerminusModule, PrismaModule],

  // --- Controllers ---

  controllers: [HealthController],

  // --- Providers ---

  providers: [DatabaseHealthIndicator],
  exports: [DatabaseHealthIndicator],
})
export class HealthModule {}
