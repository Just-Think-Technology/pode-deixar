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
    .setTitle("Pode Deixar - Users Service")
    .setDescription("API de gerenciamento de perfis de usuários")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.USERS_PORT || 3002;
  await app.listen(port);
  console.log(`Users service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
