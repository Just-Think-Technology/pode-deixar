# JTT-106 — Prestador marca serviço como concluído (frontend mock-only)

> Branch: `juliofranciscobernardino/jtt-106-tela-prestador-marca-servico-como-concluido-prestador`
> Escopo: **somente frontend com mocks**. Nenhuma chamada real ao backend
> até ele estar adequado (ver §7).
>
> **Status: implementado.** Evidência: `pnpm lint` ok, `pnpm typecheck` ok,
> `pnpm test` 13 arquivos / 118 testes ok, `pnpm test:e2e` 25 testes ok,
> `pnpm build` ok (rota `ƒ /worker/orders/[id]/complete`).
>
> Decisões tomadas na implementação:
>
> - `lib/auth/image-validation.ts` (novo, sem `"use server"`): `hasAllowedMagicBytes`,
>   `MAX_IMAGE_BYTES` e `ALLOWED_IMAGE_MIME` extraídos de `lib/auth/image-actions.ts`
>   (regra do segundo uso; `"use server"` não pode exportar função síncrona —
>   quebrava o `pnpm build`).
> - "Ver serviço" na tela de sucesso é um `Button` que troca para o histórico
>   com os dados retornados pela action (link para a mesma URL não navega).
> - A conclusão registrada na sessão tem precedência sobre o status do servidor
>   no orquestrador: após o `revalidatePath` da action, o servidor já retorna
>   `COMPLETED`, mas o prestador vê primeiro a tela de sucesso (Estado 6).
> - E2E do fluxo usa o primeiro pedido ainda em andamento entre 5 candidatos,
>   então repetições locais não quebram o spec.

## 1. Objetivo

Permitir ao prestador finalizar um serviço `IN_PROGRESS` registrando 1–10 fotos
como evidência mais observações opcionais, com confirmação prévia,
estados de loading/sucesso/erro e histórico quando o serviço já está `COMPLETED`.
Tudo funcional com `NEXT_PUBLIC_USE_MOCK=true`.

## 2. Estado atual (o que já existe)

| Onde | Arquivo | Situação |
|---|---|---|
| Agenda (lista/calendário) | `app/(worker)/worker/agenda/page.tsx`, `components/pages/worker-agenda-page.tsx` | Leitura OK, sem ação de concluir |
| Detalhe do evento | `components/pages/worker-agenda/event-detail-dialog.tsx` + `photo-lightbox.tsx` | Só leitura das fotos; ponto de entrada do CTA |
| Solicitações | `app/(worker)/worker/requests/[id]/page.tsx`, `components/pages/worker-request-detail-page.tsx` | Só envia proposta (`canRespond=isOpenRequest()`) |
| API worker | `api/worker/agenda/index.ts`, `api/worker/requests/index.ts` | Só GET; sem complete/upload |
| Actions | `lib/worker/agenda/actions.ts` (`withTokenRefresh`) | Padrão a copiar |
| Upload existente | `components/shared/service-image-gallery.tsx` (5 MB, jpeg/png/webp/gif) | Referência — aponta p/ catálogo, não p/ ordem |
| Tipos | `lib/worker/agenda/types.ts` (`WorkerAgendaEvent`, `order_status: IN_PROGRESS \| COMPLETED`) | Sem `completed_at`, observações, cliente/valor |
| Mock | `mock/worker/agenda.ts` (`getMockAgendaEvents`) | Estender, não trocar |

O backend `POST /services/me/:orderId/complete` existe mas **não aceita
fotos/observações** e o upload de fotos de ordem é **CLIENT-only + OPEN-only**
— por isso o frontend será mock-only nesta task.

## 3. Padrão de projeto do frontend (DEVE SER RESPEITADO)

Fontes: `frontend/MPC.md`, `frontend/AGENTS.md`, `frontend/CLAUDE.md`.
Qualquer desvio disto precisa de justificativa aprovada antes de codar.

### 3.1 Arquitetura por tela (`MPC.md` — "seguir a todo custo")

> Cada tela é uma page; cada tela guarda seus próprios recursos para aquela tela específica.

