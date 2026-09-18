// Completion photo URL resolver — presigned URLs with per-session cache
"use client";

import { useEffect, useRef, useState } from "react";

import { resolveOrderPhotoUrlAction } from "@/lib/worker/orders/actions";
import { needsPhotoUrlResolution } from "@/lib/worker/orders/photo-urls";

type ResolvablePhoto = {
  id: string;
  url: string;
};

/**
 * Resolves backend view-endpoint photo URLs to presigned URLs.
 * Resolved entries persist per browser session; failures fall back
 * to blank so one broken photo never blocks the page.
 *
 * @param photos - Photos whose URLs may need resolution
 * @returns Map of photo id to presigned URL
 */
export function useResolvedPhotoUrls(
  photos: ResolvablePhoto[],
): Map<string, string> {
  const [resolved, setResolved] = useState<Map<string, string>>(
    () => new Map(),
  );
  const cacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const pending = photos.filter(
      (photo) =>
        !cacheRef.current.has(photo.id) &&
        needsPhotoUrlResolution(photo.url),
    );
    if (pending.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        pending.map(async (photo) => {
          try {
            const url = await resolveOrderPhotoUrlAction(photo.id);
            return [photo.id, url] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) {
        return;
      }
      const next = new Map(cacheRef.current);
      for (const entry of entries) {
        if (entry) {
          next.set(entry[0], entry[1]);
        }
      }
      cacheRef.current = next;
      setResolved(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [photos]);

  return resolved;
}
