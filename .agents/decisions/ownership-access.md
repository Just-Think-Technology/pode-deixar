# Ownership and Data Access

- **Ownership validation:** protected endpoints that access resources by ID
  must always verify the resource belongs to the authenticated user
- **Status code:** `403 Forbidden` (not `400`) when the resource belongs to
  someone else — authorization semantics
- **Proposal visibility (`GET /services/:orderId`):**
  - CLIENT owning the order → sees all proposals
  - PROVIDER with a proposal on the order → sees only their own proposal
  - Anything else → 403
- **Public vs authenticated:** sensitive data (proposals with prices) is never
  exposed without authentication
- **Directed orders:** orders may target a specific provider (`providerId` set)
  or stay open in the marketplace (`providerId` null). Proposals are only
  accepted from the target provider when `providerId` is set
- **Order read by PROVIDER (`GET /services/:orderId`):**
  - `order.providerId` set and is the user → order data + own proposal (if any)
  - `order.providerId` set and is NOT the user → 403
  - `order.providerId` null → order data + own proposal (if any)
