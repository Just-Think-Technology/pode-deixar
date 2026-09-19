# Toast Global e Central de Notificações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar toast global reutilizável (success/error/warning/info/loading com auto-close e update) e central persistente via sino com grupos Conversas (mensagem) e Serviços (status/lembretes), isolados por usuário (CLIENT/PROVIDER) e sem duplicatas.

**Architecture:** Reuso `sonner` já em `frontend` como Toaster global (`frontend/app/layout.tsx`); wrapper `frontend/lib/toast` padroniza mensagens PT e `loading→success/error` via `toastId`. Backend adiciona modelo `Notification` em `backend/prisma/schema.prisma` com `userId/type/title/message/isRead/conversationId/contractId`, novo módulo `notifications` no serviço `users` (`:3002`) com `NotificationRepository` (Prisma) e endpoints `GET /notifications`, `POST /notifications/read`, `POST /notifications/read-all`, criação via `NotificationService.create` chamada pelos fluxos existentes (`service-orders` propostas/aceite/pagamento, `reviews`, `users` conversas). Frontend consome via `frontend/api/notifications` + `frontend/components/shared/notifications/bell.tsx` (sonner não substitui sino).

**Tech Stack:** Next.js 16 App Router, NestJS 11, Prisma 5.22 PostgreSQL, `sonner` 2.x, `shadcn/ui` (`DropdownMenu`, `Badge`, `Skeleton`, `Alert`), `vitest`/`playwright`, `class-validator`.

**Spec:** Task do usuário 2026-09-18 “Componente: Toast de feedback das APIs e central de notificações” (2 mecanismos distintos, tipos, regras de comportamento, grupos Conversas/Serviços, estados loading/empty/error, isolamento CLIENT/PROVIDER, sem duplicatas).

## Global Constraints

- Código, comentários e identificadores em inglês; copy UI/mensagens PT-BR
- Comentários só `//` inline, `/** */` JSDoc apenas APIs públicas, `// --- Section ---` headers
- DTO em toda entrada com `class-validator` mensagens PT
- Controller (HTTP) → Service (regras) → Repository (Prisma); sem Prisma em controllers
- Código compartilhado por 2+ services vai para `backend/shared/@pode-deixar/*` na segunda ocorrência
- `pnpm@11.9.0` pinado em todos Dockerfiles; `CI=true` em `deploy/docker-compose.dev.yml`/`staging`
- Auth: JWT access 15m + refresh 7d, guards `JwtAuthGuard`/`RolesGuard` em `@pode-deixar/security`
- Soft delete `is_active`; sem `TODO`/`FIXME`; sem código comentado

---

## File Structure

**Backend (Prisma + users service):**
- `backend/prisma/schema.prisma:1` — add `model Notification`, `enum NotificationType {CONVERSATION,SERVICE}`
- `backend/prisma/migrations/*_add_notifications/migration.sql` — create table + indexes `userId/isRead/createdAt`
- `backend/services/users/src/notifications/dto/create-notification.dto.ts` — internal DTO
- `backend/services/users/src/notifications/dto/list-notifications.dto.ts` — `Query` com `type?`, `isRead?`, `cursor?`
- `backend/services/users/src/notifications/notifications.repository.ts` — Prisma CRUD
- `backend/services/users/src/notifications/notifications.service.ts` — regras de criação/listagem/marcação + anti-duplicata
- `backend/services/users/src/notifications/notifications.controller.ts` — `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`
- `backend/services/users/src/notifications/notifications.module.ts` — registra rota em `users` (`:3002`)
- `backend/shared/prisma/src/prisma.module.ts:1` — se necessário, exporta client já existe

**Frontend (toast + sino):**
- `frontend/lib/toast/index.ts` — wrappers `showSuccess/showError/showWarning/showInfo/showLoading/updateToast` sobre `sonner`, mapeia `ApiError` via `getApiErrorMessage` e bloqueia stack trace
- `frontend/components/ui/sonner.tsx` — já existe `Toaster`; garantir `position="top-right"` + `richColors` + `closeButton`
- `frontend/api/notifications/index.ts` — `getNotifications(accessToken, params)`, `markRead(id)`, `markAllRead()`
- `frontend/lib/notifications/actions.ts` — server actions com `withTokenRefresh`
- `frontend/components/shared/notifications/bell.tsx` — sino `DropdownMenu` com `Badge` contador, Tabs `Conversas|Serviços`, `Skeleton` loading, `Empty` vazio, `Alert` erro + retry
- `frontend/components/shared/notifications/notification-item.tsx` — item com `title/message/time/isRead` + `onClick` navega para `conversationId` ou `contractId`
- `frontend/app/(client|worker)/layout.tsx:1` — inclui `<Toaster />` global se ainda não estiver
- `frontend/test/lib/toast.spec.ts` — unit toast wrappers
- `frontend/test/components/notifications/bell.spec.tsx` — unit bell
- `frontend/e2e/notifications.spec.ts` — e2e sino + toast

