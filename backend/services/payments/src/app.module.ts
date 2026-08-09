import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "./prisma/prisma.module";
import { PaymentsModule } from "./payments/payments.module";
import { MercadoPagoModule } from "./mercadopago/mercadopago.module";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./shared/shared.module";
import { CommonModule } from "./shared/common.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { ResponseLoggerInterceptor } from "./shared/response-logger.interceptor";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";

function traduzirErrosValidacao(errors: ValidationError[]): string[] {
  const rotulos: Record<string, string> = {
    serviceOrderId: "ID do pedido",
    amount: "Valor",
    method: "Método de pagamento",
    paymentId: "ID do pagamento",
    externalId: "ID externo da transação",
  };

  const traducoes: Record<string, (r: string) => string> = {
    isString: (r) => `${r} deve ser uma string`,
    isNotEmpty: (r) => `${r} não pode estar vazio`,
    isNumber: (r) => `${r} deve ser um número`,
    isInt: (r) => `${r} deve ser um número inteiro`,
    isPositive: (r) => `${r} deve ser um número positivo`,
    isEnum: (r) => `${r} deve ser um valor válido`,
    isUuid: (r) => `${r} deve ser um UUID válido`,
    min: (r) => `${r} não pode ser menor que 0`,
    maxLength: (r) => `${r} está muito longo`,
  };

  return errors.map((error) => {
    if (!error.constraints)
      return `${rotulos[error.property] || error.property} inválido`;
    return Object.entries(error.constraints)
      .map(([chave, msg]) => {
        // eslint-disable-next-line security/detect-object-injection
        const tradutor = traducoes[chave];

        return tradutor
          ? tradutor(rotulos[error.property] || error.property)
          : msg;
      })
      .join("; ");
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "test" ? [] : ["../../.env.staging"],
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
    MercadoPagoModule,
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
          new BadRequestException(traduzirErrosValidacao(errors)),
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
