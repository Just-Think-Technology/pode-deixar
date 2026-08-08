import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(getHelmetConfig());
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
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
  console.log(`Services service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
