import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";

const logger = createLogger('payments-service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // Security headers with CSP
  app.use(getHelmetConfig());

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  const config = new DocumentBuilder()
    .setTitle("Pode Deixar - Payments Service")
    .setDescription("API de pagamentos")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PAYMENTS_PORT || 3004;
  await app.listen(port);
  logger.info('bootstrap', `Payments service running on port ${port}`);
  logger.info('bootstrap', `Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
