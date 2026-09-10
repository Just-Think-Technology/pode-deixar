"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { DialogTitle } from "@/components/ui/dialog";
import type { WorkerAgendaEvent } from "@/lib/worker/agenda/types";

type AgendaPhotoLightboxProps = {
  event: WorkerAgendaEvent;
  index: number;
  onIndexChange: (index: number | null) => void;
  onClose: () => void;
};

export function AgendaPhotoLightbox({
  event,
  index,
  onIndexChange,
  onClose,
}: AgendaPhotoLightboxProps) {
  const [api, setApi] = useState<CarouselApi>();
  const photo = event.photos[index];

  useEffect(() => {
    if (!api) {
      return;
    }
    const sync = () => {
      onIndexChange(api.selectedScrollSnap());
    };
    api.on("select", sync);
    return () => {
      api.off("select", sync);
    };
  }, [api, onIndexChange]);

  return (
    <div
      data-slot="agenda-photo-lightbox"
      className="relative flex h-dvh w-full flex-col bg-black"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <DialogTitle className="truncate text-white">
          {event.title} — foto {index + 1} de {event.photos.length}
        </DialogTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar fotos"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>

      {event.photos.length > 1 ? (
        <Carousel
          className="flex min-h-0 flex-1 items-center px-12"
          opts={{ startIndex: index, loop: true }}
          setApi={setApi}
        >
          <CarouselContent className="h-full items-center">
            {event.photos.map((item, photoIndex) => (
              <CarouselItem key={item.id} className="flex justify-center">
                {/* Mock/data-URI photo: next/image cannot optimize it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={`Foto ${photoIndex + 1} do serviço ${event.title}`}
                  className="max-h-[calc(100dvh-6rem)] max-w-full object-contain"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            className="left-2 border-white/30 bg-black/40 text-white hover:bg-black/70 hover:text-white"
            aria-label="Foto anterior"
          />
          <CarouselNext
            className="right-2 border-white/30 bg-black/40 text-white hover:bg-black/70 hover:text-white"
            aria-label="Próxima foto"
          />
        </Carousel>
      ) : photo ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          {/* Mock/data-URI photo: next/image cannot optimize it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`Foto do serviço ${event.title}`}
            className="max-h-[calc(100dvh-6rem)] max-w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
