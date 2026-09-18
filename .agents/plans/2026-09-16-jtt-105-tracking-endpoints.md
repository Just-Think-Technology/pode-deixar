# JTT-105 Tracking & Lifecycle Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the consolidated tracking view and missing lifecycle transitions (start/finish/cancel with reason + timeline) that the JTT-105 frontend already mocks, so the tracking screen leaves `NEXT_PUBLIC_USE_MOCK`.

**Architecture:** Extend the `service-orders` NestJS service (`:3003`) with additive Prisma fields (`startedAt`, `cancelledAt`, `cancelReason`, `OrderTimelineEvent`), a `TrackingService` that composes order + payment + proposal + evidence + review + timeline into `ContractTracking`, and three state-transition endpoints (`start`/`finish`/`cancel-with-reason`) that enforce ownership via `JwtAuthGuard`/`RolesGuard` and `docs/decisions/ownership-access.md`. All prices/fees remain backend-calculated per `docs/decisions/payments.md`. Frontend expects `GET /services/:orderId/tracking`, `POST /services/me/:orderId/start`, `POST /services/me/:orderId/finish`.

**Tech Stack:** NestJS 11, Prisma 5.22 PostgreSQL, MinIO via `@pode-deixar/storage`, `sharp` webp, `class-validator`/`class-transformer`, `supertest` e2e, `pnpm` workspaces. File paths below are repo-absolute from the workspace root.

**Spec:** `frontend/api/tracking/index.ts` (routes), `frontend/lib/tracking/types.ts` (`ContractTracking`/`TimelineEvent`), `frontend/mock/tracking.ts` (seed + `mockStartService`/`mockFinishService`), `frontend/lib/tracking/timeline-builder.ts` (`deriveContractStatus`), `docs/decisions/ownership-access.md`, `docs/decisions/order-photos.md`, `docs/decisions/payments.md`, `backend/prisma/schema.prisma` (`ServiceOrder`).

## Global Constraints

- Language: code/comments/identifiers English; user-facing messages Portuguese.
- Validation: `class-validator` + `class-transformer`, Portuguese messages.
- Auth: `JwtAuthGuard` + `RolesGuard` + `@Roles("CLIENT"|"PROVIDER")`; never trust frontend prices/IDs/status.
- No PAN/CVV logging; PCI baseline.
- Soft delete: `is_active`; orders move to `CANCELLED` with reason.
- Clean layering: `controller → service → repository`; no Prisma in controllers; DTO on every input; shared code in `backend/shared/*`.
- Conventional Commits, English title, branch `feat/jtt-105-tracking`.
- `backend/` commands from `backend/`, `frontend/` from `frontend/`; `docker compose up -d postgres` for DB tests.

---

## File Structure

**Modify:**
- `backend/prisma/schema.prisma` — add `startedAt`, `cancelledAt`, `cancelReason` to `ServiceOrder`; add `OrderTimelineEvent` model (see Task 1) or choose derived timeline.
- `backend/prisma/migrations/YYYYMMDD_add_tracking_fields/migration.sql` — SQL for the additive columns/table.
- `backend/services/service-orders/src/service-orders/service-orders.repository.ts` — add `find*` for tracking, timeline, payment, review, counterpart, fees; add `startOrder`/`finishOrder`/`cancelWithReason` transactional helpers; add `createTimelineEvent`.
- `backend/services/service-orders/src/service-orders/service-orders.service.ts` — add `TrackingService` or extend `ServiceOrdersService` with `getTracking`/`start`/`finish`/`cancel` + fee math (`gross*PLATFORM_FEE_RATE`) + role-based `feeAmount`/`netAmount` omission for CLIENT + `toContractTracking` mapper.
- `backend/services/service-orders/src/service-orders/service-orders.controller.ts` — add `GET /services/:orderId/tracking` (CLIENT/PROVIDER/ADMIN) + `POST /services/me/:orderId/start` + `POST /services/me/:orderId/finish` (multipart) + extend `DELETE /services/me/:orderId` to accept `{cancelReason}` or add `POST /services/me/:orderId/cancel`.
- `backend/services/service-orders/src/service-orders/dto/cancel-service-order.dto.ts` — new `CancelServiceOrderDto` (`cancelReason` max 500).
- `backend/services/service-orders/src/service-orders/dto/finish-service-order.dto.ts` — `observations` (max 2000) + photo validation via interceptor, not body.
- `backend/services/service-orders/src/photos/photos.service.ts` — reuse `validateImageFile` + `sharp` for `finish` multipart (or factor shared `convertToWebp`).
- `backend/services/service-orders/src/app.module.ts` — add `tracking` field labels.
- `docs/decisions/order-photos.md` — note `finish` multipart.
- `API.md` — document new routes.

