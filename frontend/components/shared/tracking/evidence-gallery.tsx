// Evidence gallery — completion photos and notes shared with both profiles

"use client";

import { useState } from "react";

import { AgendaPhotoLightbox } from "@/components/pages/worker-agenda/photo-lightbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTrackingDateTime } from "@/lib/tracking/labels";
import type {
  ContractTracking,
  TrackingEvidence,
} from "@/lib/tracking/types";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";

type EvidenceGalleryProps = {
  tracking: ContractTracking;
  evidence: TrackingEvidence;
};

export function EvidenceGallery({ tracking, evidence }: EvidenceGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photos = evidence.photos;

  const lightboxEvent: WorkerAgendaEvent = {
    id: tracking.orderId,
    order_id: tracking.orderId,
    title: tracking.title,
    description: tracking.description,
    scheduled_at: tracking.scheduledAt ?? tracking.createdAt ?? "",
    scheduled_end_at: tracking.scheduledEndAt,
    order_status: "COMPLETED",
    address: tracking.address,
    photos,
    payment: {
      status: "PAID",
      amount: tracking.grossAmount ?? 0,
      paid_at: tracking.payment.paidAt ?? tracking.scheduledAt ?? "",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidências da conclusão</CardTitle>
        <CardDescription>
          Concluído em {formatTrackingDateTime(evidence.completedAt)} por{" "}
          {evidence.completedBy}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {evidence.observations ? (
          <p className="text-sm leading-relaxed text-foreground">
            {evidence.observations}
          </p>
        ) : null}
        {photos.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Ampliar foto ${index + 1} de ${photos.length}`}
                  className="overflow-hidden rounded-md ring-1 ring-foreground/10 transition hover:ring-[#2F80ED] focus-visible:ring-2 focus-visible:ring-ring"
                >
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma foto registrada.
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
