# CRÍTICOS: Erros e Bugs Identificados no CI/CD e Testes

## Geral
Este documento lista todos os erros críticos, bugs e problemas de identidade encontrados durante a análise do pipeline CI/CD e das suites de testes do monorepo Pode Deixar. Focado em melhorias para feedback rápido, cobertura de testes e segurança.

---

## � CRITICAL - Priority 1

### 1. Frontend: `test:unit` não executado no job `quick`

**Arquivo:** `.github/workflows/ci-frontend.yml`

**Problema:** O job `quick` apenas roda `lint` e `typecheck`. O comando `pnpm run test:unit` (que executa `vitest run`) **não está incluído**. Isso significa que nenhum teste unitário é validado antes do merge em PRs.

**Impacto:** Defeitos em lógica de componente não são detectados automaticamente. A cobertura de testes unitários fica sob responsabilidade apenas do desenvolvedor local.

**Correção sugerida:** Adicionar `pnpm run test:unit` como terceiro passo no job `quick`.

**OBS:** Isso acontece apenas no frontend? Não no backend?

---

### 2. Frontend: Falhas no transformador Oxc/Vite para testes de componente

**Arquivo:** `frontend/vitest.config.ts`

**Problema:** O transformador padrão do Vite (usando OxC) falha em 47 arquivos de teste de componentes e páginas. Erros observados:

- `transformWithOxc` erro genérico em `card.spec.ts`, `input-otp.spec.ts`, `input.spec.ts`
- `PARSE_ERROR: Unterminated regular expression` (input-otp.spec.ts linha 11)
- `Expected '>' but found 'type'` (input.spec.ts - JSX com attribute spreading)

**Detalhe:** Os testes de utilitário (`lib/utils.spec.ts`, `lib/format.spec.ts`) funcionam perfeitamente porque não utilizam JSX.

**Impacto:** A suite de testes frontend não consegue rodar nem um único teste de componente/Page no CI. Apenas 2 tests de utilitário passam.

**Correção sugerida:** Configurar o Vitest para usar o transformer `acorn` em vez de `oxc`, ou adicionar `transformMode: { consolidate: false }`, ou excluir arquivos de componente da transformação OxC.

---

## � HIGH - Priority 2

### 3. Frontend: `test:unit` omitido do pipeline CI quick

**Arquivo:** `.github/workflows/ci-frontend.yml`

**Problema:** Mesmo que os testes fossem configurados corretamente, o job `quick` não os executa. O job `deep` roda `test:e2e` (Playwright) mas não os unitários.

**Current quick job:**
```yaml
steps:
  - run: pnpm run lint
  - run: pnpm run typecheck
```

**Ausente:** `pnpm run test:unit`

**Impacto:** Validação de testes unitários é totalmente ausente no pipeline de CI.

**Correção sugerida:** Adicionar `- run: pnpm run test:unit` entre os passos de lint e typecheck.

---

### 4. Backend: Testes Jest requerem PostgreSQL rodando

**Problema:** Todos os testes Jest do backend tentam conectar em `localhost:5432` (PostgreSQL). Erro observado:

```
PrismaClientInitializationError: Jest: Got error running globalTeardown - ...
Invalid `prisma.providerService.deleteMany()` invocation:
Can't reach database server at `localhost:5432`
```

**Impacto:** Desenvolvedores não conseguem rodar testes backend localmente sem `docker compose up postgres`. Os workflows CI resolvem isso ao subir um container PostgreSQL, mas o desenvolvimento local fica mais difícil.

**Correção sugerida:** Documentar o comando `docker compose -f docker-compose.dev.yml up postgres` ou garantir que PostgreSQL esteja sempre disponível nos ambientes de dev.

---

### 5. Frontend: job `deep` precisa de navegadores Playwright

**Arquivo:** `.github/workflows/ci-frontend.yml`

**Problema:** O job `deep` roda `pnpm run test:e2e` (Playwright) mas não inclui o passo `playwright install`. Em ambientes limpos, os testes falharão porque os binários dos navegadores não estão presentes.

**Current deep job:**
```yaml
steps:
  - run: pnpm run build
  - run: pnpm run test:e2e
```

**Ausente:** `playwright install` (ou `pnpm exec playwright install`)

