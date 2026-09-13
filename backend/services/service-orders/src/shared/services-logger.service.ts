import { Injectable } from "@nestjs/common";
import { BaseDomainLogger } from "@pode-deixar/logger";

@Injectable()
export class ServicesLoggerService extends BaseDomainLogger {
  constructor() {
    super("services-service");
  }

  logServiceOrderCreated(clientId: string, orderId: string, ip?: string) {
    this.logger.info(
      "service_order_created",
      `Service order created by client ${clientId}`,
      {
        clientId,
        orderId,
        ip,
      },
    );
  }

  logServiceOrderUpdated(clientId: string, orderId: string, ip?: string) {
    this.logger.info(
      "service_order_updated",
      `Service order ${orderId} updated`,
      {
        clientId,
        orderId,
        ip,
      },
    );
  }

  logServiceOrderCancelled(clientId: string, orderId: string, ip?: string) {
    this.logger.info(
      "service_order_cancelled",
      `Service order ${orderId} cancelled`,
      {
        clientId,
        orderId,
        ip,
      },
    );
  }

  logServiceOrderCompleted(providerId: string, orderId: string, ip?: string) {
    this.logger.info(
      "service_order_completed",
      `Service order ${orderId} completed`,
      {
        providerId,
        orderId,
        ip,
      },
    );
  }

  logProposalCreated(providerId: string, proposalId: string, ip?: string) {
    this.logger.info(
      "proposal_created",
      `Proposal created by provider ${providerId}`,
      {
        providerId,
        proposalId,
        ip,
      },
    );
  }

  logProposalUpdated(providerId: string, proposalId: string, ip?: string) {
    this.logger.info("proposal_updated", `Proposal ${proposalId} updated`, {
      providerId,
      proposalId,
      ip,
    });
  }

  logProposalWithdrawn(providerId: string, proposalId: string, ip?: string) {
    this.logger.info("proposal_withdrawn", `Proposal ${proposalId} withdrawn`, {
      providerId,
      proposalId,
      ip,
    });
  }

  logProposalAccepted(orderId: string, proposalId: string, ip?: string) {
    this.logger.info(
      "proposal_accepted",
      `Proposal ${proposalId} accepted for order ${orderId}`,
      {
        orderId,
        proposalId,
        ip,
      },
    );
  }
}
