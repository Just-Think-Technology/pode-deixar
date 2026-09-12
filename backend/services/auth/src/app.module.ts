import { Module, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { ValidationError } from 'class-validator';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './shared/common.module';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './shared/global-exception.filter';
import { ResponseLoggerInterceptor } from './shared/response-logger.interceptor';
import { EmailModule } from '@pode-deixar/email';
import { RedisThrottlerStorage } from '@pode-deixar/security';
import {
  traduzirErrosValidacao as traduzirErrosNucleo,
  RotulosCampos,
  MensagensRestricao,
} from '@pode-deixar/validation';

// purpose — auth field labels (user-facing, in Portuguese); restriction messages live in shared core, with auth divergences below.
const ROTULOS_AUTH: RotulosCampos = {
  email: 'Email',
  password: 'Senha',
  complete_name: 'Nome completo',
  confirm_password: 'Confirmação de senha',
  phone: 'Telefone',
  postal_code: 'CEP',
  role: 'Função',
  newPassword: 'Nova senha',
  currentPassword: 'Senha atual',
  token: 'Token',
};

const SOBRESCRITAS_AUTH: MensagensRestricao = {
  minLength: (r) => `${r} deve ter no mínimo 8 caracteres`,
  maxLength: (r) => `${r} deve ter no máximo 200 caracteres`,
};

function translateValidationErrors(errors: ValidationError[]): string[] {
  return traduzirErrosNucleo(errors, ROTULOS_AUTH, SOBRESCRITAS_AUTH);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`../../.env.${process.env.NODE_ENV || 'development'}`],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const isProd = process.env.NODE_ENV === 'production';
        return [
          {
            ttl: 60000,
            limit: 100,
            storage: isProd ? new RedisThrottlerStorage() : undefined,
          },
        ];
      },
    }),
    TerminusModule,
    EmailModule,
    PrismaModule,
    AuthModule,
    CommonModule,
    HealthModule,
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
