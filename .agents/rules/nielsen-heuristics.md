# Nielsen Heuristics — Development Rule

Every UI change (new screen, flow, component) must be checked against the 10 Nielsen heuristics before merge. This file is the authoritative checklist; `Tasks/Heurística 01..10.md` are the per-heuristic evidence.

## Checklist (PT-BR, same as Tasks)

1. **Visibilidade do status do sistema** — loading (`Skeleton`/`Loader2` + `aria-busy`), success (`toast.success`), error (`Alert` destructiva + `Tentar novamente`), empty (`Empty`), timeline com `Etapa X de Y` (`frontend/components/shared/tracking/*`)
2. **Correspondência com o mundo real** — termos PT-BR, `R$` `Intl.NumberFormat pt-BR`, datas `pt-BR`, sem jargão técnico (`OPEN` → `Aberta`)
3. **Controle e liberdade** — `Voltar` com `history.back()` fallback (`contract-tracking-view.tsx:45`), `Cancelar`/`Desfazer` com `AlertDialog`, `router.replace` não quebra `history`
4. **Consistência e padrões** — CTA único `Ver detalhes`, cor `primary` cliente / `secondary` prestador via `auth-router-data.ts:39`, `role.loginLabel` no botão
5. **Prevenção de erros** — `disabled={loading}` em todos inputs, `validate*` + `fieldErrors`, confirmação antes de ação destrutiva
6. **Reconhecimento em vez de memorização** — badge `title`, `ContractSummaryCard` sempre visível, `Empty` com ação
7. **Flexibilidade e eficiência** — poucos cliques, responsivo `max-w-xl`, atalhos quando existir
8. **Estética e design minimalista** — `Card bg-card/95`, sem clutter, hierarquia `h1`/`CardTitle`
9. **Auxílio no diagnóstico** — `api/client.ts:61` + `lib/auth/errors.ts:12` PT acionável (`verifique conexão, contate suporte`, `faça login com perfil correto`)
10. **Ajuda e documentação** — link `central de ajuda`/`fale com suporte` em `tracking` e `forgot-password`, tooltips onde necessário

## Evidence

- `Tasks/<Fluxo>.md:11` checklist 10/10 + `Tasks/Evidências Nielsen/<Fluxo>-<perfil>-<status>.png|.mp4` (PR #89 `feat/nielsen-heuristics`)
- `Tasks/Modelo - Registro de problema Nielsen.md:1` severidade 0-4 → `feat/heuristica-*`
- `Tasks/Teste de adequação com as heurísticas de Nielsen.md:1` índice

## When to apply

- New `frontend/app/*` route, `frontend/components/pages/*`, `frontend/lib/*` flow, or any user-facing copy
- PR checklist: `[ ] 10 heurísticas` + `[ ] estados loading/success/error/empty` + `[ ] 4 perfis` — blocked if missing
