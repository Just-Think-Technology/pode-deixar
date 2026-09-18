# Payments

## Current state

- **PIX** via Mercado Pago (sandbox/production)
- **CREDIT_CARD is mock only** (no real card data). When real credit card is
  implemented: use **Mercado Pago tokenization** (card token generated on the
  client via the official SDK/Bricks) or **hosted Checkout Pro** — never
  receive PAN/CVV in the backend. See [PCI](../security/pci-card-data.md).
- The backend only ever sees the card token / gateway transaction ID
- **Logs:** the payments interceptor/filter sanitizes PAN and CVV
  (`sanitizar-dados-sensiveis.ts`)

## Webhook idempotency and anti-replay

- **Mock:** mandatory `eventId` in the DTO + optional `timestamp` (±5min window)
- **Mercado Pago:** `x-request-id` header as `eventId` (unique per
  notification) + HMAC signature with timestamp ±5min
- **Storage:** `payment_webhook_events` table with unique `(gateway, eventId)`
- **Idempotent processing:** already-processed events return the current state
  without reprocessing
- **Race condition:** P2002 (unique violation) is treated as duplicate →
  return current state
- **Amount validation:** compare local `amount` vs gateway before any transition
- **Gateway confirmation:** MP webhooks call `getPayment` to confirm the real
  status (never trust the webhook payload alone)

## Structured logging

- **PaymentLoggerService** at `payments/src/payments/payment-logger.service.ts`
- Events: `payment.created` (paymentId, orderId, amount, method,
  idempotencyKey), `payment.status_changed` (actor: MOCK/MERCADO_PAGO/USER/SYSTEM),
  `payment.webhook_received` (success/duplicate/failure, gateway, eventId),
  `payment.error` (with context), `payment.auth_failure` (webhook_key,
  signature, timestamp, replay), `payment.suspicious`
- Automatic sanitization via `ResponseLoggerInterceptor` + `sanitizarDadosSensiveis`
