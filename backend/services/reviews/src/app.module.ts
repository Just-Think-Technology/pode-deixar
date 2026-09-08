import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./shared/shared.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { ResponseLoggerInterceptor } from "./shared/response-logger.interceptor";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";

function translateValidationErrors(errors: ValidationError[]): string {
  const labels: Record<string, string> = {
    rating: "Nota",
    comment: "Comentário",
    serviceOrderId: "Pedido de serviço",
    providerId: "Prestador",
  };

  const translations: Record<string, (label: string) => string> = {
    isString: (label) => `${label} deve ser uma string`,
    isNotEmpty: (label) => `${label} não pode estar vazio`,
    isNumber: (label) => `${label} deve ser um número`,
    isBoolean: (label) => `${label} deve ser verdadeiro ou falso`,
    isInt: (label) => `${label} deve ser um número inteiro`,
    isPositive: (label) => `${label} deve ser um número positivo`,
    isUrl: (label) => `${label} deve ser uma URL válida`,
    isEnum: (label) => `${label} deve ser um valor válido`,
    isArray: (label) => `${label} deve ser uma lista`,
    min: (label) => `${label} não pode ser menor que 0`,
    max: (label) => `${label} não pode ser maior que o limite`,
    minLength: (label) => `${label} deve ter no mínimo 3 caracteres`,
    maxLength: (label) => `${label} está muito longo`,
    matches: (label) => `${label} contém caracteres inválidos`,
    isUuid: (label) => `${label} deve ser um UUID válido`,
  };

  return errors
    .map((error) => {
      if (!error.constraints)
        return `${labels[error.property] || error.property} inválido`;
      return Object.entries(error.constraints)
        .map(([key, msg]) => {
          // eslint-disable-next-line security/detect-object-injection -- key is a class-validator constraint name, not user input
          const translator = translations[key];

          return translator
            ? translator(labels[error.property] || error.property)
            : msg;
        })
        .join("; ");
    })
    .join("; ");
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
    HealthModule,
    SharedModule,
    ReviewsModule,
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
