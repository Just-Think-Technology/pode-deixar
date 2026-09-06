# Rate Limiting

Global limit via `@nestjs/throttler`: **100 req/min**.

## Sensitive endpoints (stricter)

| Endpoint | Limit |
|---|---|
| `POST /payments/webhook` (mock) | 20 req/min |
| `POST /payments/webhook/mercadopago` | 60 req/min |
| `POST /services/me/:orderId/photos` | 20 req/min |
| `POST /payments/:paymentId/charge` | 10 req/min |

## Implementation

- `ThrottlerModule.forRootAsync` in every service
- Production (`NODE_ENV=production`): `RedisThrottlerStorage`
  (implements NestJS `ThrottlerStorage`)
- Dev/test: in-memory storage
- Redis 7-alpine via compose (port 6379, `appendonly`, `maxmemory 256MB`, LRU);
  one Redis per stack in staging/prod — see [Deploy](../deploy.md)
