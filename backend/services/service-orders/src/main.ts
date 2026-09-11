import { AppModule } from "./app.module";
import { bootstrapService } from "@pode-deixar/logger";

async function bootstrap() {
  await bootstrapService({
    module: AppModule,
    serviceName: "services-service",
    displayName: "Service-orders",
    portEnvVar: "SERVICE_ORDERS_PORT",
    defaultPort: 3003,
    swaggerTitle: "Pode Deixar - Services Service",
    swaggerDescription: "Service order and proposal API",
  });
}

bootstrap();
