import { AuthSharedModule } from "@pode-deixar/security";
import { ReviewsLoggerService } from "./reviews-logger.service";

export const SharedModule = AuthSharedModule.register({
  logger: ReviewsLoggerService,
});