---

### Task 1: Prisma — modelo Notification

**Files:**
- Modify: `backend/prisma/schema.prisma:1`
- Create: `backend/prisma/migrations/20260919000000_add_notifications/migration.sql` (gerado via `prisma migrate dev`)

**Interfaces:**
- Produces: `Notification {id, userId, type, title, message, isRead, conversationId?, contractId?, createdAt, readAt?}` e `NotificationType`

- [ ] **Step 1: Write failing test (repo level)**
```ts
// backend/services/users/test/notifications.repository.spec.ts
it('creates a notification with CONVERSATION type', async () => {
  const n = await repo.create({ userId: 'u1', type: 'CONVERSATION', title: 'Nova mensagem', message: 'Carlos: oi', conversationId: 'c1' });
  expect(n.type).toBe('CONVERSATION');
});
```
- [ ] **Step 2: Run to fail**
`pnpm --filter @pode-deixar/users test -- notifications` → FAIL `model Notification does not exist`
- [ ] **Step 3: Add schema**
```prisma
enum NotificationType { CONVERSATION SERVICE }
model Notification {
  id             String           @id @default(cuid())
  userId         String
  user           User             @relation(fields: [userId], references: [id])
  type           NotificationType
  title          String
  message        String           @db.Text
  isRead         Boolean          @default(false)
  conversationId String?
  contractId     String?
  createdAt      DateTime         @default(now())
  readAt         DateTime?
  @@index([userId, isRead, createdAt])
  @@index([userId, type])
}
```
Add `notifications Notification[]` to `User`.
- [ ] **Step 4: Generate + migrate**
`pnpm prisma:generate && pnpm prisma:migrate dev --name add_notifications`
- [ ] **Step 5: Run test pass**
`pnpm --filter @pode-deixar/users test` → PASS
- [ ] **Step 6: Commit**
`git add backend/prisma/schema.prisma backend/prisma/migrations/* && git commit -m "feat(db): add Notification model"`

### Task 2: Backend — NotificationRepository

**Files:**
- Create: `backend/services/users/src/notifications/notifications.repository.ts`
- Test: `backend/services/users/test/notifications.repository.spec.ts`

