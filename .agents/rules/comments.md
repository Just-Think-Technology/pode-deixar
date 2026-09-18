# Comment Style Guide

**Scope:** All source files in the monorepo (backend, frontend, shared packages, configs).
**Enforcement:** Code review convention only — no automated linting.
**Philosophy:** Comments explain *why* and *what* (for complex logic), never *how*. Code should be self-explanatory through clear naming and structure.

---

## Comment Syntax by Language

| Language | Inline | Documentation | Section Header |
|----------|--------|---------------|----------------|
| TypeScript / TSX | `//` | `/** */` (JSDoc) | `// --- Name ---` |
| Prisma | `//` | N/A | `// --- Name ---` |
| Docker / YAML / Shell | `#` | N/A | `# --- Name ---` |
| JSON / JSONC | `//` (if parser allows) | N/A | `// --- Name ---` |

> **Generated files** (Prisma client, protobuf, etc.) are never edited — ignore them.

---

## File Header

Every source file starts with a **single-line purpose comment**:

```ts
// Service order repository — data access for orders and proposals
```

```prisma
// Service order schema — core order and proposal models
```

```dockerfile
# Build stage — compiles TypeScript services
```

No copyright, license, author, or date boilerplate. Git history covers provenance.

---

## Section Headers

Major logical sections within a file use a consistent divider:

```ts
// --- Repository Implementation ---
```

```prisma
// --- Enums ---
```

- Use `---` (three dashes) on both sides
- Title Case, concise (2–4 words)
- No trailing punctuation
- One blank line before and after

---

## Inline Comments

**When to write:**
- Complex algorithms or non-obvious logic — explain *what* the block does
- Business rule implementations — explain *why* this approach
- Workarounds for library/framework quirks — explain the constraint
- Performance-sensitive choices — explain the tradeoff

**When NOT to write:**
- Self-explanatory code (clear names, simple logic)
- Restating what the code obviously does
- Translating code to English line-by-line

**Style:**
```ts
// Good: explains the why behind a business rule
// Orders older than 30 days auto-cancel to prevent stale negotiations
if (order.createdAt < thirtyDaysAgo) {
  order.status = 'CANCELLED';
}

// Good: explains what a complex block achieves
// Build provider availability map from raw schedule exceptions
const availability = buildAvailabilityMap(schedules, exceptions);

// Bad: restates the obvious
// Increment counter by 1
counter++;

// Bad: explains how, not why
// Loop through users and filter active ones
const active = users.filter(u => u.isActive);
```

---

## JSDoc (Documentation Comments)

Use `/** */` **only** for exported public APIs: functions, classes, interfaces, types, enums, constants.

```ts
/**
 * Calculates the provider's earnings for a completed order.
 * Applies platform fee (10%) and tax withholding (4.65%).
 *
 * @param order - Completed service order with agreed price
 * @returns Net amount credited to provider's wallet in cents
 * @throws {OrderNotCompletedError} If order status is not COMPLETED
 */
export function calculateProviderEarnings(order: ServiceOrder): number {
  // ...
}
```

**Rules:**
- One-line summary, then blank line, then details if needed
- `@param` for all parameters, `@returns` for non-void, `@throws` for known exceptions
- No `@author`, `@version`, `@since` — git covers this
- No JSDoc for private/internal code — use `//` inline comments instead

---

## Prohibited Patterns

| Pattern | Alternative |
|---------|-------------|
| `// TODO:`, `// FIXME:`, `// NOTE:`, `// HACK:` | Track in Obsidian / issue tracker |
| Commented-out code | Delete — git has history |
| `// ========` or `// ======` section dividers | Use `// --- Name ---` |
| Multi-line `/* */` for inline comments | Use `//` per line |
| File headers with copyright/license/author | Single-line purpose comment only |

---

## Examples

### TypeScript Service
```ts
// Service order service — business logic for order lifecycle

import { Injectable } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { ServiceOrder } from '../entities/service-order.entity';

// --- Public API ---

/**
 * Creates a new service order from a client request.
 * Validates category exists and client has active profile.
 *
 * @param dto - Validated order creation input
 * @returns Created order with PENDING status
 * @throws {CategoryNotFoundError} If categoryId invalid
 * @throws {ClientProfileInactiveError} If client profile not active
 */
@Injectable()
export class ServiceOrderService {
  constructor(private readonly repo: OrderRepository) {}

  async create(dto: CreateOrderDto): Promise<ServiceOrder> {
    // Validate category before creating — prevents orphan orders
    await this.categoryRepo.findByIdOrFail(dto.categoryId);

    const order = ServiceOrder.create(dto);
    // New orders start PENDING; provider must accept within 24h
    order.status = 'PENDING';
    order.expiresAt = addHours(new Date(), 24);

    return this.repo.save(order);
  }

  // --- Private Helpers ---

  private async notifyProvider(order: ServiceOrder): Promise<void> {
    // Fire-and-forget: notification failure shouldn't block order creation
    this.notifications.send(order.providerId, 'new_order', { orderId: order.id }).catch(logError);
  }
}
```

### Prisma Schema
```prisma
// Service order schema — core order and proposal models

// --- Enums ---

enum OrderStatus {
  PENDING
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DISPUTED
}

// --- Models ---

model ServiceOrder {
  id          String      @id @default(cuid())
  title       String
  description String      @db.Text
  status      OrderStatus @default(PENDING)
  priceCents  Int         // Stored in cents to avoid float precision issues

  // Relations
  clientId    String
  client      User        @relation(fields: [clientId], references: [id])
  providerId  String?
  provider    User?       @relation(fields: [providerId], references: [id])
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id])

  // Timestamps
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  expiresAt   DateTime?   // Nullable: only set for PENDING orders
  completedAt DateTime?

  @@index([clientId, status])
  @@index([providerId, status])
}
```

### Dockerfile
```dockerfile
# Build stage — compiles TypeScript services

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first for layer caching
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# --- Runtime Stage ---

FROM node:20-alpine AS runner
WORKDIR /app

# Non-root user for security
USER node

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

CMD ["node", "dist/main.js"]
```

---

## Code Review Checklist

When reviewing PRs, verify:

- [ ] File has a one-line purpose header
- [ ] Section headers use `// --- Name ---` format
- [ ] Inline comments explain *why* or *what* (complex blocks), not *how*
- [ ] No TODO/FIXME/NOTE/HACK tags
- [ ] No commented-out code
- [ ] Public exports have JSDoc with `@param`, `@returns`, `@throws`
- [ ] Private/internal code uses `//` not `/** */`
- [ ] Non-TS files follow native syntax with same principles

---

## Rationale

- **English only** — codebase language; team is international
- **No task tags in code** — single source of truth in issue tracker/Obsidian
- **No dead code** — git history is the archive; commented code rots
- **Minimal headers** — reduces noise, git blame answers "who/when"
- **JSDoc only on public API** — internal code changes frequently; docs rot faster
- **Section headers with `---`** — visually distinct, greppable, consistent
- **Documentation-only enforcement** — keeps CI fast; culture > tooling for style
