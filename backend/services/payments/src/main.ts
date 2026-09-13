// Payments bootstrap — CORS, helmet and docs setup

import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";
import createLogger from "@pode-deixar/logger";

const logger = createLogger("payments-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.use(getHelmetConfig());

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
    .setDescription("Payments API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PAYMENTS_PORT || 3004;
  await app.listen(port);
  logger.info("bootstrap", `Payments service running on port ${port}`);
  logger.info(
    "bootstrap",
    `Swagger docs available at http://localhost:${port}/api/docs`,
  );
}
bootstrap();
