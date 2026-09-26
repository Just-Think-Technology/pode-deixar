// Payments root module — service wiring and validation setup

import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "@pode-deixar/prisma";
import { NotificationsModule } from "@pode-deixar/notifications";
import { PaymentsModule } from "./payments/payments.module";
import { GatewayModule } from "./gateway/gateway.module";
import { HealthModule } from "@pode-deixar/prisma";
import { SharedModule } from "./shared/shared.module";
import { CommonModule } from "./shared/common.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { createResponseLoggerInterceptor } from "@pode-deixar/logger";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";
import {
  translateValidationErrors as translateSharedErrors,
  FieldLabels,
} from "@pode-deixar/validation";

// Payments field labels (user-facing, in Portuguese); restriction messages live in the shared core.
const PAYMENTS_FIELD_LABELS: FieldLabels = {
  serviceOrderId: "ID do pedido",
  amount: "Valor",
  method: "Método de pagamento",
  paymentId: "ID do pagamento",
  externalId: "ID externo da transação",
};

function translateValidationErrors(errors: ValidationError[]): string[] {
  return translateSharedErrors(errors, PAYMENTS_FIELD_LABELS);
}

@Module({
  // --- Imports ---

  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`../../.env.${process.env.NODE_ENV || "development"}`],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const isProd = process.env.NODE_ENV === "production";
        return [
          {
            ttl: 60000,
            limit: 100,
            storage: isProd ? new RedisThrottlerStorage() : undefined,
          },
        ];
      },
    }),
    PrismaModule,
    NotificationsModule,
    PaymentsModule,
    GatewayModule,
    HealthModule,
    CommonModule,
    SharedModule,
  ],

  // --- Controllers ---

  controllers: [AppController],

  // --- Providers ---

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) =>
          new BadRequestException(translateValidationErrors(errors)),
      }),
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: createResponseLoggerInterceptor("payments-service"),
    },
  ],
})
export class AppModule {}
