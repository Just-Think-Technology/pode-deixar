import { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getHelmetConfig } from '@pode-deixar/security';
import { createLogger } from './index';

export interface BootstrapServiceOptions {
  module: Type;
  serviceName: string;
  displayName: string;
  portEnvVar: string;
  defaultPort: number;
  swaggerTitle: string;
  swaggerDescription: string;
  swaggerPath?: string;
  enableSwaggerInProduction?: boolean;
  onAppCreated?: (app: INestApplication) => void | Promise<void>;
}

export async function bootstrapService(
  options: BootstrapServiceOptions,
): Promise<void> {
  const {
    module: appModule,
    serviceName,
    displayName,
    portEnvVar,
    defaultPort,
    swaggerTitle,
    swaggerDescription,
    swaggerPath = 'api/docs',
    enableSwaggerInProduction = true,
    onAppCreated,
  } = options;

  const logger = createLogger(serviceName);
  const app = await NestFactory.create(appModule, {
    logger: false,
  });

  app.use(getHelmetConfig());

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(
    (origin) => origin.trim(),
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

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  if (onAppCreated) {
    await onAppCreated(app);
  }

  const swaggerEnabled =
    enableSwaggerInProduction || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(swaggerTitle)
      .setDescription(swaggerDescription)
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document);
  }

  const port = process.env[portEnvVar] || defaultPort;
  await app.listen(port);
  logger.info('bootstrap', `${displayName} service running on port ${port}`);
  if (swaggerEnabled) {
    logger.info(
      'bootstrap',
      `Swagger docs available at http://localhost:${port}/${swaggerPath}`,
    );
  }
}
