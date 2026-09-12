import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule, HealthModule } from "@pode-deixar/prisma";
import { SharedModule } from "./shared/shared.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { createResponseLoggerInterceptor } from "@pode-deixar/logger";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";
import {
  translateValidationErrors as translateValidationCore,
  FieldLabels,
} from "@pode-deixar/validation";

// Rótulos dos campos do reviews (user-facing, em português); as mensagens de
// restrição vivem no núcleo compartilhado.
const REVIEWS_FIELD_LABELS: FieldLabels = {
  rating: "Nota",
  comment: "Comentário",
  serviceOrderId: "Pedido de serviço",
  providerId: "Prestador",
};

function translateValidationErrors(errors: ValidationError[]): string {
  return translateValidationCore(errors, REVIEWS_FIELD_LABELS).join("; ");
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
      useClass: createResponseLoggerInterceptor("reviews-service"),
    },
  ],
})
export class AppModule {}
