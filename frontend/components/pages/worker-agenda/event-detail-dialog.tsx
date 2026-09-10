"use client";

import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgendaPhotoLightbox } from "@/components/pages/worker-agenda/photo-lightbox";
import {
  formatAgendaAddress,
  formatAgendaDate,
  formatAgendaTimeRange,
  getAgendaStatusLabel,
  getGoogleMapsUrl,
  hasAgendaAddress,
} from "@/lib/worker/agenda/labels";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";
import { cn } from "@/lib/utils";

type AgendaEventDetailDialogProps = {
  event: WorkerAgendaEvent | null;
  lightboxIndex: number | null;
  onLightboxIndexChange: (index: number | null) => void;
  onOpenChange: (open: boolean) => void;
};

function AgendaEventDetailContent({
  event,
  onLightboxIndexChange,
}: {
  event: WorkerAgendaEvent;
  onLightboxIndexChange: (index: number | null) => void;
}) {
  const mapsUrl = getGoogleMapsUrl(event.address);
  const showMapsLink = hasAgendaAddress(event.address) && mapsUrl != null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{event.title}</DialogTitle>
        <DialogDescription>
          {formatAgendaDate(event.scheduled_at)} ·{" "}
          {formatAgendaTimeRange(event.scheduled_at, event.scheduled_end_at)}
        </DialogDescription>
      </DialogHeader>

      <Badge variant="outline" className="w-fit">
        {getAgendaStatusLabel(event.order_status)}
      </Badge>

      <p className="text-sm text-foreground">{event.description}</p>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Endereço</p>
        <p className="text-sm">{formatAgendaAddress(event.address)}</p>
        {showMapsLink ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({
                variant: "outline",
                size: "sm",
              }),
              "mt-2",
            )}
          >
            <MapPin />
            Abrir no Google Maps
          </a>
        ) : null}
      </div>

      {event.photos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Fotos do serviço
          </p>
          <ul className="flex flex-wrap gap-2">
            {event.photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => onLightboxIndexChange(index)}
                  aria-label={`Ampliar foto ${index + 1} de ${event.photos.length}`}
                  className="overflow-hidden rounded-md ring-1 ring-foreground/10 transition hover:ring-[#2F80ED] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Mock/data-URI photo: next/image cannot optimize it. */}
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
      ) : null}
    </>
  );
}

export function AgendaEventDetailDialog({
  event,
  lightboxIndex,
  onLightboxIndexChange,
  onOpenChange,
}: AgendaEventDetailDialogProps) {
  const isLightbox = event != null && lightboxIndex != null;

  return (
    <Dialog
      open={event != null}
      onOpenChange={(open) => {
        if (!open) {
          onLightboxIndexChange(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        showCloseButton={!isLightbox}
        className={cn(
          isLightbox
            ? "top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none bg-black p-0 text-white sm:max-w-none"
            : "sm:max-w-lg",
        )}
      >
        {event && isLightbox ? (
          <AgendaPhotoLightbox
            event={event}
            index={lightboxIndex}
            onIndexChange={onLightboxIndexChange}
            onClose={() => onLightboxIndexChange(null)}
          />
        ) : event ? (
          <AgendaEventDetailContent
            event={event}
            onLightboxIndexChange={onLightboxIndexChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
