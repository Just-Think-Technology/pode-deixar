# Order Photos (OrderPhoto)

- **Storage:** MinIO, bucket `order-photos`
- **Format:** every photo converted to `.webp` via `sharp` (quality 80)
- **Limits:** max 10 photos per order, 5MB per photo
- **Upload:** dedicated endpoint `POST /services/me/:orderId/photos`
  (multipart), after order creation
- **Validation:** only the CLIENT owning the order may upload photos
- **Access:** `order-photos` bucket is private (no `anonymous public`); reads
  go through the authenticated backend endpoint `GET /services/photos/:photoId/view`
  (owner client, provider with a proposal on the order, or ADMIN), which returns
  a presigned URL valid for 15 minutes. Photo payloads expose `url` as the view
  endpoint path — the frontend fetches it with Bearer and renders the presigned URL.
- **Proxy:** Caddy applies `strip_prefix /api/storage` on `/api/storage/*`, so
  MinIO receives the `<bucket>/<object>` path. The presigned client is addressed
  by the public host (the host is part of the SigV4 signature): the gateway
  prefix is re-attached to the signed path, and Caddy preserves Host, so the
  signature validates on MinIO.
