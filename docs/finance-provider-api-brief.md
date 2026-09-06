# API Need — Provider Finance (JTT-95)

Ready-to-paste text for the Linear issue.

---

## API Need — Provider Finance (JTT-95)

### Context
The provider Finance screen needs to show how much they are owed based on accepted proposals and the client's payment status, including the platform fee and the net payout amount.

Today (API.md) all /payments endpoints are CLIENT-only. There is no payment reading for PROVIDER nor any fee/payout model.

### Expected business flow
1. Client pays the gross service amount (accepted proposal / agreedPrice).
2. Platform withholds a fee (e.g., configurable %).
3. Provider sees: gross, fee, net, and status (awaiting client payment / available for payout / already credited).

### Suggested endpoints (payments :3004)

1) GET /payments/provider/me/finance/summary
   - Auth: JWT + PROVIDER role
   - Suggested response:
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
   - Auth: JWT + PROVIDER role
   - Optional query: status=PENDING|PAID|FAILED|REFUNDED|CANCELLED
   - Returns: list of items linked to the provider's proposal
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
   - Auth: JWT + PROVIDER role
   - Monthly response for charts:
     [{ "month": "2026-03", "netReceived": 0, "feesRetained": 0 }]

### Security rules
- Ownership: only payments for orders where the authenticated provider owns the accepted proposal (403 otherwise).
- Never expose card data (PCI). Totals and status only.
- Fee and net amounts MUST be computed on the backend (source of truth). The frontend must not invent fees in production.

### Data model (suggestion)
- Persist feeRate/feeAmount/netAmount on Payment OR compute via the PLATFORM_FEE_RATE config.
- Optional future: provider payout status (PENDING_PAYOUT | PAID_OUT) separate from the client payment status.

### Priority
Blocks the Finance screen in real mode (today it only runs with NEXT_PUBLIC_USE_MOCK=true).
