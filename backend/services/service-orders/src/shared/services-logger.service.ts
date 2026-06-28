import { Injectable } from "@nestjs/common";
import { createLogger, LoggerWithEvent } from "@pode-deixar/logger";

@Injectable()
export class ServicesLoggerService {
  private readonly logger: LoggerWithEvent;

  constructor() {
    this.logger = createLogger("services-service");
  }

  logInfo(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.info(event, message, meta);
  }

  logWarn(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.warn(event, message, meta);
  }

  logError(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.error(event, message, meta);
  }

  logDebug(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.debug(event, message, meta);
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

  logSecurityEvent(event: string, meta: Record<string, unknown>) {
    this.logger.warn(event, `Security event: ${event}`, meta);
  }
}
