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
