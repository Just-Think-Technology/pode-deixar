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
    onAppCreated: (app) => {
      // API versioning — also set centrally in @pode-deixar/logger bootstrapService;
      // health excluded at /health (+ /ready, /live) for Caddy probes.
      app.setGlobalPrefix("api/v1", {
        exclude: ["health", "health/ready", "health/live"],
      });
    },
  });
}

bootstrap();
