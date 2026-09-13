// Reviews root module — service wiring and validation setup

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
import {
  traduzirErrosValidacao as traduzirErrosNucleo,
  RotulosCampos,
} from "@pode-deixar/validation";

// Reviews field labels for validation error translation (user-facing, in Portuguese).
const ROTULOS_REVIEWS: RotulosCampos = {
  rating: "Nota",
  comment: "Comentário",
  serviceOrderId: "Pedido de serviço",
  providerId: "Prestador",
};

function translateValidationErrors(errors: ValidationError[]): string {
  return traduzirErrosNucleo(errors, ROTULOS_REVIEWS).join("; ");
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
    HealthModule,
    SharedModule,
    ReviewsModule,
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
      useClass: ResponseLoggerInterceptor,
    },
  ],
})
export class AppModule {}
