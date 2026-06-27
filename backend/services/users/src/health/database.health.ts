<<<<<<< HEAD
import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";
=======
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
>>>>>>> 68d7f77 (Develop (#13))

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
<<<<<<< HEAD
      throw new HealthCheckError(
        "Verificação do banco de dados falhou",
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
=======
      throw new HealthCheckError('Database check failed', this.getStatus(key, false, { message: error.message }));
    }
  }
}
>>>>>>> 68d7f77 (Develop (#13))