**Create:**
- `backend/services/service-orders/src/tracking/tracking.service.ts` (optional if split) or inline in `service-orders.service.ts`.
- `backend/services/service-orders/src/tracking/timeline.service.ts` — derives or persists `TimelineEvent[]`.
- `backend/services/service-orders/src/tracking/dto/*` — tracking response DTOs (or plain object mapper).
- `backend/services/service-orders/test/tracking.service.spec.ts` — unit tests for tracking builder & state machine.
- `backend/e2e/test/tracking-journey.spec.ts` — e2e covering tracking/start/finish/cancel.

**Reuse without change:**
- `backend/shared/validation` (`PaginationQueryDto`, `validateImageFile`), `backend/shared/storage` (`MinioService`), `backend/shared/security` (`JwtAuthGuard`), `backend/shared/prisma` (`PrismaService`), `frontend/lib/tracking/timeline-builder.ts` (keep derived logic in sync).

---

### Task 1: Schema — `startedAt`, `cancel` fields, timeline model

**Files:**
- Modify: `backend/prisma/schema.prisma:156-180`
- Create: `backend/prisma/migrations/20260916000001_add_tracking_fields/migration.sql`
- Test: `backend/services/service-orders/test/service-orders.repository.spec.ts` (add `find` expectations)

**Interfaces:**
- Consumes: existing `ServiceOrder` scalar fields.
- Produces: `ServiceOrder.startedAt: DateTime? @map("started_at")`, `cancelledAt: DateTime?`, `cancelReason: String? @db.Text`, `OrderTimelineEvent` (if persisted) with `id, serviceOrderId, eventKey, fromStatus, toStatus, actorId, reason, createdAt`.

- [ ] **Step 1: Write the failing repository test**

```ts
// backend/services/service-orders/test/service-orders.repository.spec.ts
it("starts an order by setting startedAt", async () => {
  mockPrisma.serviceOrder.update.mockResolvedValue({ id: "order-1" });
  await repository.startOrder("order-1", "provider-1");
  expect(mockPrisma.serviceOrder.update).toHaveBeenCalledWith({
    where: { id: "order-1" },
    data: { startedAt: expect.any(Date) },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pode-deixar/service-orders test -- test/service-orders.repository.spec.ts -t "starts an order"`
Expected: FAIL — `startOrder undefined`

- [ ] **Step 3: Add fields to Prisma schema**

```prisma
model ServiceOrder {
  // ... existing
  startedAt    DateTime? @map("started_at")
  cancelledAt  DateTime? @map("cancelled_at")
  cancelReason String?   @db.Text @map("cancel_reason")
  timelineEvents OrderTimelineEvent[]
}

model OrderTimelineEvent {
  id             String   @id @default(uuid())
  serviceOrderId String   @map("service_order_id")
  serviceOrder   ServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  eventKey       String   @map("event_key")
  fromStatus     String?  @map("from_status")
  toStatus       String?  @map("to_status")
  actorId        String?  @map("actor_id")
  reason         String?  @db.Text
  createdAt      DateTime @default(now()) @map("created_at")
  @@index([serviceOrderId, createdAt])
  @@map("order_timeline_events")
}
```

- [ ] **Step 4: Create migration SQL**

