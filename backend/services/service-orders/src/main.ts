import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";
import createLogger from "@pode-deixar/logger";

const logger = createLogger("service-orders-service");

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
    .setTitle("Pode Deixar - Services Service")
    .setDescription("API de pedidos de serviço e propostas")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.SERVICE_ORDERS_PORT || 3003;
  await app.listen(port);
  logger.info("bootstrap", `Service-orders service running on port ${port}`);
  logger.info("bootstrap", `Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