| Pasta | Papel | Regra nesta task |
|---|---|---|
| `app/` | Páginas; cada page tem sua pasta + `page.tsx` | Nova rota `app/(worker)/worker/orders/[id]/complete/page.tsx` (fina: só compõe) |
| `components/` | Toda a UI das páginas; herdam **só os próprios** componentes | Tudo em `components/pages/worker-order-complete/` (+ orquestrador `worker-order-complete-page.tsx`); seguir o espelho `worker-agenda/` existente; **nada de importar UI de outra tela** |
| `api/` | Chamadas ao backend; toda chamada passa pelo handler da page, que valida e chama o backend em `api` | Novo `api/worker/orders/index.ts` (`ROUTES` const, `apiFetchAuth`, `ApiError`); actions validam e chamam |
| `lib/` | Utilitários do frontend | `lib/worker/orders/` — types, `completion-actions.ts` (`"use server"`, `withTokenRefresh` como em `lib/worker/agenda/actions.ts`), labels, validation |
| `mock/` | Dados estáticos p/ dev quando não há endpoint adequado | `mock/worker/completion.ts`, chaveado por `NEXT_PUBLIC_USE_MOCK` como no resto do app |

Client Components com `"use client"`; Server Actions com `"use server"`;
token JWT via `getAccessToken()` + refresh em 401 (nunca token hardcoded).

### 3.2 UI — shadcn + Tailwind, sem CSS puro (`MPC.md`)

- Somente componentes shadcn (`Dialog`, `AlertDialog`, `Button`, `Badge`, `Textarea`, `Card`) + classes Tailwind.
- Reusar primitivos existentes: `buttonVariants`, `Spinner`, `toast` (`sonner`), `cn` (`lib/utils`).
- **CSS puro/plain `<style>` está fora do projeto.**
- Tokens: Primary `#2F80ED` · Secondary `#27AE60` · Accent `#F2C94C` ·
  Background `#F5F6FA` · Texto `#333333`; tipografia **Poppins** (headings + body).
- Ícones: `lucide-react`.

### 3.3 Heurísticas de Nielsen (obrigatórias, `MPC.md`)

1. **Visibilidade do status** — badge de status + loading/sucesso/erro explícitos.
2. **Correspondência com o mundo real** — textos em PT-BR, termos da issue ("Finalizar serviço", "Concluir serviço").
3. **Controle e liberdade** — remover foto antes de confirmar; `[Cancelar]`.
4. **Consistência** — mesmos padrões de `worker-agenda` (dialog, lightbox, labels de data/endereço/Maps).
5. **Prevenção de erro** — botão desabilitado sem foto; limites 1–10 / 5 MB; confirmação prévia.
6. **Reconhecimento > memorização** — resumo do serviço sempre visível durante o registro.
7. **Flexibilidade** — câmera (`capture="environment"`) + galeria (`multiple`).
8. **Estética minimalista** — só o necessário por estado.
9. **Recuperação de erros** — mensagem clara + `[Tentar novamente]` preservando o preenchimento.
10. **Ajuda e documentação** — placeholder e hints (formatos, tamanho, 1–10 fotos).

### 3.4 Regras do Next.js (`frontend/AGENTS.md`)

- Projeto em Next 16: antes de codar, ler o guia correspondente em
  `node_modules/next/dist/docs/` (a API pode diferir do conhecimento prévio) e respeitar deprecations.
- Não remover o bloco `nextjs-agent-rules` do diff (ele é regenerado pelo `next dev`).

## 4. O que será criado (mock-only)

```text
frontend/
├── app/(worker)/worker/orders/[id]/complete/page.tsx   # NOVA rota (Estados 2–8)
├── components/pages/worker-order-complete-page.tsx      # Orquestra resumo + form + estados
├── components/pages/worker-order-complete/
│   ├── completion-summary.tsx        # Resumo: serviço/cliente/data/local/valor/status
│   ├── completion-photo-uploader.tsx # Câmera + galeria, preview, remover, contador n/10
│   ├── completion-confirm-dialog.tsx # AlertDialog "Confirmar conclusão?"
│   ├── completion-success.tsx        # "Serviço concluído!" + 2 CTAs
│   ├── completion-error.tsx          # "Não foi possível…" + [Tentar novamente]
│   └── completion-history.tsx        # Estado 8: data/hora, fotos, obs, responsável
├── lib/worker/orders/
│   ├── completion-types.ts           # CompletionPhoto/Summary/History/Input
│   ├── completion-actions.ts         # get/upload/complete (mock agora, real depois)
│   └── completion-validation.ts      # 1–10 fotos, 5 MB, tipos, obs max 2000
├── api/worker/orders/index.ts        # Clients prontos p/ o backend futuro (não chamados agora)
└── mock/worker/completion.ts         # mockComplete + cenários de erro / já-concluído
```

