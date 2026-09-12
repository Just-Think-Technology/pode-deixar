// purpose — API bootstrap and CORS/helmet configuration
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import createLogger from '@pode-deixar/logger';
import { getHelmetConfig } from '@pode-deixar/security';

const logger = createLogger('auth-service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.use(getHelmetConfig());

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  ) || ['http://localhost:3000'];
  // Fail closed: a wildcard with credentials would expose tokens to any origin.
  if (allowedOrigins.includes('*')) {
    throw new Error(
      'Configuração insegura: ALLOWED_ORIGINS contém "*" com credentials habilitado',
    );
  }
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

  // Trust proxy for proper IP detection
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Pode Deixar - Auth Service')
      .setDescription('Authentication and user management API')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter the JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.AUTH_PORT || 3001;
  await app.listen(port);

  logger.info(
    'bootstrap',
    `Auth service is running on: http://localhost:${port}`,
  );
  if (process.env.NODE_ENV !== 'production') {
    logger.info('bootstrap', `API Documentation: http://localhost:${port}/api`);
  }
}
bootstrap();
