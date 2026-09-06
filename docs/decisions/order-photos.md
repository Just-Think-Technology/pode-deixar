# Order Photos (OrderPhoto)

- **Storage:** MinIO, bucket `order-photos`
- **Format:** every photo converted to `.webp` via `sharp` (quality 80)
- **Limits:** max 10 photos per order, 5MB per photo
- **Upload:** dedicated endpoint `POST /services/me/:orderId/photos`
  (multipart), after order creation
- **Validation:** only the CLIENT owning the order may upload photos
