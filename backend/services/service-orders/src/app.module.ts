import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "./prisma/prisma.module";
import { ServiceOrdersModule } from "./service-orders/service-orders.module";
import { ProposalsModule } from "./proposals/proposals.module";
import { CounterProposalsModule } from "./counter-proposals/counter-proposals.module";
import { PhotosModule } from "./photos/photos.module";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./shared/shared.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { ResponseLoggerInterceptor } from "./shared/response-logger.interceptor";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";

function translateValidationErrors(errors: ValidationError[]): string[] {
  const labels: Record<string, string> = {
    title: "Título",
    description: "Description",
    categoryId: "Categoria",
    price: "Preço",
    providerServiceId: "Serviço do prestador",
    budgetMin: "Orçamento mínimo",
    budgetMax: "Orçamento máximo",
    providerId: "Prestador",
    estimatedDuration: "Duração estimada",
    serviceOrderId: "ID do pedido",
    proposalId: "ID da proposta",
  };

  const translations: Record<string, (label: string) => string> = {
    isString: (label) => `${label} deve ser uma string`,
    isNotEmpty: (label) => `${label} não pode estar vazio`,
    isNumber: (label) => `${label} deve ser um número`,
    isBoolean: (label) => `${label} deve ser verdadeiro ou falso`,
    isInt: (label) => `${label} deve ser um número inteiro`,
    isPositive: (label) => `${label} deve ser um número positivo`,
    min: (label) => `${label} não pode ser menor que 0`,
    minLength: (label) => `${label} deve ter no mínimo 3 caracteres`,
    maxLength: (label) => `${label} está muito longo`,
    matches: (label) => `${label} contém caracteres inválidos`,
  };

  return errors.map((error) => {
    if (!error.constraints)
      return `${labels[error.property] || error.property} inválido`;
    return Object.entries(error.constraints)
      .map(([key, msg]) => {
        // eslint-disable-next-line security/detect-object-injection -- key comes from class-validator constraint names, not user input
        const translator = translations[key];

        return translator
          ? translator(labels[error.property] || error.property)
          : msg;
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
    ServiceOrdersModule,
    ProposalsModule,
    CounterProposalsModule,
    PhotosModule,
    HealthModule,
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
