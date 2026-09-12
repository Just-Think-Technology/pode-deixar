import { AppModule } from "./app.module";
import { bootstrapService } from "@pode-deixar/logger";

async function bootstrap() {
  await bootstrapService({
    module: AppModule,
    serviceName: "users-service",
    displayName: "Users",
    portEnvVar: "USERS_PORT",
    defaultPort: 3002,
    swaggerTitle: "Pode Deixar - Users Service",
    swaggerDescription: "User profile management API",
  });
}

bootstrap();