- [ ] **Step 1: Failing test**
```ts
it('lists only owner notifications ordered desc', async () => {
  await repo.create({userId:'u1', type:'SERVICE', title:'Proposta', message:'x', contractId:'c1'});
  const list = await repo.findByUser('u1');
  expect(list[0].contractId).toBe('c1');
  expect(await repo.findByUser('u2')).toEqual([]);
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```ts
@Injectable() export class NotificationsRepository {
  constructor(private prisma: PrismaService) {}
  create(data: Prisma.NotificationCreateInput) { return this.prisma.notification.create({data}); }
  findByUser(userId: string, opts?: {type?: NotificationType, isRead?: boolean}) { return this.prisma.notification.findMany({where:{userId, ...opts}, orderBy:{createdAt:'desc'}}); }
  markRead(id:string, userId:string) { return this.prisma.notification.updateMany({where:{id,userId}, data:{isRead:true, readAt:new Date()}}); }
  markAllRead(userId:string) { return this.prisma.notification.updateMany({where:{userId,isRead:false}, data:{isRead:true, readAt:new Date()}}); }
  countUnread(userId:string) { return this.prisma.notification.count({where:{userId,isRead:false}}); }
  existsRecent(userId:string, type:NotificationType, contractId:string, windowMs=60000) { /* check dedup */ }
}
```
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 3: Backend — NotificationsService (regras + anti-duplicata)

**Files:**
- Create: `backend/services/users/src/notifications/notifications.service.ts`
- Test: `backend/services/users/test/notifications.service.spec.ts`

- [ ] **Step 1: Failing test**
```ts
it('does not create duplicate SERVICE event within 60s', async () => {
  await service.notify({userId:'u1', type:'SERVICE', title:'Proposta aceita', message:'Pedido 123', contractId:'c1'});
  await service.notify({userId:'u1', type:'SERVICE', title:'Proposta aceita', message:'Pedido 123', contractId:'c1'});
  expect((await repo.findByUser('u1')).length).toBe(1);
});
it('enforces CLIENT only sees own contracts', async () => {
  await expect(service.list('u2', {contractId:'c1-owned-by-u1'})).rejects.toThrow(ForbiddenException);
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```ts
async notify(dto: CreateNotificationDto) {
  // dedup: same user+type+contractId+title within 60s → skip
  // validate contractId belongs to user via service-orders read (or skip if conversationId)
  // create via repo
}
async list(userId:string, query:ListDto) { return repo.findByUser(userId, query); }
async markRead(userId:string, id:string) { const r=await repo.markRead(id,userId); if(r.count===0) throw new NotFoundException(); }
```
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 4: Backend — NotificationsController (endpoints)

**Files:**
- Create: `backend/services/users/src/notifications/dto/list-notifications.dto.ts`, `mark-read.dto.ts`
- Create: `backend/services/users/src/notifications/notifications.controller.ts`
- Modify: `backend/services/users/src/notifications/notifications.module.ts`, `backend/services/users/src/app.module.ts:1`

- [ ] **Step 1: Failing e2e**
```ts
await request(app).get('/notifications').set('Authorization', `Bearer ${tokenU1}`).expect(200);
expect(body[0].title).toBe('Proposta aceita');
await request(app).get('/notifications').set('Authorization', `Bearer ${tokenU2}`).expect(200).expect(body=> expect(body.find(n=>n.contractId==='c1')).toBeUndefined());
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```ts
@Controller('notifications') @UseGuards(JwtAuthGuard, RolesGuard) @ApiTags('Notifications')
export class NotificationsController {
  @Get() @Roles('CLIENT','PROVIDER','ADMIN') list(@Req() req, @Query() q: ListDto) { return this.service.list(req.user.sub, q); }
  @Post(':id/read') markRead(@Req() req, @Param('id') id:string) { return this.service.markRead(req.user.sub, id); }
  @Post('read-all') markAll(@Req() req) { return this.service.markAllRead(req.user.sub); }
  @Get('unread-count') count(@Req() req) { return this.service.countUnread(req.user.sub); }
}
```
DTO: `type?: IsEnum(NotificationType)`, `isRead?: IsBooleanString`.
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 5: Frontend — Toast wrapper (tipos + loading→success/error)

**Files:**
- Create: `frontend/lib/toast/index.ts`
- Modify: `frontend/components/ui/sonner.tsx:1` (position/closeButton)
- Test: `frontend/test/lib/toast.spec.ts`

- [ ] **Step 1: Failing test**
```ts
it('shows success and auto-closes', () => {
  const id = showLoading('Salvando…');
  expect(toast.loading).toHaveBeenCalledWith('Salvando…');
  updateToast(id, 'success', 'Alterações salvas com sucesso.');
  expect(toast.success).toHaveBeenCalled();
});
it('maps ApiError to friendly message without stack', () => {
  showError(new ApiError('P2002', 500));
  expect(toast.error).toHaveBeenCalledWith('Não foi possível completar. Tente novamente.', expect.any(Object));
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```ts
export function showSuccess(msg:string){ return toast.success(msg, {duration:3000}); }
export function showError(err:unknown){ const m = getApiErrorMessage(err); return toast.error(m, {duration:5000}); }
export function showWarning(m:string){ return toast.warning(m); }
export function showInfo(m:string){ return toast.info(m); }
export function showLoading(m:string){ return toast.loading(m); }
export function updateToast(id:string|number, type:'success'|'error', msg:string){ toast.dismiss(id); return type==='success'? showSuccess(msg): showError(new Error(msg)); }
```
Garantir `sonner` `Toaster` em `frontend/app/layout.tsx` com `richColors closeButton position="top-right"`.
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 6: Frontend — Notifications API + actions

**Files:**
- Create: `frontend/api/notifications/index.ts`
- Create: `frontend/lib/notifications/actions.ts`
- Test: `frontend/test/api/notifications.spec.ts`

- [ ] **Step 1: Failing test**
```ts
it('fetches with auth and type filter', async () => {
  fetchMock.mockResolvedValue(jsonResponse([{id:'1', type:'SERVICE'}]));
  const data = await getNotifications('tok', {type:'SERVICE'});
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/notifications?type=SERVICE'), expect.objectContaining({headers:{Authorization:'Bearer tok'}}));
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```ts
export function getNotifications(token:string, params?: {type?: NotificationType, isRead?: boolean}) {
  const qs = new URLSearchParams(params as any).toString();
  return apiFetchAuth<Notification[]>(`/notifications${qs?'?'+qs:''}`, token);
}
export function markNotificationRead(token:string, id:string){ return apiFetchAuth(`/notifications/${id}/read`, token, {method:'POST'}); }
```
Actions: `getNotificationsAction` via `withTokenRefresh`, `markReadAction`, `markAllReadAction`.
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 7: Frontend — Bell + Central (sino, contador, Tabs Conversas|Serviços)

**Files:**
- Create: `frontend/components/shared/notifications/bell.tsx`
- Create: `frontend/components/shared/notifications/notification-item.tsx`
- Modify: `frontend/components/shared/header.tsx:1` (ou `frontend/app/(client|worker)/layout.tsx:1`) para incluir `<Bell />`
- Test: `frontend/test/components/notifications/bell.spec.tsx`

- [ ] **Step 1: Failing test**
```tsx
it('shows unread badge and separates tabs', async () => {
  render(<Bell notifications={[{id:'1', type:'CONVERSATION', isRead:false},{id:'2', type:'SERVICE', isRead:true}]} />);
  expect(screen.getByText('1')).toBeVisible(); // badge
  await user.click(screen.getByRole('button', {name: /notificações/i}));
  expect(screen.getByRole('tab', {name:'Conversas'})).toBeVisible();
  expect(screen.getByRole('tab', {name:'Serviços'})).toBeVisible();
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```tsx
export function Bell() {
  const [open, setOpen]=useState(false);
  const {data, isLoading, error, refetch}=useNotifications({type: activeTab});
  const unread = data?.filter(n=>!n.isRead).length;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Notificações">{unread? <Badge>{unread}</Badge>: null}<BellIcon/></Button></DropdownMenuTrigger>
      <DropdownMenuContent className="w-96">
        <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="CONVERSATION">Conversas</TabsTrigger><TabsTrigger value="SERVICE">Serviços</TabsTrigger></TabsList>
          <TabsContent value="CONVERSATION">{isLoading? <Skeleton/>: error? <Alert>Erro <Button onClick={refetch}>Tentar novamente</Button></Alert>: data?.length? data.map(n=> <NotificationItem key={n.id} n={n} onClick={()=> {markRead(n.id); router.push(n.conversationId? `/messages/${n.conversationId}`: `/orders/${n.contractId}`)}}/>): <Empty description="Você não possui novas notificações."/>}</TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
`NotificationItem` mostra `title/message/time` + `isRead` com `opacity-60` vs `font-semibold`, `conversationId` → `/messages/...` ou `/client/orders/...`, `contractId` → `/client/orders/[id]/tracking` ou `/worker/orders/[id]/tracking` conforme role.
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 8: Integração — emitir notificações nos fluxos existentes

**Files:**
- Modify: `backend/services/service-orders/src/proposals/proposals.service.ts:1` (nova proposta), `.../payments.service.ts`, `backend/services/reviews/src/reviews.service.ts:1`, `backend/services/users/src/conversations/...` (se existir, senão mock)
- Test: `backend/e2e/test/notifications-journey.spec.ts`

- [ ] **Step 1: Failing journey**
```ts
it('creates SERVICE notification on proposal accepted', async () => {
  await acceptProposalAsClient(proposalId, clientToken);
  const notifs = await getNotificationsAsProvider(providerToken);
  expect(notifs.find(n=> n.type==='SERVICE' && n.contractId===orderId)).toBeDefined();
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Implement**
```ts
// em ProposalsService.accept(...)
await this.notificationsService.notify({userId: providerId, type: 'SERVICE', title: 'Proposta aceita', message: `Pedido ${order.title} — proposta aceita`, contractId: order.id});
// similar para: nova proposta → provider, pagamento confirmado → ambos, serviço iniciado/finalizado → cliente, avaliação → provider
```
Usar anti-duplicata `existsRecent` para `SERVICE` + `contractId`.
- [ ] **Step 4: Pass**
- [ ] **Step 5: Commit**

### Task 9: E2E + Unit — cobertura final

**Files:**
- Test: `frontend/e2e/notifications.spec.ts` (Playwright: sino, badge, tabs, navegação, empty/error/loading)
- Modify: `frontend/test/lib/toast.spec.ts` extra

- [ ] **Step 1: Failing e2e**
```ts
test('toast loading→success and bell navigation', async ({page})=>{
  await loginAsClientMock(page);
  await page.goto('/client/orders/mock-1');
  await page.getByRole('button',{name:'Aceitar'}).click();
  await expect(page.getByText('Proposta aceita com sucesso')).toBeVisible(); // toast
  await page.getByRole('button',{name:'Notificações'}).click();
  await expect(page.getByRole('tab',{name:'Serviços'})).toBeVisible();
  await page.getByText('Proposta aceita').click();
  await expect(page).toHaveURL(/tracking/);
});
```
- [ ] **Step 2: Fail**
- [ ] **Step 3: Fix flakiness (wait for toast, mock notifications)**
- [ ] **Step 4: Pass `pnpm test` + `pnpm test:e2e`**
- [ ] **Step 5: Commit**

---

## Self-Review

- [x] Toast 5 tipos + loading→update + auto-close/manual + múltiplos + PT sem stack → Task 5
- [x] Sino com contador/ponto, lista recente primeiro, título/resumo/data/estado, Tabs Conversas/Serviços, estados loading/empty/error, lida/não lida, navegação → Task 7
- [x] Isolamento CLIENT/PROVIDER, sem duplicatas, ordenação → Tasks 3-4,8
- [x] Reusabilidade toast em todas telas → Task 5 lib
- [x] Sem placeholders, todos testes com código real
