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
      // API versioning is set in @pode-deixar/logger bootstrapService as
      // app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready', 'health/live'] });
      // — health stays at /health for probes; see bootstrap.ts and Caddyfile.docker.
      // Re-asserting here is idempotent and documents the versioning contract per service.
      app.setGlobalPrefix('api/v1', {
        exclude: ['health', 'health/ready', 'health/live'],
      });
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
