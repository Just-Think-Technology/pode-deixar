import { AppModule } from "./app.module";
import { bootstrapService } from "@pode-deixar/logger";

async function bootstrap() {
  await bootstrapService({
    module: AppModule,
    serviceName: "payments-service",
    displayName: "Payments",
    portEnvVar: "PAYMENTS_PORT",
    defaultPort: 3004,
    swaggerTitle: "Pode Deixar - Payments Service",
    swaggerDescription: "Payments API",
  });
}

bootstrap();
