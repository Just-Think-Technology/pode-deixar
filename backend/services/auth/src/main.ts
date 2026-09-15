import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { bootstrapService } from '@pode-deixar/logger';

async function bootstrap() {
  await bootstrapService({
    module: AppModule,
    serviceName: 'auth-service',
    displayName: 'Auth',
    portEnvVar: 'AUTH_PORT',
    defaultPort: 3001,
    swaggerTitle: 'Pode Deixar - Auth Service',
    swaggerDescription: 'Authentication and user management API',
    swaggerPath: 'api',
    enableSwaggerInProduction: false,
    onAppCreated: (app) => {
      // Global validation pipe (already handled in module, but keeping for compatibility)
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          disableErrorMessages: process.env.NODE_ENV === 'production',
        }),
      );
    },
  });
}

bootstrap();
