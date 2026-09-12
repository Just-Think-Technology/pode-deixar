import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";
import createLogger from "@pode-deixar/logger";

// purpose — bootstrap and configure the users service HTTP server
const logger = createLogger("users-service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.use(getHelmetConfig());

  // Allowlist only, never "*".
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Trust proxy for correct client IP in rate limiting and logs.
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  const config = new DocumentBuilder()
    .setTitle("Pode Deixar - Users Service")
    .setDescription("User profile management API")
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
