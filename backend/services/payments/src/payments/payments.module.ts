import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { ProviderFinanceController } from "./provider-finance.controller";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [PaymentsController, ProviderFinanceController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
