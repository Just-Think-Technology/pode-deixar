# API — Pode Deixar

## Sumário

- [Auth Service](#auth-service) (`:3001`)
- [Users Service](#users-service) (`:3002`)
- [Service Orders Service](#service-orders-service) (`:3003`)
- [Enums](#enums)
- [Modelos (Prisma)](#modelos-prisma)
- [Tabela Resumo](#tabela-resumo)

---

## Auth Service

**Porta:** `3001` | **Proxy Caddy:** `/api/auth/*`

### Health

#### `GET /health`

Verificação de saúde do serviço. Sem autenticação.

| Resposta | Código | Descrição |
|----------|--------|-----------|
| `HealthCheckResult` | `200` | Serviço saudável |
| `HealthCheckResult` | `503` | Serviço não saudável |

---

#### `GET /health/ready`

Verificação de prontidão do serviço. Sem autenticação.

| Resposta | Código | Descrição |
|----------|--------|-----------|
| `HealthCheckResult` | `200` | Serviço pronto |
| `HealthCheckResult` | `503` | Serviço não pronto |

---

#### `GET /health/live`

Verificação de atividade do serviço. Sem autenticação.

**Resposta `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-28T10:00:00.000Z"
}
```

---

### Acesso

#### `POST /auth/login`

Autenticar usuário e retornar tokens JWT.

**Rate limited** (`ThrottlerGuard`).

**Request body (`LoginDto`):**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123!",
  "rememberMe": false
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | `string` | sim | Email do usuário |
| `password` | `string` | sim | Senha do usuário |
| `rememberMe` | `boolean` | não | Sessão estendida (default: `false`) |

**Resposta `200`:**
```json
{
  "message": "Login realizado com sucesso",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "complete_name": "John Doe",
    "email": "john.doe@example.com",
    "role": "CLIENT"
  }
}
```

| Erro | Código |
|------|--------|
| Email ou senha inválidos | `401` |
| Conta temporariamente bloqueada | `423` |
| Email não verificado | `403` |

---

#### `POST /auth/refresh-token`

Atualizar access token usando refresh token.

**Rate limited** (`ThrottlerGuard`).

**Request body (`RefreshTokenDto`):**
```json
{
  "refreshToken": "eyJ..."
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `refreshToken` | `string` | sim | Refresh token obtido no login |

**Resposta `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer"
}
```

| Erro | Código |
|------|--------|
| Refresh token inválido ou expirado | `401` |

---

#### `POST /auth/logout`

Invalidar tokens do usuário. Requer **Bearer token**.

**Rate limited** (`ThrottlerGuard`). **Protegido** (`JwtAuthGuard`).

**Headers:**
| Header | Obrigatório | Valor |
|--------|-------------|-------|
| `Authorization` | sim | `Bearer eyJ...` |

**Resposta `200`:**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

### Cadastro

#### `POST /auth/register`

Registrar um novo usuário.

**Rate limited** (`ThrottlerGuard`).

**Request body (`RegisterDto`):**
```json
{
  "complete_name": "John Doe",
  "email": "john.doe@example.com",
  "password": "Password123!",
  "confirm_password": "Password123!",
  "phone": "+5511999999999",
  "postal_code": "12345-678",
  "role": "CLIENT"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `complete_name` | `string` | sim | Nome completo (3-50 caracteres) |
| `email` | `string` | sim | Email |
| `password` | `string` | sim | Mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial |
| `confirm_password` | `string` | sim | Deve coincidir com `password` |
| `phone` | `string` | sim | Telefone |
| `postal_code` | `string` | sim | CEP |
| `role` | `enum` | sim | `CLIENT` ou `PROVIDER` |

**Resposta `201`:**
```json
{
  "message": "Cadastro realizado com sucesso. Verifique seu email para ativar sua conta.",
  "user": {
    "id": "uuid",
    "complete_name": "John Doe",
    "email": "john.doe@example.com",
    "role": "CLIENT",
    "phone": "+5511999999999",
    "postal_code": "12345-678",
    "email_verified": false,
    "created_at": "2026-06-28T10:00:00.000Z"
  },
  "email_verification_token": "uuid-apenas-em-dev"
}
```

| Erro | Código |
|------|--------|
| Email já cadastrado | `409` |
| Dados inválidos (validation) | `400` |
| Senha não coincide com confirmação | `400` |

> `email_verification_token` só é retornado em ambiente de desenvolvimento.

---

#### `POST /auth/verify-email`

Verificar email do usuário com token.

**Rate limited** (`ThrottlerGuard`).

**Request body (`VerifyEmailDto`):**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `token` | `string` | sim | Token recebido por email |

**Resposta `200`:** `{ "message": "Email verificado com sucesso" }`

| Erro | Código |
|------|--------|
| Token inválido ou expirado | `400` |

---

#### `POST /auth/resend-email-verification`

Reenviar link de verificação de email.

**Rate limited** (`ThrottlerGuard`).

**Request body (`ResendVerificationDto`):**
```json
{
  "email": "john.doe@example.com"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | `string` | sim | Email do usuário |

**Resposta `200`:**
```json
{
  "message": "Link de verificação reenviado com sucesso",
  "email_verification_token": "uuid-apenas-em-dev"
}
```

| Erro | Código |
|------|--------|
| Email não encontrado | `404` |
| Email já verificado | `400` |

---

### Senha

#### `POST /auth/forgot-password`

Solicitar redefinição de senha. Envia email com token. Sem autenticação.

**Request body (`ForgotPasswordDto`):**
```json
{
  "email": "john.doe@example.com"
}
```

**Resposta `200`:**
```json
{
  "message": "Se o email existir, você receberá um link de redefinição de senha",
  "reset_password_token": "uuid-apenas-em-dev"
}
```

---

#### `POST /auth/reset-password`

Redefinir senha usando token recebido por email. Sem autenticação.

**Request body (`ResetPasswordDto`):**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "NewPassword123!"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `token` | `string` | sim | Token de redefinição |
| `newPassword` | `string` | sim | Mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial |

**Resposta `200`:**
```json
{
  "message": "Senha redefinida com sucesso",
  "user": { "email": "john.doe@example.com", "role": "CLIENT" }
}
```

| Erro | Código |
|------|--------|
| Token inválido ou expirado | `400` |

---

#### `PUT /auth/change-password`

Alterar senha do usuário autenticado. Requer **Bearer token**.

**Protegido** (`JwtAuthGuard`).

**Request body (`ChangePasswordDto`):**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `currentPassword` | `string` | sim | Senha atual |
| `newPassword` | `string` | sim | Mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial |

**Resposta `200`:** `{ "message": "Senha alterada com sucesso" }`

| Erro | Código |
|------|--------|
| Senha atual incorreta | `400` |

> Invalida o access token atual e limpa o refresh token no banco.

---

## Users Service

**Porta:** `3002` | **Proxy Caddy:** `/api/profiles/*`, `/api/providers/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Idênticos ao [Auth Service Health](#health).

---

### Perfis

**Prefixo:** `profiles` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Bearer token**

#### `GET /profiles/me`

Obter perfil do usuário autenticado.

**Roles:** `CLIENT`, `PROVIDER`

**Resposta `200` (CLIENT):**
```json
{
  "id": "uuid",
  "user": {
    "id": "uuid",
    "complete_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+5511999999999",
    "postal_code": "12345-678",
    "role": "CLIENT"
  },
  "avatar_url": "https://...",
  "preferences": {},
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

**Resposta `200` (PROVIDER):**
```json
{
  "id": "uuid",
  "user": {
    "id": "uuid",
    "complete_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+5511999999999",
    "postal_code": "12345-678",
    "role": "PROVIDER"
  },
  "avatar_url": "https://...",
  "bio": "Profissional experiente",
  "hourly_rate": 85.50,
  "skills": ["Hidráulica", "Elétrica"],
  "portfolio": ["https://...", "https://..."],
  "rating": 4.8,
  "total_reviews": 23,
  "is_available": true,
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Perfil não encontrado | `404` |

---

#### `POST /profiles/client`

Criar perfil de cliente.

**Roles:** `CLIENT`

**Request body (`CreateClientProfileDto`):**
```json
{
  "avatarUrl": "https://...",
  "preferences": { "notifications": true }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `avatarUrl` | `string` | não | URL do avatar |
| `preferences` | `object` | não | Preferências em JSON |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "user": { "id": "uuid", "complete_name": "...", "email": "...", "phone": "...", "postal_code": "...", "role": "CLIENT" },
  "avatar_url": null,
  "preferences": { "notifications": true },
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Perfil já existe | `409` |

---

#### `PATCH /profiles/client`

Atualizar perfil de cliente.

**Roles:** `CLIENT`

**Request body (`UpdateClientProfileDto`):**
```json
{
  "avatarUrl": "https://nova-url",
  "preferences": { "notifications": false }
}
```

Ambos os campos opcionais.

**Resposta `200`:** Mesma estrutura do `POST /profiles/client`.

| Erro | Código |
|------|--------|
| Perfil não encontrado | `404` |

---

#### `POST /profiles/provider`

Criar perfil de prestador.

**Roles:** `PROVIDER`

**Request body (`CreateProviderProfileDto`):**
```json
{
  "avatarUrl": "https://...",
  "bio": "Profissional experiente",
  "hourlyRate": 85.50,
  "skills": ["Hidráulica", "Elétrica"],
  "portfolio": ["https://...", "https://..."],
  "isAvailable": true
}
```

Todos os campos opcionais.

**Resposta `201`:**
```json
{
  "id": "uuid",
  "user": { "id": "uuid", "complete_name": "...", "email": "...", "phone": "...", "postal_code": "...", "role": "PROVIDER" },
  "avatar_url": "https://...",
  "bio": "Profissional experiente",
  "hourly_rate": 85.50,
  "skills": ["Hidráulica", "Elétrica"],
  "portfolio": ["https://...", "https://..."],
  "rating": 0,
  "total_reviews": 0,
  "is_available": true,
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Perfil já existe | `409` |

---

#### `PATCH /profiles/provider`

Atualizar perfil de prestador.

**Roles:** `PROVIDER`

**Request body (`UpdateProviderProfileDto`):** Mesmos campos do `CreateProviderProfileDto`, todos opcionais.

**Resposta `200`:** Mesma estrutura do `POST /profiles/provider`.

| Erro | Código |
|------|--------|
| Perfil não encontrado | `404` |

---

#### `PATCH /profiles/avatar`

Atualizar URL do avatar (para ambos os tipos de perfil).

**Roles:** `CLIENT`, `PROVIDER`

**Request body (raw):**
```json
{
  "avatarUrl": "https://nova-url-do-avatar"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `avatarUrl` | `string` | sim |

**Resposta `200`:** Perfil atualizado (mesma estrutura de `GET /profiles/me`).

| Erro | Código |
|------|--------|
| Perfil não encontrado | `404` |

---

### Perfil Público do Prestador

**Prefixo:** `providers/:providerId/profile` | **Sem autenticação**

#### `GET /providers/:providerId/profile`

Visualizar perfil público de um prestador, incluindo seus serviços ativos.

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `providerId` | `string` (UUID) | ID do perfil do prestador |

**Resposta `200`:**
```json
{
  "id": "uuid",
  "user": {
    "id": "uuid", "complete_name": "John Doe", "email": "john.doe@example.com",
    "phone": "+5511999999999", "postal_code": "12345-678"
  },
  "avatar_url": "https://...",
  "bio": "Profissional experiente",
  "hourly_rate": 85.50,
  "skills": ["Hidráulica", "Elétrica"],
  "rating": 4.8,
  "total_reviews": 23,
  "is_available": true,
  "services": [
    { "id": "uuid", "title": "Instalação de chuveiro", "description": "...", "fixed_price": 150.00, "category": "ELETRICA" }
  ],
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Perfil não encontrado | `404` |

---

### Serviços do Prestador (Próprio)

**Prefixo:** `providers/me/services` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `POST /providers/me/services`

Cadastrar novo serviço.

**Request body (`CreateProviderServiceDto`):**
```json
{
  "title": "Instalação de chuveiro elétrico",
  "description": "Instalação completa com garantia de 90 dias",
  "fixedPrice": 150.00,
  "category": "ELETRICA"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | sim | Máx. 200 caracteres |
| `description` | `string` | sim | Máx. 2000 caracteres |
| `fixedPrice` | `number` | sim | 2 casas decimais, positivo |
| `category` | `string` | sim | Máx. 50 caracteres |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "provider_profile_id": "uuid",
  "title": "Instalação de chuveiro elétrico",
  "description": "Instalação completa com garantia de 90 dias",
  "fixed_price": 150.00,
  "category": "ELETRICA",
  "is_active": true,
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Perfil de prestador não encontrado | `404` |

---

#### `GET /providers/me/services`

Listar todos os serviços do prestador autenticado.

**Resposta `200`:** Array da mesma estrutura do `POST` acima.

| Erro | Código |
|------|--------|
| Perfil de prestador não encontrado | `404` |

---

### Serviços do Prestador (Detalhe/Dono)

**Prefixo:** `providers/me/services/:serviceId` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `PATCH /providers/me/services/:serviceId`

Atualizar serviço (apenas dono).

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `serviceId` | `string` (UUID) | ID do serviço |

**Request body (`UpdateProviderServiceDto`):** Mesmos campos do `CreateProviderServiceDto`, todos opcionais.

**Resposta `200`:** Serviço atualizado (mesma estrutura do `POST`).

| Erro | Código |
|------|--------|
| Serviço não encontrado | `404` |
| Serviço não pertence a este prestador | `400` |

---

#### `DELETE /providers/me/services/:serviceId`

Desativar serviço (soft delete — marca `is_active = false`).

**Resposta `200`:** Serviço desativado (mesma estrutura com `is_active: false`).

| Erro | Código |
|------|--------|
| Serviço não encontrado | `404` |
| Serviço não pertence a este prestador | `400` |

> O registro permanece no banco, apenas `is_active` é alterado para `false`.

---

### Busca de Prestadores

**Prefixo:** `providers/search` | **Sem autenticação**

#### `GET /providers/search`

Buscar prestadores por categoria ou texto.

**Query params:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `category` | `string` | não | Filtrar por categoria do serviço |
| `q` | `string` | não | Texto para busca no título/descrição |

**Resposta `200`:**
```json
[
  {
    "id": "uuid",
    "user": { "id": "uuid", "complete_name": "...", "email": "...", "phone": "...", "postal_code": "..." },
    "avatar_url": "https://...",
    "bio": "Profissional experiente",
    "skills": ["Hidráulica", "Elétrica"],
    "rating": 4.8,
    "total_reviews": 23,
    "is_available": true,
    "services": [
      { "id": "uuid", "title": "Instalação de chuveiro", "description": "...", "fixed_price": 150.00, "category": "ELETRICA" }
    ]
  }
]
```

---

### Serviços do Prestador (Público)

**Prefixo:** `providers/:providerId/services` | **Sem autenticação**

#### `GET /providers/:providerId/services`

Listar serviços ativos de um prestador específico.

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `providerId` | `string` (UUID) | ID do perfil do prestador |

**Resposta `200`:**
```json
[
  {
    "id": "uuid",
    "provider_profile_id": "uuid",
    "title": "Instalação de chuveiro elétrico",
    "description": "Instalação completa com garantia de 90 dias",
    "fixed_price": 150.00,
    "category": "ELETRICA",
    "is_active": true,
    "created_at": "2026-06-28T10:00:00.000Z",
    "updated_at": "2026-06-28T10:00:00.000Z"
  }
]
```

| Erro | Código |
|------|--------|
| Perfil de prestador não encontrado | `404` |

---

## Service Orders Service

**Porta:** `3003` | **Proxy Caddy:** `/api/services/*`, `/api/proposals/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Idênticos ao [Auth Service Health](#health).

---

### Pedidos de Serviço (Cliente)

**Prefixo:** `services/me` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `POST /services/me`

Criar novo pedido de serviço.

**Request body (`CreateServiceOrderDto`):**
```json
{
  "title": "Preciso de um encanador para consertar vazamento",
  "description": "O chuveiro está vazando e precisa de reparo urgente",
  "category": "HIDRAULICA",
  "budgetMin": 50.00,
  "budgetMax": 200.00
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | sim | Máx. 200 caracteres |
| `description` | `string` | sim | Máx. 2000 caracteres |
| `category` | `string` | sim | Máx. 50 caracteres |
| `budgetMin` | `number` | não | Orçamento mínimo (≥ 0) |
| `budgetMax` | `number` | não | Orçamento máximo (> 0) |

> O campo `address` é definido automaticamente a partir do CEP do usuário.

**Resposta `201`:**
```json
{
  "id": "uuid",
  "client_id": "uuid",
  "title": "Preciso de um encanador para consertar vazamento",
  "description": "O chuveiro está vazando e precisa de reparo urgente",
  "category": "HIDRAULICA",
  "budget_min": 50.00,
  "budget_max": 200.00,
  "address": {},
  "status": "OPEN",
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

---

#### `GET /services/me`

Listar todos os pedidos do cliente autenticado.

**Resposta `200`:** Array da mesma estrutura do `POST` acima.

---

### Pedidos de Serviço (Dono)

**Prefixo:** `services/me/:orderId` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `GET /services/me/:orderId`

Obter detalhe de um pedido (apenas dono).

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `orderId` | `string` (UUID) | ID do pedido |

**Resposta `200`:**
```json
{
  "id": "uuid",
  "client_id": "uuid",
  "title": "Preciso de um encanador para consertar vazamento",
  "description": "O chuveiro está vazando e precisa de reparo urgente",
  "category": "HIDRAULICA",
  "budget_min": 50.00,
  "budget_max": 200.00,
  "address": {},
  "status": "OPEN",
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z",
  "proposals": [
    {
      "id": "uuid",
      "provider_id": "uuid",
      "price": 150.00,
      "description": "Posso realizar o serviço esta semana",
      "estimated_duration": "2 horas",
      "status": "PENDING",
      "created_at": "2026-06-28T10:00:00.000Z"
    }
  ]
}
```

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |
| Pedido não pertence ao cliente | `400` |

---

#### `PATCH /services/me/:orderId`

Atualizar pedido (apenas dono, apenas se aberto).

**Request body (`UpdateServiceOrderDto`):** Mesmos campos do `CreateServiceOrderDto`, todos opcionais.

**Resposta `200`:** Pedido atualizado (mesma estrutura sem proposals).

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |
| Pedido não pertence ao cliente ou não está aberto | `400` |

---

#### `DELETE /services/me/:orderId`

Cancelar pedido (apenas dono). Altera status para `CANCELLED`.

**Resposta `200`:** Pedido cancelado (mesma estrutura com `status: "CANCELLED"`).

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |
| Pedido não pertence ao cliente | `400` |

---

### Pedidos de Serviço (Público)

**Prefixo:** `services` | **Sem autenticação**

#### `GET /services`

Listar pedidos abertos (para prestadores encontrarem oportunidades).

**Resposta `200`:** Array com pedidos de status `OPEN` (mesma estrutura sem proposals).

---

#### `GET /services/:orderId`

Obter detalhe de um pedido (público).

**Resposta `200`:** Mesma estrutura com proposals do `GET /services/me/:orderId`.

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |

---

### Propostas (Prestador)

**Prefixo:** `proposals` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `POST /proposals`

Criar proposta para um pedido de serviço.

**Request body (`CreateProposalDto`):**
```json
{
  "serviceOrderId": "uuid-do-pedido",
  "price": 150.00,
  "description": "Posso realizar o serviço ainda esta semana. Tenho 10 anos de experiência.",
  "estimatedDuration": "2 horas"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `serviceOrderId` | `string` (UUID) | sim | ID do pedido de serviço |
| `price` | `number` | sim | Preço proposto, 2 casas decimais, positivo |
| `description` | `string` | sim | Máx. 2000 caracteres |
| `estimatedDuration` | `string` | não | Duração estimada, máx. 100 caracteres |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "service_order_id": "uuid",
  "provider_id": "uuid",
  "price": 150.00,
  "description": "Posso realizar o serviço ainda esta semana. Tenho 10 anos de experiência.",
  "estimated_duration": "2 horas",
  "status": "PENDING",
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |
| Pedido não está aberto ou já possui proposta sua | `400` |

---

#### `GET /proposals/me`

Listar minhas propostas (prestador autenticado).

**Resposta `200`:** Array da mesma estrutura do `POST` acima.

---

### Propostas (Detalhe do Prestador)

**Prefixo:** `proposals/:proposalId` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `PATCH /proposals/:proposalId`

Atualizar proposta (apenas dono, apenas se pendente).

**Request body (`UpdateProposalDto`):** `price`, `description`, `estimatedDuration` — todos opcionais. `serviceOrderId` não pode ser alterado.

**Resposta `200`:** Proposta atualizada.

| Erro | Código |
|------|--------|
| Proposta não encontrada | `404` |
| Proposta não pertence ao prestador ou não está pendente | `400` |

---

#### `DELETE /proposals/:proposalId`

Retirar proposta (apenas dono, apenas se pendente). Altera status para `WITHDRAWN`.

**Resposta `200`:** Proposta com status `WITHDRAWN`.

| Erro | Código |
|------|--------|
| Proposta não encontrada | `404` |
| Proposta não pertence ao prestador ou não está pendente | `400` |

---

### Propostas (Aceitar/Rejeitar)

**Prefixo:** `proposals/:proposalId` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `POST /proposals/:proposalId/accept`

Aceitar proposta (apenas dono do pedido).

**Resposta `200`:** Proposta com status `ACCEPTED`. O pedido é alterado para `IN_PROGRESS`.

| Erro | Código |
|------|--------|
| Proposta não encontrada | `404` |
| Pedido não está aberto ou proposta não está pendente | `400` |

---

#### `POST /proposals/:proposalId/reject`

Rejeitar proposta (apenas dono do pedido).

**Resposta `200`:** Proposta com status `REJECTED`.

| Erro | Código |
|------|--------|
| Proposta não encontrada | `404` |
| Pedido não pertence ao cliente | `400` |

---

## Enums

### `Role`

| Valor | Descrição |
|-------|-----------|
| `CLIENT` | Cliente (contratante) |
| `PROVIDER` | Prestador de serviço |
| `ADMIN` | Administrador |

### `ServiceOrderStatus`

| Valor | Descrição |
|-------|-----------|
| `OPEN` | Aberto para propostas |
| `IN_PROGRESS` | Em andamento (proposta aceita) |
| `COMPLETED` | Concluído |
| `CANCELLED` | Cancelado pelo cliente |

### `ProposalStatus`

| Valor | Descrição |
|-------|-----------|
| `PENDING` | Pendente (aguardando resposta) |
| `ACCEPTED` | Aceita pelo cliente |
| `REJECTED` | Rejeitada pelo cliente |
| `WITHDRAWN` | Retirada pelo prestador |

---

## Modelos (Prisma)

### `User`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `complete_name` | String | Nome completo |
| `email` | String | Email (único) |
| `password` | String | Hash da senha |
| `role` | `Role` | CLIENT, PROVIDER ou ADMIN |
| `phone` | String | Telefone |
| `postal_code` | String | CEP |
| `email_verified` | Boolean | Email verificado? |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ClientProfile`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → User (unique) |
| `avatar_url` | String? | URL do avatar |
| `preferences` | JSON? | Preferências |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ProviderProfile`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → User (unique) |
| `avatar_url` | String? | URL do avatar |
| `bio` | String? | Biografia |
| `hourly_rate` | Decimal? | Tarifa por hora |
| `skills` | String[] | Lista de habilidades |
| `portfolio` | JSON? | URLs do portfólio |
| `rating` | Float | Avaliação média |
| `total_reviews` | Int | Total de avaliações |
| `is_available` | Boolean | Disponível? |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ProviderService`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `provider_profile_id` | UUID | FK → ProviderProfile |
| `title` | String | Título do serviço |
| `description` | Text | Descrição detalhada |
| `fixed_price` | Decimal | Preço fixo |
| `category` | String | Categoria |
| `is_active` | Boolean | Ativo? (soft delete) |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ServiceOrder`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK → User |
| `title` | String | Título |
| `description` | Text | Descrição |
| `category` | String | Categoria |
| `budget_min` | Decimal? | Orçamento mínimo |
| `budget_max` | Decimal? | Orçamento máximo |
| `address` | JSON? | Endereço |
| `status` | `ServiceOrderStatus` | Status atual |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `Proposal`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `service_order_id` | UUID | FK → ServiceOrder |
| `provider_id` | UUID | FK → User (prestador) |
| `price` | Decimal | Preço proposto |
| `description` | Text | Descrição da proposta |
| `estimated_duration` | String? | Duração estimada |
| `status` | `ProposalStatus` | Status atual |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `TokenBlacklist`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `jti` | String | JWT ID (primary key) |
| `expires_at` | DateTime | Data de expiração |

---

## Tabela Resumo

### Caddy Proxy

| Rota | Destino | Serviço |
|------|---------|---------|
| `/api/auth/*` | `:3001` | Auth |
| `/api/profiles/*` | `:3002` | Users |
| `/api/providers/*` | `:3002` | Users |
| `/api/services/*` | `:3003` | Service Orders |
| `/api/proposals/*` | `:3003` | Service Orders |
| `/*` (demais) | `:3000` | Frontend |

### Auth Service (12 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |
| `POST` | `/auth/login` | — | — | Login |
| `POST` | `/auth/refresh-token` | — | — | Refresh token |
| `POST` | `/auth/logout` | Bearer | — | Logout |
| `POST` | `/auth/register` | — | — | Registro |
| `POST` | `/auth/verify-email` | — | — | Verificar email |
| `POST` | `/auth/resend-email-verification` | — | — | Reenviar verificação |
| `POST` | `/auth/forgot-password` | — | — | Esqueci senha |
| `POST` | `/auth/reset-password` | — | — | Redefinir senha |
| `PUT` | `/auth/change-password` | Bearer | — | Alterar senha |

### Users Service (11 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |
| `GET` | `/profiles/me` | Bearer | CLIENT, PROVIDER | Meu perfil |
| `POST` | `/profiles/client` | Bearer | CLIENT | Criar perfil cliente |
| `PATCH` | `/profiles/client` | Bearer | CLIENT | Atualizar perfil cliente |
| `POST` | `/profiles/provider` | Bearer | PROVIDER | Criar perfil prestador |
| `PATCH` | `/profiles/provider` | Bearer | PROVIDER | Atualizar perfil prestador |
| `PATCH` | `/profiles/avatar` | Bearer | CLIENT, PROVIDER | Upload avatar |
| `GET` | `/providers/:providerId/profile` | — | — | Perfil público prestador |
| `GET` | `/providers/search` | — | — | Buscar prestadores |
| `POST` | `/providers/me/services` | Bearer | PROVIDER | Criar serviço |
| `GET` | `/providers/me/services` | Bearer | PROVIDER | Meus serviços |
| `PATCH` | `/providers/me/services/:serviceId` | Bearer | PROVIDER | Atualizar serviço |
| `DELETE` | `/providers/me/services/:serviceId` | Bearer | PROVIDER | Desativar serviço |
| `GET` | `/providers/:providerId/services` | — | — | Serviços públicos |

### Service Orders Service (15 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |
| `POST` | `/services/me` | Bearer | CLIENT | Criar pedido |
| `GET` | `/services/me` | Bearer | CLIENT | Meus pedidos |
| `GET` | `/services/me/:orderId` | Bearer | CLIENT | Detalhe do pedido (dono) |
| `PATCH` | `/services/me/:orderId` | Bearer | CLIENT | Atualizar pedido |
| `DELETE` | `/services/me/:orderId` | Bearer | CLIENT | Cancelar pedido |
| `GET` | `/services` | — | — | Pedidos abertos |
| `GET` | `/services/:orderId` | — | — | Detalhe do pedido (público) |
| `POST` | `/proposals` | Bearer | PROVIDER | Criar proposta |
| `GET` | `/proposals/me` | Bearer | PROVIDER | Minhas propostas |
| `PATCH` | `/proposals/:proposalId` | Bearer | PROVIDER | Atualizar proposta |
| `DELETE` | `/proposals/:proposalId` | Bearer | PROVIDER | Retirar proposta |
| `POST` | `/proposals/:proposalId/accept` | Bearer | CLIENT | Aceitar proposta |
| `POST` | `/proposals/:proposalId/reject` | Bearer | CLIENT | Rejeitar proposta |

### Totais

| Métrica | Quantidade |
|---------|-----------|
| **Endpoints** | **38** |
| **Serviços** | **3** |
| **Controllers** | **22** |
| **DTOs** | **19** |
| **Autenticação (Bearer)** | **20 endpoints** |
| **Públicos (sem auth)** | **18 endpoints** |
