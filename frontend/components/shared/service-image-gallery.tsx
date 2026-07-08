"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { ServiceImage } from "@/lib/auth/types";
import {
  uploadServiceImageAction,
  deleteServiceImageAction,
} from "@/lib/auth/image-actions";

type ServiceImageGalleryProps = {
  serviceId: string;
  images: ServiceImage[];
  onImagesChange: (images: ServiceImage[]) => void;
};

export default function ServiceImageGallery({
  serviceId,
  images,
  onImagesChange,
}: ServiceImageGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        file.type,
      )
    ) {
      toast.error("Formato inválido. Permitidos: JPEG, PNG, WebP, GIF");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const newImage: ServiceImage = await uploadServiceImageAction(
        serviceId,
        formData,
      );

      onImagesChange([newImage, ...images]);
      toast.success("Imagem enviada com sucesso!");
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId: string) {
    setDeletingId(imageId);
    try {
      await deleteServiceImageAction(serviceId, imageId);
      onImagesChange(images.filter((img) => img.id !== imageId));
      toast.success("Imagem removida!");
    } catch {
      toast.error("Erro ao remover imagem");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Imagens</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Spinner className="size-4" />
          ) : (
            <Upload className="size-4" />
          )}
          {uploading ? "Enviando..." : "Adicionar"}
        </Button>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma imagem cadastrada.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border/60"
            >
              <Image
                src={image.url}
                alt="Imagem do serviço"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 150px"
              />
              <button
                type="button"
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                disabled={deletingId === image.id}
                onClick={() => handleDelete(image.id)}
              >
                {deletingId === image.id ? (
                  <Spinner className="size-4" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
