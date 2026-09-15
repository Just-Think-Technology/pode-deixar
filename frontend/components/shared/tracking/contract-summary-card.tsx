// Contract summary card — shared hiring overview for both profiles

import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ContractStatusBadge } from "@/components/shared/tracking/contract-status-badge";
import { deriveContractStatus } from "@/lib/tracking/timeline-builder";
import {
  buildMapsLink,
  formatTrackingAddress,
  formatTrackingAmount,
  formatTrackingDateTime,
  getPaymentStatusLabel,
} from "@/lib/tracking/labels";
import type { ContractTracking } from "@/lib/tracking/types";

type ContractSummaryCardProps = {
  tracking: ContractTracking;
};

export function ContractSummaryCard({ tracking }: ContractSummaryCardProps) {
  const status = deriveContractStatus(tracking);
  const mapsLink = buildMapsLink(tracking.address);
  const counterpartLabel =
    tracking.role === "CLIENT" ? "Prestador" : "Cliente";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{tracking.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Contratação {tracking.orderId.slice(0, 8)}
          </p>
        </div>
        <ContractStatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground">
          {tracking.description}
        </p>
        <Separator />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{counterpartLabel}</dt>
            <dd className="font-medium text-foreground">
              {tracking.counterpart.completeName}
            </dd>
          </div>
          {tracking.categoryName ? (
            <div>
              <dt className="text-muted-foreground">Categoria</dt>
              <dd className="font-medium text-foreground">
                {tracking.categoryName}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Data agendada</dt>
            <dd className="font-medium text-foreground">
              {tracking.scheduledAt
                ? formatTrackingDateTime(tracking.scheduledAt)
                : "A combinar"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Local do atendimento</dt>
            <dd className="font-medium text-foreground">
              {formatTrackingAddress(tracking.address)}{" "}
              {mapsLink ? (
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#2F80ED] underline-offset-2 hover:underline"
                >
                  Ver no mapa
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Valor total</dt>
            <dd className="font-medium text-foreground">
              {formatTrackingAmount(tracking.grossAmount)}
            </dd>
          </div>
          {tracking.feeAmount != null ? (
            <div>
              <dt className="text-muted-foreground">Taxa da plataforma</dt>
              <dd className="font-medium text-foreground">
                {formatTrackingAmount(tracking.feeAmount)}
              </dd>
            </div>
          ) : null}
          {tracking.role === "PROVIDER" && tracking.netAmount != null ? (
            <div>
              <dt className="text-muted-foreground">Valor líquido</dt>
              <dd className="font-medium text-foreground">
                {formatTrackingAmount(tracking.netAmount)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Pagamento</dt>
            <dd className="font-medium text-foreground">
              {getPaymentStatusLabel(tracking.payment.status)}
              {tracking.payment.amount != null
                ? ` · ${formatTrackingAmount(tracking.payment.amount)}`
                : null}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
