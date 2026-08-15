# Necessidade de API — Financeiro do prestador (JTT-95)

Texto pronto para colar na issue Linear.

---

## Necessidade de API — Financeiro do prestador (JTT-95)

### Contexto
A tela Financeiro do prestador precisa mostrar quanto ele tem a receber com base nas propostas aceitas e no status do pagamento do cliente, incluindo a taxa da plataforma e o valor líquido do repasse.

Hoje (API.md) todos os endpoints de /payments são CLIENT-only. Não existe leitura de pagamento para PROVIDER nem modelo de taxa/repasse.

### Fluxo de negócio esperado
1. Cliente paga o valor bruto do serviço (proposta aceita / agreedPrice).
2. Plataforma retém taxa (ex.: % configurável).
3. Prestador visualiza: bruto, taxa, líquido e status (aguardando pagamento do cliente / disponível para repasse / já creditado).

### Endpoints sugeridos (payments :3004)

1) GET /payments/provider/me/finance/summary
   - Auth: JWT + role PROVIDER
   - Retorno sugerido:
     {
       "currency": "BRL",
       "feeRate": 0.10,
       "toReceiveNet": 0,
       "pendingNet": 0,
       "receivedThisMonthNet": 0,
       "feesThisMonth": 0,
       "grossToReceive": 0,
       "feesOnToReceive": 0
     }

2) GET /payments/provider/me/finance/items
   - Auth: JWT + role PROVIDER
   - Query opcional: status=PENDING|PAID|FAILED|REFUNDED|CANCELLED
   - Retorno: lista de itens vinculados à proposta do prestador
     {
       "paymentId": "uuid",
       "proposalId": "uuid",
       "serviceOrderId": "uuid",
       "paymentStatus": "PAID",
       "method": "PIX",
       "grossAmount": 350.00,
       "feeAmount": 35.00,
       "netAmount": 315.00,
       "feeRate": 0.10,
       "paidAt": "...",
       "createdAt": "..."
     }

3) GET /payments/provider/me/finance/chart?months=6
   - Auth: JWT + role PROVIDER
   - Retorno mensal para gráficos:
     [{ "month": "2026-03", "netReceived": 0, "feesRetained": 0 }]

### Regras de segurança
- Ownership: só pagamentos de pedidos em que o prestador autenticado é o provider da proposta aceita (403 se não for).
- Nunca expor dados de cartão (PCI). Só totais e status.
- Taxa e líquido DEVEM ser calculados no backend (fonte da verdade). Frontend não deve inventar fee em produção.

### Modelo de dados (sugestão)
- Persistir feeRate/feeAmount/netAmount no Payment OU calcular via config PLATFORM_FEE_RATE.
- Opcional futuro: status de repasse ao prestador (PENDING_PAYOUT | PAID_OUT) separado do status do pagamento do cliente.

### Prioridade
Bloqueia a tela Financeiro em modo real (hoje roda só com NEXT_PUBLIC_USE_MOCK=true).
