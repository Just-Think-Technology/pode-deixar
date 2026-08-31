import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { ProviderFinanceController } from "./provider-finance.controller";
import { PaymentsService } from "./payments.service";
import { PaymentLoggerService } from "./payment-logger.service";

@Module({
  controllers: [PaymentsController, ProviderFinanceController],
  providers: [PaymentsService, PaymentLoggerService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
