import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "./prisma/prisma.module";
import { PaymentsModule } from "./payments/payments.module";
import { GatewayModule } from "./gateway/gateway.module";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./shared/shared.module";
import { CommonModule } from "./shared/common.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { ResponseLoggerInterceptor } from "./shared/response-logger.interceptor";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";

function translateValidationErrors(errors: ValidationError[]): string[] {
  const fieldLabels: Record<string, string> = {
    serviceOrderId: "ID do pedido",
    amount: "Valor",
    method: "Método de pagamento",
    paymentId: "ID do pagamento",
    externalId: "ID externo da transação",
  };

  const constraintTranslators: Record<string, (label: string) => string> = {
    isString: (label) => `${label} deve ser uma string`,
    isNotEmpty: (label) => `${label} não pode estar vazio`,
    isNumber: (label) => `${label} deve ser um número`,
    isInt: (label) => `${label} deve ser um número inteiro`,
    isPositive: (label) => `${label} deve ser um número positivo`,
    isEnum: (label) => `${label} deve ser um valor válido`,
    isUuid: (label) => `${label} deve ser um UUID válido`,
    min: (label) => `${label} não pode ser menor que 0`,
    maxLength: (label) => `${label} está muito longo`,
  };

  return errors.map((error) => {
    if (!error.constraints)
      return `${fieldLabels[error.property] || error.property} inválido`;
    return Object.entries(error.constraints)
      .map(([key, defaultMessage]) => {
        // Safe: the key comes from the constraint entry being processed.
        // eslint-disable-next-line security/detect-object-injection
        const translator = constraintTranslators[key];

        return translator
          ? translator(fieldLabels[error.property] || error.property)
          : defaultMessage;
      })
      .join("; ");
  });
}

@Module({
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
    PaymentsModule,
    GatewayModule,
    HealthModule,
    CommonModule,
    SharedModule,
  ],
  controllers: [AppController],
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
      useClass: ResponseLoggerInterceptor,
    },
  ],
})
export class AppModule {}