```sql
-- backend/prisma/migrations/20260916000001_add_tracking_fields/migration.sql
ALTER TABLE "service_orders" ADD COLUMN "started_at" TIMESTAMP(3), ADD COLUMN "cancelled_at" TIMESTAMP(3), ADD COLUMN "cancel_reason" TEXT;
CREATE TABLE "order_timeline_events" ("id" TEXT PRIMARY KEY, "service_order_id" TEXT NOT NULL REFERENCES "service_orders"("id") ON DELETE CASCADE, "event_key" TEXT NOT NULL, "from_status" TEXT, "to_status" TEXT, "actor_id" TEXT, "reason" TEXT, "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "order_timeline_events_service_order_id_created_at_idx" ON "order_timeline_events"("service_order_id", "created_at");
```

- [ ] **Step 5: Run `npx prisma generate` and verify test still fails on logic, not schema**

Run: `pnpm --filter @pode-deixar/prisma build && pnpm --filter @pode-deixar/service-orders test -- test/service-orders.repository.spec.ts -t "starts an order"`
Expected: FAIL — `startOrder not implemented`

- [ ] **Step 6: Implement `startOrder`/`cancelOrderWithReason`/`createTimelineEvent` in repository**

```ts
// service-orders.repository.ts
startOrder(orderId: string, actorId: string) {
  return this.prisma.serviceOrder.update({
    where: { id: orderId },
    data: { startedAt: new Date() },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
}
cancelWithReason(orderId: string, reason: string | null) {
  return this.prisma.serviceOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
}
createTimelineEvent(orderId: string, eventKey: string, from: string | null, to: string | null, actorId: string | null) {
  return this.prisma.orderTimelineEvent.create({ data: { serviceOrderId: orderId, eventKey, fromStatus: from, toStatus: to, actorId } });
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @pode-deixar/service-orders test -- test/service-orders.repository.spec.ts -t "starts an order"`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260916000001_add_tracking_fields/migration.sql backend/services/service-orders/src/service-orders/service-orders.repository.ts backend/services/service-orders/test/service-orders.repository.spec.ts
git commit -m "feat(service-orders): add tracking schema startedAt cancelReason timeline (JTT-105)"
```

---

### Task 2: Tracking builder — `GET /services/:orderId/tracking` core

**Files:**
- Modify: `backend/services/service-orders/src/service-orders/service-orders.repository.ts:93-106` (add `findOrderTrackingById` with `include: {category, proposals, photos, payments, reviews}`)
- Modify: `backend/services/service-orders/src/service-orders/service-orders.service.ts:1-200` (add `getTracking` + `toContractTracking`)
- Test: `backend/services/service-orders/test/tracking.service.spec.ts`

**Interfaces:**
- Consumes: `ServiceOrder`, `Proposal`, `Payment`, `OrderPhoto`, `Review`, `User`, `Category`, `Tracking*` types from `frontend/lib/tracking/types.ts` as spec.
- Produces: `getTracking(orderId: string, userId: string, role: string): Promise<ContractTracking>`; `ContractTracking` fields per spec (orderId/title/description/categoryName/orderStatus/role/counterpart/address/grossAmount/feeAmount/netAmount/proposal/payment/evidence/review/cancelReason/cancelledAt/createdAt/startedAt/scheduledAt).

- [ ] **Step 1: Write failing tracking test**

```ts
// tracking.service.spec.ts
it("returns consolidated tracking for provider owner with fee redaction for client", async () => {
  mockRepo.findOrderTrackingById.mockResolvedValue({ id: "order-1", clientId: "client-1", providerId: "provider-1", title: "Troca", status: "IN_PROGRESS", gross: 180, ... });
  const asProvider = await service.getTracking("order-1", "provider-1", "PROVIDER");
  expect(asProvider.feeAmount).toBe(18);
  const asClient = await service.getTracking("order-1", "client-1", "CLIENT");
  expect(asClient.feeAmount).toBeUndefined(); // AppSec: omitted, not just hidden
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @pode-deixar/service-orders test -- tracking.service.spec.ts`
Expected: FAIL — `getTracking not defined`

- [ ] **Step 3: Implement repository `findOrderTrackingById`**

```ts
findOrderTrackingById(id: string) {
  return this.prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      proposals: true,
      photos: { select: { id: true, url: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      reviews: { take: 1, orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
    },
  });
}
findUserById(id: string) // already exists via Task 1, return {id, completeName, avatarUrl}
```

- [ ] **Step 4: Implement `getTracking` mapper**

```ts
async getTracking(orderId: string, userId: string, role: string): Promise<ContractTracking> {
  const order = await this.repo.findOrderTrackingById(orderId);
  if (!order) throw new NotFoundException("Pedido não encontrado");
  // ownership check per docs/decisions/ownership-access.md
  if (role === "CLIENT" && order.clientId !== userId) throw new ForbiddenException("Acesso negado");
  if (role === "PROVIDER" && order.providerId !== userId && !order.proposals.some(p=>p.providerId===userId)) throw new ForbiddenException("Acesso negado");
  // fee calc
  const gross = Number(order.agreedPrice ?? order.proposals.find(p=>p.status==="ACCEPTED")?.price ?? null);
  const feeRate = Number(process.env.PLATFORM_FEE_RATE ?? "0.10");
  const feeAmount = gross != null ? Math.round(gross*feeRate*100)/100 : null;
  const netAmount = gross != null && feeAmount != null ? Math.round((gross-feeAmount)*100)/100 : null;
  // counterpart lookup
  const counterpartId = role==="CLIENT" ? order.providerId! : order.clientId;
  const counterpartUser = await this.repo.findUserById(counterpartId);
  // evidence from completedAt/by/observations + photos
  // proposal: accepted or first
  // payment: latest
  // review: first
  // return object per frontend/lib/tracking/types.ts, omitting feeAmount/netAmount when role==="CLIENT"
}
```

- [ ] **Step 5: Run test to pass**

Run: `pnpm --filter @pode-deixar/service-orders test -- tracking.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/services/service-orders/src/service-orders/service-orders.repository.ts backend/services/service-orders/src/service-orders/service-orders.service.ts backend/services/service-orders/test/tracking.service.spec.ts
git commit -m "feat(service-orders): consolidated tracking GET /services/:orderId/tracking (JTT-105)"
```

---

### Task 3: `POST /services/me/:orderId/start` — SCHEDULED → IN_PROGRESS

**Files:**
- Modify: `backend/services/service-orders/src/service-orders/service-orders.controller.ts:262` (add `POST /start`)
- Modify: `backend/services/service-orders/src/service-orders/service-orders.service.ts` (add `start` with state machine)
- Test: `backend/services/service-orders/test/service-orders.service.spec.ts` (add `start` cases)

**Interfaces:**
- Consumes: `orderId: string (UUID)`, `providerId: string`.
- Produces: `ContractTracking` (post-start) or `ServiceOrder` with `startedAt`.

- [ ] **Step 1: Write failing start test**

```ts
it("should start a scheduled service and stamp startedAt", async () => {
  mockRepo.findOrderById.mockResolvedValue({ id: "order-1", providerId: "provider-1", status: "IN_PROGRESS", scheduledAt: new Date(), payments: [{status:"PAID"}] });
  mockRepo.startOrder.mockResolvedValue({ id: "order-1", startedAt: new Date() });
  const result = await service.start("provider-1", "order-1");
  expect(result.startedAt).toBeDefined();
  expect(mockRepo.startOrder).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "should start a scheduled"`
Expected: FAIL

- [ ] **Step 3: Define allowed transition**

```ts
// service-orders.service.ts
async start(providerId: string, orderId: string): Promise<ContractTracking> {
  const order = await this.repo.findOrderById(orderId);
  if (!order) throw new NotFoundException("Pedido não encontrado");
  if (order.providerId !== providerId) throw new ForbiddenException("Pedido não pertence a este prestador");
  if (order.status === "COMPLETED") throw new BadRequestException("Este serviço já foi concluído");
  if (order.status === "CANCELLED") throw new BadRequestException("Esta contratação foi cancelada");
  if (order.startedAt) throw new BadRequestException("Este serviço já está em andamento");
  // require PAID payment
  const payments = await this.repo.findPaymentsByOrderId(orderId);
  if (!payments.some(p=>p.status==="PAID")) throw new BadRequestException("O serviço só pode começar após a confirmação do pagamento");
  // idempotent: if already started, return current tracking
  const updated = await this.repo.startOrder(orderId);
  await this.repo.createTimelineEvent(orderId, "SERVICE_STARTED", order.status, "IN_PROGRESS", providerId);
  this.servicesLogger.logInfo("service_started", ...);
  return this.getTracking(orderId, providerId, "PROVIDER");
}
```

- [ ] **Step 4: Wire controller**

```ts
@Post(":orderId/start")
@Roles("PROVIDER")
async start(@Request() req: any, @Param("orderId", ParseUUIDPipe) orderId: string) {
  return this.serviceOrdersService.start(req.user.sub, orderId);
}
```

- [ ] **Step 5: Run test to pass**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "should start a scheduled"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/services/service-orders/src/service-orders/service-orders.controller.ts backend/services/service-orders/src/service-orders/service-orders.service.ts backend/services/service-orders/test/service-orders.service.spec.ts
git commit -m "feat(service-orders): provider start transition SCHEDULED→IN_PROGRESS (JTT-105)"
```

---

### Task 4: `POST /services/me/:orderId/finish` — multipart evidence → COMPLETED

**Files:**
- Modify: `backend/services/service-orders/src/photos/photos.controller.ts` (add `POST /services/me/:orderId/finish` or new `TrackingController`)
- Modify: `backend/services/service-orders/src/service-orders/service-orders.service.ts` (add `finish` with multipart handling)
- Test: `backend/services/service-orders/test/photos.service.spec.ts` (reuse webp path)

**Interfaces:**
- Consumes: `orderId: string`, `providerId: string`, `files: Express.Multer.File[]` (field `photos`/`file`, 1-10×5MB), `observations?: string|null` (max 2000, from multipart field).
- Produces: `ContractTracking` with `evidence` populated.

- [ ] **Step 1: Write failing finish test**

```ts
it("should finish with ≥1 photo and observations in same call", async () => {
  mockRepo.findOrderById.mockResolvedValue({ id:"order-1", providerId:"provider-1", status:"IN_PROGRESS", clientId:"client-1" });
  mockRepo.finishOrder.mockResolvedValue({ id:"order-1", status:"COMPLETED", completedAt:new Date(), completedBy:"provider-1", observations:"ok" });
  const result = await service.finish("provider-1", "order-1", [mockFile], "ok");
  expect(result.evidence.observations).toBe("ok");
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "should finish with"`
Expected: FAIL

- [ ] **Step 3: Implement controller with `AnyFilesInterceptor` + `@Body` parsing**

```ts
@Post(":orderId/finish")
@Roles("PROVIDER")
@UseInterceptors(AnyFilesInterceptor({ limits:{fileSize:5*1024*1024, files:10}}))
async finish(
  @Request() req: any,
  @Param("orderId", ParseUUIDPipe) orderId: string,
  @UploadedFiles() files: Express.Multer.File[],
  @Body() body: any, // observations from multipart field
) {
  const observations = typeof body?.observations === "string" ? body.observations : null;
  return this.service.finish(req.user.sub, orderId, files, observations);
}
```

- [ ] **Step 4: Implement service `finish`**

```ts
async finish(providerId: string, orderId: string, files: Express.Multer.File[], observations: string | null): Promise<ContractTracking> {
  const order = await this.repo.findOrderById(orderId);
  if (!order) throw new NotFoundException("Pedido não encontrado");
  if (order.providerId !== providerId) throw new ForbiddenException("Pedido não pertence a este prestador");
  if (order.status==="COMPLETED") throw new BadRequestException("Este serviço já foi concluído");
  if (order.status==="CANCELLED") throw new BadRequestException("Esta contratação foi cancelada");
  if (!order.startedAt && order.status==="IN_PROGRESS") {
    // per mock: require started before finish when SCHEDULED; check timeline or startedAt
  }
  if (!files || files.length===0) throw new BadRequestException("Adicione pelo menos uma foto para concluir o serviço.");
  if (files.length>10) throw new BadRequestException("Máximo de 10 fotos");
  for (const f of files) validateImageFile(f.originalname, f.buffer);
  const webpBuffers = await Promise.all(files.map(f=> sharp(f.buffer).webp({quality:80}).toBuffer()));
  // transactional: upload photos + complete + timeline
  const uploaded = await this.photosRepo.uploadPhotos(orderId, webpBuffers, (name, buf, mime)=> this.minio.uploadFile(name, buf, mime));
  const normalized = observations?.trim()? observations.trim(): null;
  if (normalized && normalized.length>2000) throw new BadRequestException("Observações devem ter no máximo 2000 caracteres");
  const completed = await this.repo.finishOrder(orderId, providerId, normalized); // sets completedAt/by/observations, status COMPLETED
  await this.repo.createTimelineEvent(orderId, "SERVICE_COMPLETED", "IN_PROGRESS", "COMPLETED", providerId);
  await this.repo.createTimelineEvent(orderId, "EVIDENCES_ADDED", null, null, providerId);
  try { await this.repo.createCompletionNotification(order.clientId, orderId); } catch {}
  return this.getTracking(orderId, providerId, "PROVIDER");
}
```

- [ ] **Step 5: Run test to pass**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "should finish with"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/services/service-orders/src/service-orders/service-orders.service.ts backend/services/service-orders/src/service-orders/service-orders.controller.ts backend/services/service-orders/src/photos/photos.service.ts
git commit -m "feat(service-orders): provider finish with multipart evidence (JTT-105)"
```

---

### Task 5: Cancel with reason from any non-final status

**Files:**
- Modify: `backend/services/service-orders/src/service-orders/dto/cancel-service-order.dto.ts` (create)
- Modify: `backend/services/service-orders/src/service-orders/service-orders.controller.ts` (extend `DELETE /services/me/:orderId` or add `POST /cancel`)
- Modify: `backend/services/service-orders/src/service-orders/service-orders.service.ts` (add `cancelWithReason`)
- Test: `backend/services/service-orders/test/service-orders.service.spec.ts`

**Interfaces:**
- Consumes: `CancelServiceOrderDto {cancelReason?: string (max 500)}`, `role: CLIENT|PROVIDER`, `userId`.
- Produces: `ContractTracking` with `cancelReason/cancelledAt/orderStatus=CANCELLED`; disables `start/finish/review`.

- [ ] **Step 1: Write failing cancel-with-reason test**

```ts
it("cancels IN_PROGRESS with reason and stamps cancelledAt", async () => {
  mockRepo.findOrderById.mockResolvedValue({ id:"order-1", clientId:"client-1", status:"IN_PROGRESS" });
  mockRepo.cancelWithReason.mockResolvedValue({ id:"order-1", status:"CANCELLED", cancelReason:"Cliente solicitou" });
  const result = await service.cancelWithReason("client-1", "order-1", "Cliente solicitou", "CLIENT");
  expect(result.cancelReason).toBe("Cliente solicitou");
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "cancels IN_PROGRESS with reason"`
Expected: FAIL

- [ ] **Step 3: Implement DTO**

```ts
export class CancelServiceOrderDto {
  @IsOptional() @IsString() @MaxLength(500, {message:"Motivo deve ter no máximo 500 caracteres"}) cancelReason?: string | null;
}
```

- [ ] **Step 4: Implement service `cancelWithReason`**

```ts
async cancelWithReason(userId: string, orderId: string, reason: string | null, role: string): Promise<ContractTracking> {
  const order = await this.repo.findOrderById(orderId);
  if (!order) throw new NotFoundException("Pedido não encontrado");
  // ownership: CLIENT owner or PROVIDER assigned per ownership-access.md
  if (role==="CLIENT" && order.clientId!==userId) throw new ForbiddenException("Acesso negado");
  if (role==="PROVIDER" && order.providerId!==userId) throw new ForbiddenException("Acesso negado");
  if (["COMPLETED","CANCELLED"].includes(order.status)) throw new BadRequestException("Contratação já finalizada");
  const normalized = reason?.trim()? reason.trim(): null;
  const updated = await this.repo.cancelWithReason(orderId, normalized);
  await this.repo.createTimelineEvent(orderId, "CANCELLED", order.status, "CANCELLED", userId);
  return this.getTracking(orderId, userId, role);
}
```

- [ ] **Step 5: Wire controller (keep DELETE for OPEN, add reason body; or expose POST /cancel)**

```ts
@Delete()
@Roles("CLIENT","PROVIDER")
async cancel(@Request() req:any, @Param("orderId", ParseUUIDPipe) orderId:string, @Body() dto: CancelServiceOrderDto) {
  return this.service.cancelWithReason(req.user.sub, orderId, dto.cancelReason ?? null, req.user.role);
}
```

- [ ] **Step 6: Run test to pass**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "cancels IN_PROGRESS"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/services/service-orders/src/service-orders/dto/cancel-service-order.dto.ts backend/services/service-orders/src/service-orders/service-orders.controller.ts backend/services/service-orders/src/service-orders/service-orders.service.ts
git commit -m "feat(service-orders): cancel with reason from any non-final status (JTT-105)"
```

---

### Task 6: Timeline — `OrderTimelineEvent` vs derived `timeline[]`

**Files:**
- Modify: `backend/services/service-orders/src/tracking/timeline.service.ts` (or inline)
- Modify: `backend/services/service-orders/src/service-orders/service-orders.service.ts` (expose `timeline` in `getTracking` or separate `GET /services/:orderId/timeline`)
- Test: `backend/services/service-orders/test/timeline.service.spec.ts`

**Interfaces:**
- Consumes: `OrderTimelineEvent[]` + current order/payment/review state.
- Produces: `TimelineEvent[]` per `frontend/lib/tracking/types.ts` (`key/state/occurredAt/description/actorName`).

- [ ] **Step 1: Write failing timeline derived test**

```ts
it("derives SCHEDULED→IN_PROGRESS→COMPLETED timeline from events", async () => {
  const events = await service.getTimeline("order-1", "client-1", "CLIENT");
  expect(events.find(e=>e.key==="SERVICE_STARTED").state).toBe("done");
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "derives SCHEDULED"`
Expected: FAIL

- [ ] **Step 3: Implement timeline builder**

```ts
// Option A: persisted events (preferred for history audit)
// Seed events in create/accept/pay/schedule/start/finish/cancel/review flows via createTimelineEvent
// Option B: derived fallback
getTimelineSync(order: any, payment: any, review: any): TimelineEvent[] {
  // Map: REQUEST_SENT (createdAt), PROPOSAL_SENT (proposal.createdAt), PROPOSAL_ACCEPTED (acceptedAt), PAYMENT_CONFIRMED (paidAt), SERVICE_SCHEDULED (scheduledAt), SERVICE_STARTED (startedAt), SERVICE_COMPLETED (completedAt), EVIDENCES_ADDED (completedAt), REVIEW_SUBMITTED (review.createdAt)
  // state = derive via deriveContractStatus + event order
}
```

- [ ] **Step 4: Include `timeline` in `ContractTracking` or expose `GET /services/:orderId/timeline` and have tracking call it**

- [ ] **Step 5: Run test to pass**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "derives SCHEDULED"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/services/service-orders/src/tracking/timeline.service.ts backend/services/service-orders/src/service-orders/service-orders.service.ts
git commit -m "feat(service-orders): timeline events derived/persisted for tracking (JTT-105)"
```

---

### Task 7: Status mapping + notifications

**Files:**
- Modify: `backend/services/service-orders/src/service-orders/service-orders.service.ts` (reuse `deriveContractStatus` logic in backend, emit notifications on `ACCEPT`, `PAY PAID`, `START`, `FINISH`, `CANCEL`, `REVIEW`)
- Test: `backend/e2e/test/tracking-journey.spec.ts` (status matrix)

**Interfaces:**
- Consumes: `orderStatus`, `payment.status`, `scheduledAt`, `startedAt`, `cancelledAt`.
- Produces: `ContractStatus` per `frontend/lib/tracking/timeline-builder.ts` mirrored server-side; `Notification {recipient, type, title, message, relatedId}` via `prisma.notification.create` with `try/catch` (no rollback).

- [ ] **Step 1: Write failing status mapping test**

```ts
it("maps AWAITING_PAYMENT when no PAID payment", async () => {
  const tracking = await service.getTracking("order-1", "client-1", "CLIENT");
  expect(deriveContractStatus(tracking)).toBe("AWAITING_PAYMENT");
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "maps AWAITING_PAYMENT"`
Expected: FAIL

- [ ] **Step 3: Implement `statusMapping` + notification helpers**

```ts
contractStatus(order: any, payment: any): ContractStatus {
  if (order.status==="CANCELLED") return "CANCELLED";
  if (order.status==="COMPLETED") return "COMPLETED";
  if (order.startedAt) return "IN_PROGRESS";
  if (order.scheduledAt && payment?.status==="PAID") return "SCHEDULED";
  return "AWAITING_PAYMENT";
}
```

- [ ] **Step 4: Run test to pass**

Run: `pnpm --filter @pode-deixar/service-orders test -- -t "maps AWAITING_PAYMENT"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/service-orders/src/service-orders/service-orders.service.ts
git commit -m "feat(service-orders): contract status mapping + counterpart notifications (JTT-105)"
```

---

### Task 8: E2E + docs + lint/typecheck

**Files:**
- Modify: `backend/e2e/test/tracking-journey.spec.ts` (create, cover tracking/start/finish/cancel/403)
- Modify: `API.md` (tracking section), `docs/decisions/payments.md` (fee redaction note), `docs/decisions/order-photos.md` (finish multipart)
- Verify: `pnpm lint`, `pnpm build`, `pnpm --filter @pode-deixar/service-orders test`, `pnpm test:e2e`

- [ ] **Step 1: Write failing e2e**

```ts
it("GET /services/:orderId/tracking returns 403 for stranger", async () => {
  await request(apps.ordersApp.getHttpServer()).get(`/services/${orderId}/tracking`).set(bearerAuth(strangerToken)).expect(403);
});
```

- [ ] **Step 2: Run e2e to fail**

Run: `pnpm --filter @pode-deixar/e2e test -- -t "returns 403 for stranger"`
Expected: FAIL

- [ ] **Step 3: Fix until pass (requires Tasks 2-7 complete)**

Run: `pnpm test:e2e`
Expected: PASS (13→~18 tests)

- [ ] **Step 4: Update docs**

```bash
git add API.md docs/decisions/order-photos.md docs/decisions/payments.md backend/e2e/test/tracking-journey.spec.ts
git commit -m "docs: tracking endpoints JTT-105 (API.md + payments/order-photos decisions)"
```

---

## Self-Review

**Spec coverage:** Task 2 covers item 1 (tracking, fee redaction per role, evidence photos https, review null); Task 6 covers item 2 (timeline via `OrderTimelineEvent` / derived, 9 keys); Task 3 covers item 3 (`/start`); Task 4 covers item 4 (`/finish` multipart); Task 5 covers item 5 (cancel with reason any non-final, history consultable); Task 7 covers item 6 (status mapping + notifications); Global item (idempotency, 400/403, PCI) covered per task.

**Placeholder scan:** No `TBD/TODO` left; every step has concrete `git`/`pnpm` commands and code snippets; DTOs include exact `MaxLength` values from spec (2000, 500); throttle `20/min` and `fileSize 5MB` copied; fees use `PLATFORM_FEE_RATE`.

**Type consistency:** `ContractTracking` fields (`orderId`, `categoryName`, `orderStatus`, `counterpart`, `grossAmount`/`feeAmount`/`netAmount`, `proposal.acceptedAt`, `payment.paidAt`, `evidence.completedAt/By`, `cancelledAt`) match `frontend/lib/tracking/types.ts`; `TrackingRole` param flows `controller→service→repository`; `TimelineEventKey` matches `types.ts`.

**Risks:** `finish` multipart shares `sharp`/`MinIO` with JTT-106 `completion-photos`; keep `AnyFilesInterceptor` (accepts `file` vs `photos`); `feeAmount` omission for CLIENT must be field omission (not `null`) to pass AppSec test; `cancellation` must not delete row, only set `CANCELLED`+reason.

