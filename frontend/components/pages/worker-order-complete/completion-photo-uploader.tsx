"use client";

import { useRef, useState } from "react";
import { Camera, Images, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  removeCompletionPhotoAction,
  uploadCompletionPhotoAction,
} from "@/lib/worker/orders/actions";
import { getUploadPhotoErrorMessage } from "@/lib/worker/orders/labels";
import type { CompletionPhoto } from "@/lib/worker/orders/types";
import {
  MAX_COMPLETION_PHOTOS,
  validateCompletionPhoto,
} from "@/lib/worker/orders/validation";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";

type CompletionPhotoUploaderProps = {
  orderId: string;
  photos: CompletionPhoto[];
  disabled?: boolean;
  onPhotosChange: (photos: CompletionPhoto[]) => void;
};

export function CompletionPhotoUploader({
  orderId,
  photos,
  disabled = false,
  onPhotosChange,
}: CompletionPhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || uploading || disabled) {
      return;
    }

    const files = Array.from(fileList);
    if (photos.length + files.length > MAX_COMPLETION_PHOTOS) {
      toast.error("O serviço pode ter no máximo 10 fotos.");
      return;
    }

    setUploading(true);
    try {
      const uploaded: CompletionPhoto[] = [];
      for (const file of files) {
        const validation = validateCompletionPhoto(file);
        if (!validation.ok) {
          const message =
            Object.values(validation.errors)[0] ??
            "Não foi possível enviar a foto.";
          toast.error(message);
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        try {
          const formData = new FormData();
          formData.append("file", file);
          const photo = await uploadCompletionPhotoAction(
            orderId,
            formData,
            previewUrl,
          );
          uploaded.push(photo);
        } catch (err) {
          URL.revokeObjectURL(previewUrl);
          toast.error(getUploadPhotoErrorMessage(err));
        }
      }
      if (uploaded.length > 0) {
        onPhotosChange([...photos, ...uploaded]);
        toast.success(
          uploaded.length === 1
            ? "Foto adicionada!"
            : `${uploaded.length} fotos adicionadas!`,
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(photo: CompletionPhoto) {
    if (disabled) {
      return;
    }
    setDeletingId(photo.id);
    try {
      await removeCompletionPhotoAction(orderId, photo.id);
      if (photo.url.startsWith("blob:")) {
        URL.revokeObjectURL(photo.url);
      }
      onPhotosChange(photos.filter((item) => item.id !== photo.id));
    } catch (err) {
      toast.error(getUploadPhotoErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const busy = uploading || disabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos do serviço</CardTitle>
        <CardDescription>
          Registre pelo menos 1 foto do serviço realizado (máximo de 10).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={cameraInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          capture="environment"
          className="hidden"
          data-slot="completion-camera-input"
          disabled={busy}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="hidden"
          data-slot="completion-gallery-input"
          disabled={busy}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
          >
            {uploading ? (
              <Spinner className="size-4" />
            ) : (
              <Camera className="size-4" />
            )}
            {uploading ? "Enviando..." : "Tirar foto"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={busy}
            onClick={() => galleryInputRef.current?.click()}
          >
            <Images className="size-4" />
            Escolher da galeria
          </Button>
          <p
            className="w-full text-xs text-muted-foreground"
            aria-live="polite"
          >
            {photos.length}/{MAX_COMPLETION_PHOTOS} fotos adicionadas
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma foto adicionada. Adicione pelo menos uma para concluir o
            serviço.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/60"
              >
                {/* Fotos do mock usam object-URL: next/image não as otimiza. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Evidência ${index + 1} do serviço`}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remover foto ${index + 1}`}
                  className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  disabled={deletingId === photo.id || disabled}
                  onClick={() => void handleRemove(photo)}
                >
                  {deletingId === photo.id ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
