# [Backend] Endpoints para acompanhamento da contratação e timeline (JTT-105)

> Solicitação da equipe de frontend para a equipe de backend.
> O frontend JTT-105 já está implementado com mocks (`NEXT_PUBLIC_USE_MOCK`)
> e com os fetchers reais escritos em `frontend/api/tracking/index.ts` atrás
> da flag. Basta o backend expor os contratos abaixo para a tela sair do mock.

## Contexto

A tela de acompanhamento (`/client/orders/:id/tracking`,
`/worker/orders/:id/tracking`) precisa de uma visão consolidada da
contratação para cliente e prestador: dados do pedido, contraparte, proposta
aceita, pagamento, agendamento, taxas, evidências, avaliação e histórico de
eventos — respeitando `docs/decisions/ownership-access.md` (403 em recurso
alheio; prestador vê só a própria proposta).

## 1. `GET /services/:orderId/tracking` (CLIENT, PROVIDER, ADMIN)

Retorna a contratação consolidada. Contrato esperado pelo frontend
(`frontend/lib/tracking/types.ts` — `ContractTracking`):

```json
{
  "orderId": "uuid-do-pedido",
  "title": "Troca da torneira",
  "description": "...",
  "categoryName": "Hidráulica",
  "orderStatus": "IN_PROGRESS",
  "counterpart": { "id": "uuid", "completeName": "Nome", "avatarUrl": null },
  "scheduledAt": "2026-09-20T14:00:00.000Z",
  "scheduledEndAt": "2026-09-20T16:00:00.000Z",
  "startedAt": null,
  "address": {
    "street": "Rua Augusta",
    "number": "500",
    "neighborhood": "Consolação",
    "city": "São Paulo",
    "state": "SP",
    "postal_code": "01305-000"
  },
  "grossAmount": 180.0,
  "feeAmount": 18.0,
  "netAmount": 162.0,
  "proposal": {
    "id": "uuid",
    "providerId": "uuid",
    "price": 180.0,
    "description": "...",
    "estimatedDuration": "2 horas",
    "acceptedAt": "2026-09-10T15:30:00.000Z"
  },
  "payment": {
    "id": "uuid-do-pagamento",
    "status": "PAID",
    "method": "PIX",
    "amount": 180.0,
    "paidAt": "2026-09-11T18:00:00.000Z"
  },
  "evidence": {
    "completedAt": "2026-09-20T11:45:00.000Z",
    "completedBy": "Nome do prestador",
    "observations": "...",
    "photos": [{ "id": "uuid", "url": "https://..." }]
  },
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "Excelente!",
    "createdAt": "2026-09-21T10:00:00.000Z"
  },
  "cancelReason": null,
  "cancelledAt": null,
  "createdAt": "2026-09-08T10:00:00.000Z"
}
```

Notas:

- `feeAmount`/`netAmount` seguem `docs/decisions/payments.md` (calculados no
  backend, nunca no frontend).
- `evidence.photos` usa URLs públicas/presigned como em
  `docs/decisions/order-photos.md`.
- `review` pode ser `null` (ainda não avaliada); o frontend lê
  `GET /reviews/service-order/:orderId` como fallback — esse endpoint já
  existe.
- Hoje o detalhe (`GET /services/:orderId`) retorna só
  pedido + propostas + fotos + categoria, sem pagamento, taxas, evidências ou
  histórico.

## 2. Histórico de eventos da timeline

Não há nenhum model/endpoint de timeline hoje. Opções (a critério do backend):

- Novo model `OrderStatusHistory`
  (`orderId, fromStatus?, toStatus/eventKey, actorId, reason?, createdAt`)
  alimentado em aceitar proposta, contratar direto, pagamento PAID, agendar,
  iniciar, concluir, cancelar e avaliar; ou
- `timeline[]` derivado dessas tabelas e embutido na resposta do item 1.

Eventos esperados: solicitação enviada, proposta enviada, proposta aceita,
pagamento confirmado, serviço agendado, serviço iniciado, serviço concluído,
evidências adicionadas, avaliação realizada — cada um com data/hora e usuário
responsável quando disponível.

## 3. `POST /services/me/:orderId/start` (PROVIDER dono)

Transição Agendado → Em andamento (grava `startedAt`). Regras: 403 sem posse,
400 em transição inválida (sem pagamento PAID, já iniciado, concluído ou
cancelado), idempotente. Hoje só existe `POST .../complete`.

## 4. `POST /services/me/:orderId/finish` (PROVIDER dono)

Conclusão com evidências em uma chamada (multipart: `photos[]` + campo
`observations`): converte para webp via sharp e salva no MinIO como em
`docs/decisions/order-photos.md`. Regras: exige ≥ 1 foto, `IN_PROGRESS →
COMPLETED`, idempotente, persiste `completedAt`/`completedBy`. O `complete`
atual não aceita fotos/observações, e o upload existente
(`POST /services/me/:orderId/photos`) é CLIENT-only e OPEN-only.

## 5. Cancelamento com motivo a partir de qualquer status não final

O `DELETE /services/me/:orderId` atual só cancela pedidos `OPEN` e sem
motivo. Necessário: cancelar contratação em andamento/agendada com
`cancelReason` + `cancelledAt`, mantendo o histórico consultável e
desabilitando início, conclusão e avaliação.

## 6. Mapeamento oficial de status e notificações

Definir o mapeamento de `Aguardando pagamento / Agendado / Em andamento /
Concluído / Cancelado` sobre `ServiceOrderStatus` (`OPEN/IN_PROGRESS/...`) +
`PaymentStatus` + `scheduledAt`/`startedAt`, e notificar a contraparte em
mudança relevante de status.

## Critérios de aceite (backend)

- Transições inválidas ou duplicadas → `400`; sem acesso → `403`.
- Preço, taxas e status calculados no backend; nunca confiar em valores do
  frontend.
- Sem PAN/CVV em qualquer endpoint (PCI-DSS).