Arquivos alterados: `event-detail-dialog.tsx` (botão `[Finalizar serviço]`
se `IN_PROGRESS`; histórico se `COMPLETED`), `mock/worker/agenda.ts`
(1 evento `COMPLETED` com histórico), labels PT.

## 5. Regras de UI (critérios de aceite da issue)

1. CTA visível somente se `IN_PROGRESS`; `COMPLETED` mostra histórico, sem CTA.
2. Resumo do serviço antes do form (6 campos: serviço, cliente, data, local, valor, status).
3. Uploader: `accept="image/*" capture="environment" multiple`, 1–10 fotos, remover antes de confirmar.
4. Observações: `Textarea` opcional, placeholder da issue, contador de 2000.
5. Botão `Concluir serviço` **desabilitado enquanto nenhuma foto**.
6. Confirmação obrigatória (`AlertDialog`) antes do envio.
7. Loading + anti-duplo-submit; erro preserva o preenchimento.
8. Sucesso: tela "Serviço concluído!" + `[Ver serviço]` / `[Voltar para meus serviços]`.
9. Falha simulada: status não muda + `[Tentar novamente]`.
10. Todo texto visível em PT-BR; mobile-first (câmera do dispositivo).

## 6. Mock — cenários dos 8 estados da issue

`mock/worker/completion.ts`:

- `getMockCompletionOrder(orderId)` → resumo + fotos já existentes.
- `mockUploadPhoto(file)` → valida tipo/tamanho, retorna `{ id, url: objectURL }` com delay ~600 ms.
- `mockCompleteOrder(orderId, { observations, photos })` → exige ≥ 1 foto, delay ~1200 ms,
  muta `IN_PROGRESS → COMPLETED`, gera `completedAt: now()`, `completedBy: "Você"`.
- `mockCompleteFailure` (flag `?fail=1` ou taxa configurável) para o Estado 7.
- `getMockCompletionHistory(orderId)` para o Estado 8.

Com `NEXT_PUBLIC_USE_MOCK=true`, `completion-actions.ts` chama o mock;
o caminho real fica isolado para ser ligado depois sem refatorar a UI.

## 7. Backend necessário (repasse — NÃO implementar nesta task)

Colar no Linear da equipe de backend:

> 1. `POST /services/me/:orderId/complete` aceitar `{ observations?: string max 2000 }`
>    + fotos (multipart `photos[1..10]` ou `photoIds[]`), em transação única com
>    `completionNotes`, `completedAt = now()`, `completedBy`, `IN_PROGRESS → COMPLETED`;
>    403 se não for o dono, 400 se não estiver `IN_PROGRESS` / já `COMPLETED`.
> 2. Prisma `ServiceOrder`: `+ completionNotes Text?`, `completedAt DateTime?`,
>    `completedBy String?` (+ migration); opcional `OrderPhoto.kind/takenBy`;
>    expor `completed_at/notes/by/cliente/valor/photos` no detalhe e na agenda.
> 3. Liberar upload para o `PROVIDER` dono em `IN_PROGRESS`
>    (hoje é CLIENT-only + OPEN-only), mantendo 10 fotos / 5 MB / webp via sharp.
> 4. Criar `Notification { recipient: clientId, type: ORDER_COMPLETED, relatedId: orderId }`
>    via shared DB (sem HTTP sync, cf. `docs/architecture.md`).
> 5. `CompleteOrderDto` + Swagger + throttle estrito + testes 401/403/400.
> Refs: `service-orders.service.ts:362-396`, `photos.service.ts:24-125`,
> `schema.prisma:154-178`, `docs/decisions/order-photos.md`.

## 8. Validação

Dentro de `frontend/`: `pnpm lint` · `pnpm typecheck` · `pnpm test`
(Vitest: botão desabilitado, limites, idempotência, erro preserva) ·
`pnpm test:e2e` (Playwright: fluxo feliz, erro e já-concluído com mock).
"Done" = suites verdes + evidência curta no PR. Sem tocar o backend,
sem alterar testes para fazer passar.
