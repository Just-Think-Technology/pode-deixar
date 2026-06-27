import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
<<<<<<< HEAD
import { AppModule } from "./app.module";
import { getHelmetConfig } from "@pode-deixar/security";
=======
import helmet from "helmet";
import { AppModule } from "./app.module";
>>>>>>> 68d7f77 (Develop (#13))

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

<<<<<<< HEAD
  app.use(getHelmetConfig());
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
=======
  app.use(helmet());
>>>>>>> 68d7f77 (Develop (#13))
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Pode Deixar - Users Service")
<<<<<<< HEAD
    .setDescription("API de gerenciamento de perfis de usuários")
=======
    .setDescription("API for user profiles management")
>>>>>>> 68d7f77 (Develop (#13))
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

<<<<<<< HEAD
  const port = process.env.USERS_PORT || 3002;
=======
  const port = process.env.PORT || 3001;
>>>>>>> 68d7f77 (Develop (#13))
  await app.listen(port);
  console.log(`Users service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
