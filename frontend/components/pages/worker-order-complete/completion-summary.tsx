"use client";

import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAgendaAddress,
  formatAgendaDate,
  formatAgendaTimeRange,
  getAgendaStatusLabel,
  getGoogleMapsUrl,
  hasAgendaAddress,
} from "@/lib/worker/agenda/labels";
import { formatCompletionAmount } from "@/lib/worker/orders/labels";
import type { CompletionOrder } from "@/lib/worker/orders/types";
import { cn } from "@/lib/utils";

type CompletionSummaryProps = {
  order: CompletionOrder;
};

export function CompletionSummary({ order }: CompletionSummaryProps) {
  const mapsUrl = getGoogleMapsUrl(order.address);
  const showMapsLink = hasAgendaAddress(order.address) && mapsUrl != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo do serviço</CardTitle>
        <CardDescription>
          Confira se este é o serviço correto antes de finalizar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Serviço
            </dt>
            <dd className="font-medium text-foreground">{order.title}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Cliente
            </dt>
            <dd className="text-foreground">{order.client_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Data do atendimento
            </dt>
            <dd className="text-foreground">
              {formatAgendaDate(order.scheduled_at)} ·{" "}
              {formatAgendaTimeRange(
                order.scheduled_at,
                order.scheduled_end_at,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Local do atendimento
            </dt>
            <dd className="text-foreground">
              {formatAgendaAddress(order.address)}
            </dd>
            {showMapsLink ? (
              <dd className="mt-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  <MapPin />
                  Abrir no Google Maps
                </a>
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Valor do serviço
            </dt>
            <dd className="font-medium text-foreground">
              {formatCompletionAmount(order.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Status atual
            </dt>
            <dd>
              <Badge variant="outline" className="w-fit">
                {getAgendaStatusLabel(order.order_status)}
              </Badge>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
