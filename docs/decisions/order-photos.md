# Order Photos (OrderPhoto)

- **Storage:** MinIO, bucket `order-photos`
- **Format:** every photo converted to `.webp` via `sharp` (quality 80)
- **Limits:** max 10 photos per order, 5MB per photo
- **Upload (client showcase):** dedicated endpoint `POST /services/me/:orderId/photos`
  (multipart, field `photos`), after order creation — only the CLIENT owning the
  order may upload and only when `status === OPEN`
- **Upload (provider completion, JTT-106):** `POST /services/me/:orderId/completion-photos`
  (multipart, field `file`/`photos`, `AnyFilesInterceptor`), accepted for the
  assigned PROVIDER when `status === IN_PROGRESS`; same 10-photo quota, same
  `order-photos` bucket/key `<orderId>/<uuid>.webp`; counted as completion
  evidence and visible in history; completion requires ≥1 photo (fail-closed)
- **Delete (provider completion):** `DELETE /services/me/:orderId/completion-photos/:photoId`
  — provider-owned, blocked when `COMPLETED` (evidence frozen)
- **Completion:** `POST /services/me/:orderId/complete` now takes
  `{ observations: string|null, max 2000 }`, persists `completed_at`/`completed_by`/`observations`
  on `service_orders`, enforces photo evidence, returns history and creates
  `ORDER_COMPLETED` notification for the client
- **History:** `GET /services/me/:orderId/completion` (CLIENT owner or assigned
  PROVIDER) returns `{ order_id, completed_at, completed_by, observations, photos: [{id,url}] }`
- **Validation:** magic-byte check via `validateImageFile` (shared)
- **Access:** `order-photos` bucket is private (no `anonymous public`); reads
  go through the authenticated backend endpoint `GET /services/photos/:photoId/view`
  (owner client, assigned provider, provider with a proposal on the order, or ADMIN),
  which returns a presigned URL valid for 15 minutes. Photo payloads expose `url` as the view
  endpoint path — the frontend fetches it with Bearer and renders the presigned URL.
- **Proxy:** Caddy applies `strip_prefix /api/storage` on `/api/storage/*`, so
  MinIO receives the `<bucket>/<object>` path. The presigned client is addressed
  by the public host (the host is part of the SigV4 signature): the gateway
  prefix is re-attached to the signed path, and Caddy preserves Host, so the
  signature validates on MinIO.
