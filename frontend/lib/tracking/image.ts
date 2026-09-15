// Tracking images — safe rendering of evidence photo URLs

const SAFE_IMAGE_SRC = /^(https?:|blob:|data:image\/)/;

export function isSafeImageUrl(url: string): boolean {
  return SAFE_IMAGE_SRC.test(url.trim().toLowerCase());
}

export function toSafeImageUrl(url: string): string {
  return isSafeImageUrl(url) ? url : "about:blank";
}
