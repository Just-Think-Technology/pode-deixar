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

function translateValidationErrors(errors: ValidationError[]): string {
  const fieldLabels: Record<string, string> = {
    title: "Título",
    description: "Description",
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

  const constraintMessages: Record<string, (label: string) => string> = {
    isString: (r) => `${r} deve ser uma string`,
    isNotEmpty: (r) => `${r} não pode estar vazio`,
    isNumber: (r) => `${r} deve ser um número`,
    isBoolean: (r) => `${r} deve ser verdadeiro ou falso`,
    isInt: (r) => `${r} deve ser um número inteiro`,
    isPositive: (r) => `${r} deve ser um número positivo`,
    isUrl: (r) => `${r} deve ser uma URL válida`,
    isEnum: (r) => `${r} deve ser um valor válido`,
    isArray: (r) => `${r} deve ser uma lista`,
    min: (r) => `${r} não pode ser menor que 0`,
    minLength: (r) => `${r} deve ter no mínimo 3 caracteres`,
    maxLength: (r) => `${r} está muito longo`,
    matches: (r) => `${r} contém caracteres inválidos`,
  };

  return errors
    .map((error) => {
      if (!error.constraints)
        return `${fieldLabels[error.property] || error.property} inválido`;
      return Object.entries(error.constraints)
        .map(([constraintKey, msg]) => {
          // eslint-disable-next-line security/detect-object-injection -- key comes from class-validator's fixed constraint names
          const formatter = constraintMessages[constraintKey];

          return formatter
            ? formatter(fieldLabels[error.property] || error.property)
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
