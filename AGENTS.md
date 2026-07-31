# Agentes

Este arquivo contém instruções e contexto para agentes de IA (como opencode) trabalharem neste projeto.

Mantido sempre atualizado com decisões de produto, regras de desenvolvimento e arquitetura.

## Stack

- **Backend:** NestJS 11, TypeScript, Prisma 5.22, PostgreSQL
- **Frontend:** Next.js 16, React 19, shadcn/ui, Tailwind CSS 4
- **Infra:** Docker Compose, Caddy, pnpm 11 (workspaces)

## Estrutura do Monorepo

```
backend/
├── prisma/          # Schema e migrations compartilhados
├── shared/          # Pacotes compartilhados (logger, email)
└── services/
    ├── auth/            # :3001 — Autenticação
    ├── users/           # :3002 — Perfis e categorias
    └── service-orders/  # :3003 — Ordens de serviço e propostas
frontend/
├── app/             # Next.js App Router
├── api/             # Cliente HTTP
├── components/      # Componentes React
├── lib/auth/        # Server actions e sessão
└── mock/            # Dados mockados para dev
```

## Comandos principais

```bash
# Backend — dentro de backend/
pnpm dev              # Gera Prisma client + sobe os 3 serviços
pnpm build            # Build de shared + serviços
pnpm test             # Testes dos 3 serviços

# Frontend — dentro de frontend/
pnpm dev              # Dev server
pnpm build            # Build de produção
pnpm lint             # Lint + formatação
```

## Convenções

- **Idioma:** Código e comentários em português (regras de negócio e validações)
- **Validação:** class-validator + class-transformer com mensagens em português
- **Autenticação:** JWT (access 15min + refresh 7 dias) com rotação e blacklist
- **Roles:** CLIENT, PROVIDER, ADMIN
- **Soft delete:** Serviços usam `is_active`, ordens mudam status para CANCELLED
- **Commits:** Seguir conventional commits (feat, fix, chore, etc.)

## Regras de desenvolvimento

### Boas práticas

Sempre desenvolver utilizando:

- **DRY** — Don't Repeat Yourself
- **SOLID** — quando aplicável
- **Clean Code** — código limpo e legível
- **Clean Architecture** — quando fizer sentido para o projeto
- **Baixo acoplamento e alta coesão**
- **SRP** — Princípio da Responsabilidade Única
- **KISS** — Keep It Simple, Stupid
- **YAGNI** — You Aren't Gonna Need It: não implementar funcionalidades não solicitadas
- **Composição > Herança** — preferir composição sobre herança

### Fluxo de cada tarefa

1. Entender a tarefa — perguntar se houver ambiguidade
2. Criar uma branch específica com nome descritivo
3. Analisar a arquitetura existente antes de codificar
4. Implementar a solução seguindo as boas práticas
5. Atualizar testes, quando necessário
6. Validar que nada foi quebrado
7. Resumir as alterações realizadas
8. Solicitar revisão antes de prosseguir para a próxima tarefa

### Código limpo

- Nomes claros e descritivos
- Código autoexplicativo (evitar comentários desnecessários)
- Funções pequenas e coesas
- Evitar números mágicos
- Tratamento adequado de erros (nunca silenciar exceções)

### Alterações mínimas

- Modificar apenas o necessário para resolver a tarefa
- Evitar refatorações amplas ou mudanças não solicitadas
- Se identificar melhoria, apenas sugerir — não implementar sem aprovação

### Reutilização

- Antes de criar novos arquivos, classes ou serviços, verificar se já existe algo equivalente
- Reutilizar implementações existentes sempre que possível
- Evitar duplicação de responsabilidades

### Performance

- Evitar consultas desnecessárias
- Evitar processamento duplicado
- Evitar loops redundantes
- Evitar alocação excessiva de memória
- Não otimizar prematuramente, mas também não criar soluções ineficientes

### Segurança

- Nunca expor credenciais, hardcodar senhas/tokens/chaves ou logar informações sensíveis
- Nunca remover validações de segurança existentes
- Sempre usar variáveis de ambiente e mecanismos já existentes no projeto

### Dependências

- Não adicionar novas bibliotecas ou frameworks sem necessidade
- Se realmente necessário, justificar antes de utilizar
- Sempre verificar se o pacote já existe no `package.json` antes de instalar

### Git

- Cada tarefa em uma branch específica (nunca desenvolver em main/develop)
- Commits pequenos e coesos, cada um representando uma única responsabilidade
- Mensagens claras seguindo Conventional Commits:
  - `feat:` — nova funcionalidade
  - `fix:` — correção de bug
  - `refactor:` — refatoração
  - `chore:` — tarefas de manutenção
  - `test:` — testes
  - `docs:` — documentação

### Testes

- Criar ou atualizar testes relacionados à funcionalidade sempre que possível
- Garantir que alterações não quebrem funcionalidades existentes
- Não remover testes sem justificativa
- Rodar `pnpm lint` e `pnpm typecheck` após alterações

## O que NÃO fazer

1. **Nunca** acessar `.env.prod`, `.env.staging` ou qualquer arquivo de ambiente de produção
2. **Não** modificar segredos, credenciais, configurações de infraestrutura ou pipelines de CI/CD a menos que seja parte explícita da tarefa
3. **Não** adicionar funcionalidades extras não solicitadas
4. **Não** quebrar compatibilidade — mudanças em APIs públicas, contratos ou comportamento existente devem ser informadas previamente
5. **Não** remover código sem antes verificar se ainda é utilizado, avaliar impactos e justificar
6. **Não** assumir requisitos — quando houver ambiguidade, perguntar antes de implementar
7. **Não** ignorar erros — todo tratamento deve ser explícito e adequado

## Padrões de código

- **React:** Seguir padrão shadcn/ui (composição Radix + `cn()`)
- **Endpoints:** Criar DTO com class-validator + decorator Swagger
- **Secrets:** Não versionar — usar variáveis de ambiente

## Decisões de produto

### Ownership e acesso a dados

- **Ownership validation:** Endpoints protegidos que acessam recursos por ID devem sempre validar se o recurso pertence ao usuário autenticado
- **Status code para ownership:** Usar `403 Forbidden` (não `400 Bad Request`) quando o recurso não pertence ao usuário — mais semântico para autorização
- **Leitura de propostas (GET /services/:orderId):**
  - CLIENT dono do pedido → vê todas as propostas
  - PROVIDER com proposta no pedido → vê apenas sua própria proposta
  - Demais casos → 403 Forbidden
- **Endpoint público vs autenticado:** Dados sensíveis (propostas com valores) nunca devem ser expostos sem autenticação
