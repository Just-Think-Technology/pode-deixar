// Completion photo URLs — view-endpoint detection and display fallback

import { isSafeImageUrl } from "@/lib/tracking/image";

const VIEW_ENDPOINT_PREFIX = "/api/services/photos/";
const VIEW_ENDPOINT_SUFFIX = "/view";
const BLANK_PHOTO_URL = "about:blank";

/**
 * Detects backend view-endpoint paths, which require a presigned URL
 * before rendering. Direct URLs (blob, https, data) render as-is.
 *
 * @param url - Photo URL from the API, mock, or upload response
 * @returns True when the URL must be resolved via the view endpoint
 */
export function needsPhotoUrlResolution(url: string): boolean {
  return (
    url.startsWith(VIEW_ENDPOINT_PREFIX) && url.endsWith(VIEW_ENDPOINT_SUFFIX)
  );
}

/**
 * Picks the renderable image source for a completion photo.
 * View endpoints are never renderable directly and must be replaced by
 * their resolved storage URL; direct URLs render as-is.
 *
 * @param photoUrl - Original photo URL
 * @param resolvedUrl - Presigned URL fetched for view endpoints, if any
 * @returns Direct URL, resolved presigned URL, or blank fallback
 */
export function getDisplayPhotoUrl(
  photoUrl: string | null | undefined,
  resolvedUrl: string | null | undefined,
): string {
  const sourceUrl = photoUrl?.trim() ?? "";
  const resolved = resolvedUrl?.trim() ?? "";

  // Direct browser-renderable URLs take precedence.
  if (sourceUrl && !needsPhotoUrlResolution(sourceUrl)) {
    return isSafeImageUrl(sourceUrl) ? sourceUrl : BLANK_PHOTO_URL;
  }

  // Backend view endpoints must be replaced by their resolved storage URL.
  if (resolved && resolved !== BLANK_PHOTO_URL && isSafeImageUrl(resolved)) {
    return resolved;
  }

  return BLANK_PHOTO_URL;
}
