// Completion photo URLs — view-endpoint detection and display fallback

import { isSafeImageUrl } from "@/lib/tracking/image";

const VIEW_ENDPOINT_PREFIX = "/api/services/photos/";
const VIEW_ENDPOINT_SUFFIX = "/view";

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
 *
 * @param url - Original photo URL
 * @param resolvedUrl - Presigned URL fetched for view endpoints, if any
 * @returns Direct URL, resolved presigned URL, or blank fallback
 */
export function getDisplayPhotoUrl(
  url: string,
  resolvedUrl: string | undefined,
): string {
  if (isSafeImageUrl(url)) {
    return url;
  }
  if (resolvedUrl && isSafeImageUrl(resolvedUrl)) {
    return resolvedUrl;
  }
  return "about:blank";
}
