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
import {
  traduzirErrosValidacao as traduzirErrosNucleo,
  RotulosCampos,
} from "@pode-deixar/validation";

// Rótulos dos campos do service-orders (user-facing, em português); as
// mensagens de restrição vivem no núcleo compartilhado.
const ROTULOS_ORDERS: RotulosCampos = {
  title: "Título",
  description: "Descrição",
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

function translateValidationErrors(errors: ValidationError[]): string[] {
  return traduzirErrosNucleo(errors, ROTULOS_ORDERS);
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
