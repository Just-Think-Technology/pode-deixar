// Payments module — charges and provider finance wiring

import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { ProviderFinanceController } from "./provider-finance.controller";
import { PaymentsService } from "./payments.service";
import { PaymentLoggerService } from "./payment-logger.service";

@Module({

  // --- Controllers ---

  controllers: [PaymentsController, ProviderFinanceController],

  // --- Providers ---

  providers: [PaymentsService, PaymentLoggerService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