**Impacto:** Pipeline falha ao rodar E2E em CI limpa.

**Correção sugerida:** Adicionar passo `run: playwright install` antes do `test:e2e`.

---

## � MEDIUM - Priority 3

### 6. Varreduras de segurança redundantes em ambos workflows

**Arquivos:** `.github/workflows/ci-backend.yml` e `.github/workflows/ci-frontend.yml`

**Problema:** Ambos os pipelines executam:
- `pnpm audit --prod --audit-level=high`
- `TruffleHog Secret Scanning`

Isso é redundante e adiciona 10-15 minutos extras em cada pipeline. A política de segurança já centraliza essas verificações no pacote `@pode-deixar/security`.

**Impacto:** Lentidão desnecessária no CI; falhas repetidas entre back e front.

**Sugestão:** Executar audit apenas nos serviços alterados (backend) ou consolidar em um único nível. Remover a duplicação ou tornar opcional.

---

### 7. `dependency-review` action depende do Dependabot

**Arquivos:** Ambos workflows CI

**Problema:** O job `dependency-review` usa `github.com/dependencies/action@main` com `fail-on-severity: critical`. Se o repositório não tiver Dependabot configurado, a action pode falhar ou retornar resultados vagos.

**Impacto:** Pipeline falha em todos os PRs se Dependabot não estiver configurado.

**Correção sugerida:** Adicionar tratamento de erro ou tornar o job opcional sem bloquear o pipeline se não houver dependabot PRs.

---

### 8. Prisma generate em todo build do backend

**Arquivo:** `.github/workflows/ci-backend.yml`

**Problema:** O job `build` sempre roda `pnpm exec prisma generate --schema=prisma/schema.prisma`, mesmo se o schema não mudou. Isso adiciona 30-60 segundos desnecessários em cada build.

**Impacto:** Pipeline mais lento do que o necessário.

**Sugestão:** Adicionar cache para pasta `.prisma` ou verificar se o schema mudou antes de gerar.

---

### 9. Frontend: `test:cov` não usado em nenhum job CI

**Arquivo:** `frontend/package.json` e `.github/workflows/ci-frontend.yml`

**Problema:** O script `test:cov` (`vitest run --coverage`) existe mas nunca é executado em nenhum job do CI. Apenas desenvolvedores locais podem gerar cobertura.

**Impacto:** Não há métricas de cobertura de código no pipeline de CI.

**Sugestão:** Incluir cobertura no job `deep` como passo opcional, ou criar um job separado de cobertura.

---

## � LOW - Priority 4

### 10. Import aliases `@/` podem não resolver em todos os testes

**Arquivos:** `frontend/tsconfig.json` e `frontend/vitest.config.ts`

**Problema:** O plugin `vite-tsconfig-paths` resolve aliases `@/*` do tsconfig, mas pode haver casos limite onde imports como `@/components/ui/button` não resolvem corretamente no ambiente de teste, contribuindo para as 47 falhas.

**Impacto:** Falhas de importação em testes, mesmo depois de resolver o transformer OxC.

**Verificação necessária:** Testar se imports `@/lib/utils` funcionam corretamente no vitest.

---

## 📊 Resumo Geral

| Prioridade | Quantidade | Principal Impacto |
|------------|------------|-------------------|
| CRITICAL | 2 | Testes unitários frontend não rodam nem em CI; 47 testes de componente bloqueados por transformer OxC |
| HIGH | 3 | Backend testes precisam PG; `test:unit` omitido do CI; E2E precisa de browsers |
| MEDIUM | 4 | Segurança redundante; `dependency-review` depende de Dependabot; Prisma generate desnecessário; Sem cobertura CI |
| LOW | 1 | Import aliases podem falhar em casos extremos |

## 🎯 Próximos Passos Imediatos

1. **Corrigir transformer OxC** em `vitest.config.ts` para permitir que testes de componente/Page rodem
2. **Adicionar `pnpm run test:unit`** no job `quick` do frontend CI
3. **Adicionar `playwright install`** no job `deep` do frontend CI
4. **Documentar requirement do PostgreSQL** para desenvolvedores locais
5. **Consolidar varreduras de segurança** para evitar redundância entre back e front

---

*Documento gerado em 01/09/2026 como parte da análise de melhorias no CI/CD do monorepo Pode Deixar.*