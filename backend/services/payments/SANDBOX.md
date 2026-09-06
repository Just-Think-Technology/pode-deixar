# Sandbox — Mercado Pago (test setup guide)

This guide covers configuring the Mercado Pago **sandbox** environment for the
payments microservice.

> Sandbox mode uses **test credentials** (access token starting with
> `TEST-`). No real charges are made — only simulated transactions.

---

## 1. Create account and test credentials

1. Create an account at [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Go to **Your integrations → Create application** (`payments` is the product)
3. In the application dashboard, open **Test credentials** (or the "Test" tab)
4. Copy:
   - **Test access token** (format `TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxx`)
   - **Test public key** (format `TEST-xxxxxxxx-...`) — used in the frontend later

## 2. Configure environment variables

In the project's `.env.staging` (and `.env` for local dev):

```dotenv
PAYMENT_GATEWAY_ACCESS_TOKEN="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxx"
PAYMENT_GATEWAY_WEBHOOK_SECRET="..."            # REQUIRED (see section 4) — without it the real webhook is rejected
PAYMENT_GATEWAY_NOTIFICATION_URL=""             # Public webhook URL (see section 3)
PAYMENT_GATEWAY_PAYER_EMAIL="teste@pode-deixar.com"
MOCK_WEBHOOK_KEY=""                          # mock webhook key (x-webhook-key), for manual testing if needed
```

> `PAYMENT_GATEWAY_PAYER_EMAIL` is the payer email used in test charges.
> In production it is replaced by the authenticated client's email.

> **Authentication:** the transaction endpoints (`GET/POST /payments`, `charge`,
> `status`) require a Bearer JWT with the `CLIENT` role and only access the
> client's own orders. Use the dev login JWT token.

## 3. Notification webhook (PIX charges)

Mercado Pago can only notify via an **internet-accessible public URL**.

**In production/staging:** configure the URL

```
https://<your-domain>/api/payments/webhook/mercadopago
```

**In local dev:** use a tunnel (e.g. `ngrok http 8080`) and configure

```
http://<tunnel>.ngrok.io/api/payments/webhook/mercadopago
```

The charge is created with the body's `notification_url` — the current
`PAYMENT_GATEWAY_NOTIFICATION_URL` value is used automatically on each charge.

## 4. Validate the webhook signature (required for real mode)

Set an application secret in the Mercado Pago **Webhooks** dashboard and
fill in `PAYMENT_GATEWAY_WEBHOOK_SECRET`. The HMAC signature is validated on
the `x-signature` (`ts`+`v1`) and `x-request-id` headers.

> **Fail-closed:** without `PAYMENT_GATEWAY_WEBHOOK_SECRET`, the
> `POST /payments/webhook/mercadopago` endpoint rejects notifications with `403`.

## 5. Test with real sandbox values

### PIX flow

1. `POST /payments` — registers the payment (`method: "PIX"`); the amount is
   resolved by the backend from the accepted order/proposal (it does not come from the frontend)
2. `POST /payments/:paymentId/charge` — creates a real PIX charge. The response
   contains `pixCopiaECola` (copy-and-paste) and `qrCodeBase64` (QR code)
3. Pay with the test payer app (or use the sandbox production API)
4. Mercado Pago calls `POST /payments/webhook/mercadopago` and the status becomes `PAID`
5. `GET /payments/:paymentId/status` confirms the status
6. All these endpoints require a Bearer token (CLIENT role); the mock webhook uses
   the `x-webhook-key` header to simulate its confirmation in dev

### Mercado Pago test cards (sandbox)

| Brand | Number | CVV | Expiry |
|----------|--------|-----|----------|
| Mastercard | `5031 4332 1540 6351` | `123` | `11/25` |
| Visa | `4235 6477 2802 5682` | `123` | `11/25` |
| American Express | `3753 6512 1114 0026` | `1234` | `11/25` |

> Heads-up: test cards are NOT accepted in the PIX webhook. Test PIX
> is paid with the 2 Mercado Pago test apps (seller user + buyer user).

## 6. Leaving sandbox mode

Once you have production credentials (`APP_USR-...`), just swap
`PAYMENT_GATEWAY_ACCESS_TOKEN` in the production `.env`. **Never use test
credentials in production** — the service detects `TEST-` to enable real mode, but
validating by environment is the ideal approach.

## Caveats

- The payment amount **does not come from the frontend** — the backend resolves it from the order's `agreedPrice` or the accepted proposal (`ACCEPTED`)
- The MP `external_reference` is our `paymentId` (linked via `externalRef`)
- The MP webhook only updates payments whose `externalRef` matches the MP ID
  and requires the payload amount to match the recorded one (`400` otherwise)
- Credit card integration **does not create real charges yet** — when
  the gateway is configured, PIX goes through MP; cards stay mocked until
  the card flow (card token in the frontend) is defined
- The mock webhook requires the `x-webhook-key` = `MOCK_WEBHOOK_KEY` header

## Card policy (PCI-DSS)

Pode Deixar **neither stores nor receives** full card numbers, CVV, passwords,
or PINs. When real CREDIT_CARD is implemented:

- Use **Mercado Pago tokenization**: the card token is generated on the client via
  the official SDK/Bricks and sent to the backend — the backend never sees PAN/CVV
- Or Mercado Pago **hosted Checkout Pro** (gateway page)
- Test cards must **not** be sent to our servers in any flow
