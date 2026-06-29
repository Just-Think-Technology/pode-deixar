import { Module, BadRequestException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { PrismaModule } from "./prisma/prisma.module";
import { ServiceOrdersModule } from "./service-orders/service-orders.module";
import { ProposalsModule } from "./proposals/proposals.module";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./shared/shared.module";
import { GlobalExceptionFilter } from "./shared/global-exception.filter";
import { ResponseLoggerInterceptor } from "./shared/response-logger.interceptor";

function traduzirErrosValidacao(errors: ValidationError[]): string[] {
  const rotulos: Record<string, string> = {
    title: "Título",
    description: "Descrição",
    category: "Categoria",
    price: "Preço",
    budgetMin: "Orçamento mínimo",
    budgetMax: "Orçamento máximo",
    estimatedDuration: "Duração estimada",
    serviceOrderId: "ID do pedido",
  };

  const traducoes: Record<string, (r: string) => string> = {
    isString: (r) => `${r} deve ser uma string`,
    isNotEmpty: (r) => `${r} não pode estar vazio`,
    isNumber: (r) => `${r} deve ser um número`,
    isBoolean: (r) => `${r} deve ser verdadeiro ou falso`,
    isInt: (r) => `${r} deve ser um número inteiro`,
    isPositive: (r) => `${r} deve ser um número positivo`,
    min: (r) => `${r} não pode ser menor que 0`,
    minLength: (r) => `${r} deve ter no mínimo 3 caracteres`,
    maxLength: (r) => `${r} está muito longo`,
    matches: (r) => `${r} contém caracteres inválidos`,
  };

  return errors.map((error) => {
    if (!error.constraints)
      return `${rotulos[error.property] || error.property} inválido`;
    return Object.entries(error.constraints)
      .map(([chave, msg]) => {
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
      envFilePath: process.env.NODE_ENV === "test" ? [] : [".env.staging"],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    PrismaModule,
    ServiceOrdersModule,
    ProposalsModule,
    HealthModule,
    SharedModule,
  ],
  providers: [
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
