import { AuthSharedModule } from "@pode-deixar/security";
import { UsersLoggerService } from "./users-logger.service";

export const SharedModule = AuthSharedModule.register({
  logger: UsersLoggerService,
});
