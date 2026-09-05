import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";
import createLogger from "@pode-deixar/logger";

const logger = createLogger("users-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // Security headers with CSP
  app.use(getHelmetConfig());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Pode Deixar - Users Service")
    .setDescription("API de gerenciamento de perfis de usuários")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.USERS_PORT || 3002;
  await app.listen(port);
  logger.info("bootstrap", `Users service running on port ${port}`);
  logger.info(
    "bootstrap",
    `Swagger docs available at http://localhost:${port}/api/docs`,
  );
}

bootstrap();
