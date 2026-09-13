"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AgendaPhotoLightbox } from "@/components/pages/worker-agenda/photo-lightbox";
import { getAgendaStatusLabel } from "@/lib/worker/agenda/labels";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";
import { formatCompletionDateTime } from "@/lib/worker/orders/labels";
import type {
  CompletionHistory,
  CompletionOrder,
} from "@/lib/worker/orders/types";

type CompletionHistoryViewProps = {
  order: CompletionOrder;
  history: CompletionHistory | null;
};

export function CompletionHistoryView({
  order,
  history,
}: CompletionHistoryViewProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = history?.photos ?? [];

  const lightboxEvent: WorkerAgendaEvent = {
    id: order.order_id,
    order_id: order.order_id,
    title: order.title,
    description: order.description,
    scheduled_at: order.scheduled_at,
    scheduled_end_at: order.scheduled_end_at,
    order_status: "COMPLETED",
    address: order.address,
    photos,
    payment: {
      status: "PAID",
      amount: order.amount,
      paid_at: order.scheduled_at,
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Serviço concluído</CardTitle>
        <CardDescription>
          Este serviço já foi finalizado e não pode ser concluído novamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant="outline" className="w-fit">
          {getAgendaStatusLabel("COMPLETED")}
        </Badge>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Data e hora da conclusão
            </dt>
            <dd className="text-foreground">
              {history
                ? formatCompletionDateTime(history.completed_at)
                : "Indisponível"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Prestador responsável
            </dt>
            <dd className="text-foreground">
              {history?.completed_by ?? "Indisponível"}
            </dd>
          </div>
          {history?.observations ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Observações sobre o serviço
              </dt>
              <dd className="text-foreground">{history.observations}</dd>
            </div>
          ) : null}
        </dl>

        {photos.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Fotos registradas
            </p>
            <ul className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}
                    className="overflow-hidden rounded-md ring-1 ring-foreground/10 transition hover:ring-[#2F80ED] focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Fotos do mock usam object-URL: next/image não as otimiza. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt=""
                      className="size-16 object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Histórico da conclusão indisponível no momento.
          </p>
        )}

        {lightboxIndex != null && photos.length > 0 ? (
          <AgendaPhotoLightbox
            event={lightboxEvent}
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
