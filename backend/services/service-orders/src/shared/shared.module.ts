import { AuthSharedModule } from "@pode-deixar/security";
import { ServicesLoggerService } from "./services-logger.service";

export const SharedModule = AuthSharedModule.register({
  logger: ServicesLoggerService,
});
