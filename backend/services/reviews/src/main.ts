import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";
import createLogger from "@pode-deixar/logger";

const logger = createLogger("reviews-service");

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
    .setTitle("Pode Deixar - Reviews Service")
    .setDescription("API de avaliações de clientes e prestadores")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.REVIEWS_PORT || 3005;
  await app.listen(port);
  logger.info("bootstrap", `Reviews service running on port ${port}`);
  logger.info("bootstrap", `Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
