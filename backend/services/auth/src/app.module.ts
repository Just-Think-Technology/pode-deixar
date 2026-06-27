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

function traduzirErrosValidacao(errors: ValidationError[]): string[] {
  const rotulos: Record<string, string> = {
    email: 'Email', password: 'Senha', complete_name: 'Nome completo',
    confirm_password: 'Confirmação de senha', phone: 'Telefone',
    postal_code: 'CEP', role: 'Função', newPassword: 'Nova senha',
    currentPassword: 'Senha atual', token: 'Token',
  };

  const traducoes: Record<string, (r: string) => string> = {
    isString: (r) => `${r} deve ser uma string`,
    isNotEmpty: (r) => `${r} não pode estar vazio`,
    isEmail: (r) => `${r} deve ser um email válido`,
    isNumber: (r) => `${r} deve ser um número`,
    isBoolean: (r) => `${r} deve ser verdadeiro ou falso`,
    isInt: (r) => `${r} deve ser um número inteiro`,
    isPositive: (r) => `${r} deve ser um número positivo`,
    isUrl: (r) => `${r} deve ser uma URL válida`,
    isEnum: (r) => `${r} deve ser um valor válido`,
    isArray: (r) => `${r} deve ser uma lista`,
    minLength: (r) => `${r} deve ter no mínimo 8 caracteres`,
    maxLength: (r) => `${r} deve ter no máximo 200 caracteres`,
    min: (r) => `${r} não pode ser menor que 0`,
    matches: (r) => `${r} contém caracteres inválidos`,
  };

  return errors.map((error) => {
    if (!error.constraints) return `${rotulos[error.property] || error.property} inválido`;
    return Object.entries(error.constraints).map(([chave, msg]) => {
      const tradutor = traducoes[chave];
      return tradutor ? tradutor(rotulos[error.property] || error.property) : msg;
    }).join('; ');
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.staging"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TerminusModule,
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