import { AppModule } from "./app.module";
import { bootstrapService } from "@pode-deixar/logger";

async function bootstrap() {
  await bootstrapService({
    module: AppModule,
    serviceName: "reviews-service",
    displayName: "Reviews",
    portEnvVar: "REVIEWS_PORT",
    defaultPort: 3005,
    swaggerTitle: "Pode Deixar - Reviews Service",
    swaggerDescription: "API for client and provider reviews",
  });
}

bootstrap();
