import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ProviderServicesModule } from "./provider-services/provider-services.module";
import { ServiceImagesModule } from "./service-images/service-images.module";
import { CategoriesModule } from "./categories/categories.module";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./shared/shared.module";
import { MinioModule } from "./storage/minio.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { ResponseLoggerInterceptor } from "./shared/response-logger.interceptor";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RedisThrottlerStorage } from "@pode-deixar/security";
import {
  traduzirErrosValidacao as traduzirErrosNucleo,
  RotulosCampos,
} from "@pode-deixar/validation";

// Rótulos dos campos do users (user-facing, em português); as mensagens de
// restrição vivem no núcleo compartilhado.
const ROTULOS_USERS: RotulosCampos = {
  title: "Título",
  description: "Descrição",
  fixedPrice: "Preço fixo",
  categoryId: "Categoria",
  avatarUrl: "URL do avatar",
  bio: "Biografia",
  hourlyRate: "Valor por hora",
  skills: "Habilidades",
  portfolio: "Portfólio",
  isAvailable: "Disponível",
  preferences: "Preferências",
  name: "Nome",
  slug: "Slug",
  icon: "Ícone",
};

function translateValidationErrors(errors: ValidationError[]): string {
  return traduzirErrosNucleo(errors, ROTULOS_USERS).join("; ");
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
    ProfilesModule,
    NotificationsModule,
    ProviderServicesModule,
    ServiceImagesModule,
    CategoriesModule,
    HealthModule,
    SharedModule,
    MinioModule,
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
