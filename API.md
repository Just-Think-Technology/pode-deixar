# API — Pode Deixar

## Sumário

- [Auth Service](#auth-service) (`:3001`)
- [Users Service](#users-service) (`:3002`)
- [Service Orders Service](#service-orders-service) (`:3003`)
- [Payments Service](#payments-service) (`:3004`)
- [Reviews Service](#reviews-service) (`:3005`)
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

#### `GET /auth/verify`

Validar o access token e retornar os dados atuais do usuário. Usado pelo frontend para confirmar a sessão antes de carregar áreas autenticadas.

**Headers:**
| Header | Obrigatório | Valor |
|--------|-------------|-------|
| `Authorization` | não | `Bearer eyJ...` (sem token → `authorized: false`) |

**Resposta `200` (token válido):**
```json
{
  "authorized": true,
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "role": "CLIENT",
    "complete_name": "John Doe"
  },
  "access_token": "eyJ..."
}
```

**Resposta `200` (token ausente, inválido, expirado, revogado ou inconsistente):**
```json
{
  "authorized": false,
  "access_token": "eyJ...|null"
}
```

> Sempre retorna HTTP `200`. O frontend deve olhar o campo `authorized`, não o status HTTP.
>
> Valida assinatura JWT, tipo `access`, blacklist (`jti`), existência do usuário e consistência de `email`/`role` com o banco.

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

**Porta:** `3002` | **Proxy Caddy:** `/api/profiles/*`, `/api/providers/*`, `/api/categories/*`, `/api/storage/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Idênticos ao [Auth Service Health](#health).

---

### Categorias

**Prefixo:** `categories` | **GET público** | **POST/PATCH/DELETE:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `ADMIN`

#### `GET /categories`

Listar todas as categorias, ordenadas por `order`. Sem autenticação.

**Resposta `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Elétrica",
    "slug": "eletrica",
    "description": "Serviços de elétrica residencial e comercial",
    "icon": "zap",
    "order": 1
  }
]
```

---

#### `POST /categories`

Criar nova categoria. Requer **Bearer token** com role `ADMIN`.

**Request body (`CreateCategoryDto`):**
```json
{
  "name": "Elétrica",
  "slug": "eletrica",
  "description": "Serviços de elétrica residencial e comercial",
  "icon": "zap",
  "order": 1
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | `string` | sim | Nome (máx. 100 caracteres) |
| `slug` | `string` | sim | Slug único (máx. 100 caracteres) |
| `description` | `string` | não | Descrição (máx. 500 caracteres) |
| `icon` | `string` | não | Nome do ícone Lucide (máx. 50 caracteres) |
| `order` | `number` | não | Ordem de exibição (≥ 0) |

**Resposta `201`:** Categoria criada.

| Erro | Código |
|------|--------|
| Nome ou slug já existente | `409` |

---

#### `PATCH /categories/:id`

Atualizar categoria. Requer **Bearer token** com role `ADMIN`.

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | `string` (UUID) | ID da categoria |

**Request body (`UpdateCategoryDto`):** Mesmos campos do `CreateCategoryDto`, todos opcionais.

**Resposta `200`:** Categoria atualizada.

| Erro | Código |
|------|--------|
| Categoria não encontrada | `404` |
| Nome ou slug já existente | `409` |

---

#### `DELETE /categories/:id`

Excluir categoria. Requer **Bearer token** com role `ADMIN`.

**Resposta `200`:** `{ "message": "Categoria excluída com sucesso" }`

| Erro | Código |
|------|--------|
| Categoria não encontrada | `404` |
| Categoria possui serviços vinculados | `409` |

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

Fazer upload de avatar (para ambos os tipos de perfil). Multipart form-data, campo `file`.

**Roles:** `CLIENT`, `PROVIDER`

**Request (multipart/form-data):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | `binary` | sim | JPEG, PNG, WebP ou GIF, máx 2MB |

**Resposta `200`:** Perfil atualizado (mesma estrutura de `GET /profiles/me`), com `avatar_url` apontando para o MinIO.

| Erro | Código |
|------|--------|
| Arquivo não enviado | `400` |
| Formato inválido | `400` |
| Perfil não encontrado | `404` |

> O avatar antigo é automaticamente removido do MinIO ao enviar um novo.

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
    { "id": "uuid", "title": "Instalação de chuveiro", "description": "...", "fixed_price": 150.00, "category_id": "uuid", "category": { "id": "uuid", "name": "Elétrica", "slug": "eletrica" } }
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
  "categoryId": "uuid-da-categoria"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | sim | Máx. 200 caracteres |
| `description` | `string` | sim | Máx. 2000 caracteres |
| `fixedPrice` | `number` | sim | 2 casas decimais, positivo |
| `categoryId` | `string` (UUID) | sim | ID da categoria |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "provider_profile_id": "uuid",
  "title": "Instalação de chuveiro elétrico",
  "description": "Instalação completa com garantia de 90 dias",
  "fixed_price": 150.00,
  "category_id": "uuid",
  "category": { "id": "uuid", "name": "Elétrica", "slug": "eletrica" },
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

### Imagens do Serviço

**Prefixo:** `providers/me/services/:serviceId/images` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `POST /providers/me/services/:serviceId/images`

Fazer upload de imagem para um serviço. Multipart form-data, campo `file`.

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `serviceId` | `string` (UUID) | ID do serviço |

**Request (multipart/form-data):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `file` | `binary` | sim | JPEG, PNG, WebP ou GIF, máx 5MB |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "provider_service_id": "uuid",
  "url": "http://localhost:8080/api/storage/service-images/uuid-nome-do-arquivo",
  "created_at": "2026-07-09T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Arquivo não enviado | `400` |
| Formato inválido | `400` |
| Serviço não encontrado | `404` |

---

#### `GET /providers/me/services/:serviceId/images`

Listar imagens de um serviço.

**Resposta `200`:**
```json
[
  {
    "id": "uuid",
    "provider_service_id": "uuid",
    "url": "http://localhost:8080/api/storage/service-images/uuid-nome-do-arquivo",
    "created_at": "2026-07-09T10:00:00.000Z"
  }
]
```

| Erro | Código |
|------|--------|
| Serviço não encontrado | `404` |

---

#### `DELETE /providers/me/services/:serviceId/images/:imageId`

Remover imagem de um serviço.

**Parâmetros de URL:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `serviceId` | `string` (UUID) | ID do serviço |
| `imageId` | `string` (UUID) | ID da imagem |

**Resposta `200`:**
```json
{
  "id": "uuid",
  "provider_service_id": "uuid",
  "url": "http://localhost:8080/api/storage/service-images/uuid-nome-do-arquivo",
  "created_at": "2026-07-09T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Imagem ou serviço não encontrado | `404` |

> As imagens são armazenadas no MinIO e servidas via proxy Caddy (`/api/storage/*` → `minio:9000`), sem passar pelo backend NestJS.

---

### Busca de Prestadores

**Prefixo:** `providers/search` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `GET /providers/search`

Buscar prestadores por categoria ou texto.

**Query params:**
| Parâmetro | Tipo | Obrigatório | Descrição | Default |
|-----------|------|-------------|-----------|---------|
| `categoryId` | `string` (UUID) | não | Filtrar por ID da categoria | — |
| `q` | `string` | não | Texto para busca no título/descrição | — |
| `page` | `number` | não | Número da página | `1` |
| `limit` | `number` | não | Itens por página | `10` |

**Resposta `200`:**
```json
{
  "data": [
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
        { "id": "uuid", "title": "Instalação de chuveiro", "description": "...", "fixed_price": 150.00, "category_id": "uuid", "category": { "id": "uuid", "name": "Elétrica", "slug": "eletrica" } }
      ]
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

| Erro | Código |
|------|--------|
| Token inválido ou não autorizado | `401` |
| Role não autorizada (não é CLIENT) | `403` |

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
    "category_id": "uuid",
    "category": { "id": "uuid", "name": "Elétrica", "slug": "eletrica" },
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

Criar novo pedido de serviço. Se `providerId` for informado, o pedido é direcionado a um prestador específico (solicitação direta de orçamento).

**Request body (`CreateServiceOrderDto`):**
```json
{
  "title": "Preciso de um encanador para consertar vazamento",
  "description": "O chuveiro está vazando e precisa de reparo urgente",
  "categoryId": "uuid-da-categoria",
  "providerId": "uuid-do-prestador",
  "budgetMin": 50.00,
  "budgetMax": 200.00,
  "address": {
    "street": "Rua Augusta",
    "number": "500",
    "neighborhood": "Consolação",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01305-000"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `title` | `string` | sim | Máx. 200 caracteres |
| `description` | `string` | sim | Máx. 2000 caracteres |
| `categoryId` | `string` (UUID) | sim | ID da categoria |
| `providerId` | `string` (UUID) | não | ID do prestador (solicitação direta) |
| `budgetMin` | `number` | não | Orçamento mínimo (≥ 0) |
| `budgetMax` | `number` | não | Orçamento máximo (> 0) |
| `address` | `object` | não | Endereço onde o serviço será realizado (campos: `street`, `number`, `neighborhood`, `city`, `state`, `postalCode`) |

> O `address` é informado pelo cliente no pedido (todos os campos opcionais). Lat/lng **não** é obrigatório — o front monta o link do Google Maps com o endereço textual.

**Resposta `201`:**
```json
{
  "id": "uuid",
  "client_id": "uuid",
  "provider_id": "uuid",
  "title": "Preciso de um encanador para consertar vazamento",
  "description": "O chuveiro está vazando e precisa de reparo urgente",
  "category_id": "uuid",
  "category": { "id": "uuid", "name": "Hidráulica", "slug": "hidraulica" },
  "budget_min": 50.00,
  "budget_max": 200.00,
  "address": {
    "street": "Rua Augusta",
    "number": "500",
    "neighborhood": "Consolação",
    "city": "São Paulo",
    "state": "SP",
    "postal_code": "01305-000"
  },
  "status": "OPEN",
  "created_at": "2026-06-28T10:00:00.000Z",
  "updated_at": "2026-06-28T10:00:00.000Z"
}
```

> Nas respostas, o endereço é retornado formatado em **snake_case** (`postal_code`), com `null` para campos ausentes.

---

#### `GET /services/me`

Listar todos os pedidos do cliente autenticado.

**Resposta `200`:** Array da mesma estrutura do `POST` acima.

---

#### `POST /services/me/hire`

Contratar serviço com valor fixo diretamente (sem proposta). Cria pedido com status `IN_PROGRESS`.

**Request body (`HireProviderServiceDto`):**
```json
{
  "providerServiceId": "uuid-do-servico",
  "address": {
    "street": "Rua Augusta",
    "number": "500",
    "neighborhood": "Consolação",
    "city": "São Paulo",
    "state": "SP",
    "postalCode": "01305-000"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `providerServiceId` | `string` (UUID) | sim | ID do serviço do prestador |
| `address` | `object` | não | Endereço onde o serviço será realizado (mesma estrutura do `POST /services/me`) |

**Resposta `201`:** Mesma estrutura do `POST /services/me`, com acréscimos:

| Campo | Descrição |
|-------|-----------|
| `provider_service_id` | ID do serviço contratado |
| `agreed_price` | Valor fixo acordado (copiado do serviço) |
| `status` | `IN_PROGRESS` (já inicia em andamento) |

| Erro | Código |
|------|--------|
| Serviço do prestador não encontrado | `404` |
| Serviço não está disponível | `400` |
| Não é possível contratar próprio serviço | `400` |

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
  "provider_id": null,
  "title": "Preciso de um encanador para consertar vazamento",
  "description": "O chuveiro está vazando e precisa de reparo urgente",
  "category_id": "uuid",
  "category": { "id": "uuid", "name": "Hidráulica", "slug": "hidraulica" },
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

### Pedidos de Serviço (Prestador)

**Prefixo:** `services/requests/received` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `GET /services/requests/received`

Listar pedidos direcionados ao prestador logado (solicitações recebidas).

**Resposta `200`:** Array da mesma estrutura do `POST /services/me`.

| Erro | Código |
|------|--------|
| Token inválido | `401` |

---

### Concluir Pedido (Prestador)

**Rota:** `POST /services/me/:orderId/complete` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

Transiciona o pedido de `IN_PROGRESS` para `COMPLETED`. Pré-requisito para a avaliação do serviço. Apenas o **prestador designado ao pedido** (`provider_id`) pode concluir.

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |
| Pedido não pertence ao prestador | `403` |
| Pedido não está em andamento ou já está concluído | `400` |

---

### Agenda do Prestador (JTT-94)

**Prefixo:** `services/me/agenda` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `GET /services/me/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD`

Listar os **serviços pagos e agendados** do prestador autenticado no período — usado para posicionar os jobs no calendário da agenda.

**Critérios de inclusão (todos):**
- Prestador do pedido: `provider_id` = usuário autenticado **OU** proposta `ACCEPTED` desse prestador no pedido (pedidos de marketplace)
- Pagamento `PAID` (exclui `REFUNDED`, `FAILED`, `CANCELLED`)
- Status do pedido `IN_PROGRESS` (a realizar) ou `COMPLETED` (realizado)
- `scheduled_at` dentro do período `from`/`to`

**Query params:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `from` | `string` (YYYY-MM-DD) | sim | Data inicial do período |
| `to` | `string` (YYYY-MM-DD) | sim | Data final do período — janela **máxima de 92 dias** |

**Resposta `200`:**
```json
[
  {
    "id": "uuid-do-pedido",
    "order_id": "uuid-do-pedido",
    "title": "Trocar chuveiro elétrico",
    "description": "Meu chuveiro elétrico queimou e preciso trocar urgente.",
    "scheduled_at": "2026-08-20T14:00:00.000Z",
    "scheduled_end_at": "2026-08-20T17:00:00.000Z",
    "order_status": "IN_PROGRESS",
    "address": {
      "street": "Rua Augusta",
      "number": "500",
      "neighborhood": "Consolação",
      "city": "São Paulo",
      "state": "SP",
      "postal_code": "01305-000"
    },
    "photos": [
      { "id": "uuid-da-foto", "url": "https://minio/order-photos/uuid.webp" }
    ],
    "payment": {
      "status": "PAID",
      "amount": 150.00,
      "paid_at": "2026-08-18T10:00:00.000Z"
    }
  }
]
```

| Campo | Descrição |
|-------|-----------|
| `scheduled_at` / `scheduled_end_at` | Data/hora do serviço (agendamento definido pelo cliente no checkout) |
| `order_status` | `IN_PROGRESS` (futuro) ou `COMPLETED` (passado) — o front decide "realizado vs a realizar" |
| `address` | Endereço textual completo (link Google Maps montado no front; lat/lng não é enviado) |
| `photos` | URLs públicas MinIO das fotos do pedido |
| `payment` | Somente `status`/`amount`/`paid_at` — **nunca** expõe dados de cartão |

| Erro | Código |
|------|--------|
| `from`/`to` ausentes ou inválidos | `400` |
| Janela maior que 92 dias ou `from` > `to` | `400` |

---

### Pedidos de Serviço (Público)

**Prefixo:** `services` | **Sem autenticação**

#### `GET /services`

Listar pedidos abertos (para prestadores encontrarem oportunidades).

**Resposta `200`:** Array com pedidos de status `OPEN` (mesma estrutura sem proposals).

---

#### `GET /services/:orderId`

Obter detalhe de um pedido (autenticado — `CLIENT` ou `PROVIDER`).

**Regras de acesso:**
- **CLIENT** dono do pedido → vê tudo (propostas + fotos)
- **PROVIDER** com proposta no pedido (ou prestador alvo) → vê o pedido, apenas sua proposta e as fotos
- Demais casos → `403 Forbidden`

**Resposta `200`:** Mesma estrutura com proposals do `GET /services/me/:orderId`, acrescida de:
| Campo | Descrição |
|-------|-----------|
| `photos` | Array `[{ id, url }]` com as fotos do pedido (URLs públicas MinIO) |

| Erro | Código |
|------|--------|
| Pedido não encontrado | `404` |
| Sem acesso ao pedido | `403` |

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

**Resposta `200`:** Proposta com status `ACCEPTED`. O pedido é alterado para `IN_PROGRESS` e passa a apontar para o prestador vencedor:
- `provider_id` ← prestador da proposta aceita
- `agreed_price` ← valor da proposta

> Sem isso, pedidos de marketplace não aparecem na [agenda do prestador](#agenda-do-prestador-jtt-94).

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

### Contrapropostas

**Prefixo:** `counter-proposals` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`, `PROVIDER`

#### `POST /counter-proposals`

Criar contraproposta para uma proposta pendente. Pode ser enviada pelo cliente (dono do pedido) ou pelo prestador (dono da proposta).

**Request body (`CreateCounterProposalDto`):**
```json
{
  "proposalId": "uuid-da-proposta",
  "price": 180.00,
  "description": "Posso fazer por este valor com prazo maior",
  "estimatedDuration": "3 dias"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `proposalId` | `string` (UUID) | sim | ID da proposta original |
| `price` | `number` | sim | Valor contraproposto |
| `description` | `string` | sim | Máx. 2000 caracteres |
| `estimatedDuration` | `string` | não | Máx. 100 caracteres |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "proposal_id": "uuid",
  "sender_id": "uuid",
  "price": 180.00,
  "description": "Posso fazer por este valor com prazo maior",
  "estimated_duration": "3 dias",
  "status": "PENDING",
  "created_at": "2026-07-05T10:00:00.000Z",
  "updated_at": "2026-07-05T10:00:00.000Z"
}
```

| Erro | Código |
|------|--------|
| Proposta não encontrada | `404` |
| Proposta não está pendente | `400` |
| Sem permissão para contrapor | `400` |
| Já possui contraproposta pendente | `400` |

---

#### `GET /counter-proposals/me`

Listar minhas contrapropostas enviadas.

**Resposta `200`:** Array da mesma estrutura do `POST` acima, com campo adicional `proposal`.

---

#### `GET /counter-proposals/proposal/:proposalId`

Listar contrapropostas de uma proposta específica.

| Erro | Código |
|------|--------|
| Proposta não encontrada | `404` |

---

### Contrapropostas (Aceitar/Rejeitar)

**Prefixo:** `counter-proposals/:counterProposalId` | **Autenticação:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`, `PROVIDER`

#### `POST /counter-proposals/:counterProposalId/accept`

Aceitar contraproposta. Finaliza o acordo: proposta vira `ACCEPTED`, pedido vira `IN_PROGRESS` (com `provider_id` ← prestador e `agreed_price` ← valor da contraproposta), demais propostas/contrapropostas pendentes são rejeitadas.

**Resposta `200`:** Contraproposta com status `ACCEPTED`.

| Erro | Código |
|------|--------|
| Contraproposta não encontrada | `404` |
| Contraproposta não está pendente | `400` |
| Não pode aceitar a própria contraproposta | `400` |
| Pedido não está aberto | `400` |

---

#### `POST /counter-proposals/:counterProposalId/reject`

Rejeitar contraproposta. A proposta original permanece pendente.

**Resposta `200`:** Contraproposta com status `REJECTED`.

| Erro | Código |
|------|--------|
| Contraproposta não encontrada | `404` |
| Contraproposta não está pendente | `400` |
| Não pode rejeitar a própria contraproposta | `400` |

---

## Payments Service

**Porta:** `3004` | **Proxy Caddy:** `/api/payments/*`

> **Modo de operação — Gateway Mercado Pago (sandbox) vs Mock:**
>
> O serviço usa uma **arquitetura de gateways** (port/adapter): um contrato
> `PaymentGateway` central e adapters por provedor — hoje `mercadopago` e o
> `mock` (fallback). O gateway ativo é escolhido automaticamente pela presença
> de `PAYMENT_GATEWAY_ACCESS_TOKEN`; os webhooks chegam em
> `POST /payments/webhook/:gateway` e cada adapter valida sua própria assinatura.
> Sem o token, todos os endpoints operam com **valores mockados**.
>
> | Configuração | Comportamento |
> |---|---|
> | Sem `PAYMENT_GATEWAY_ACCESS_TOKEN` | **Mock** — nenhuma chamada externa |
> | `PAYMENT_GATEWAY_ACCESS_TOKEN=TEST-...` | **Gateway sandbox** para PIX; cartão de crédito continua **mock** |
> | `PAYMENT_GATEWAY_ACCESS_TOKEN=TEST-...` + `PAYMENT_GATEWAY_NOTIFICATION_URL` | Igual acima + Mercado Pago notifica o webhook real |
> | `PAYMENT_GATEWAY_WEBHOOK_SECRET` definido | Webhook MP **exige** assinatura HMAC válida (`x-signature` + `x-request-id`) |
>
> **Segurança obrigatória:** os endpoints de transação (`GET/POST /payments`,
> `charge`, `status`) exigem **autenticação JWT** (Bearer) com role `CLIENT` e
> somente acessam pedidos **do próprio cliente**. O webhook oficial do Mercado
> Pago **rejeita** requisições sem `PAYMENT_GATEWAY_WEBHOOK_SECRET` configurado
> (fail-closed). O webhook mock exige o header `x-webhook-key` igual a
> `MOCK_WEBHOOK_KEY`.
>
> Guia de configuração do sandbox: [`backend/services/payments/SANDBOX.md`](backend/services/payments/SANDBOX.md)
>
> **Variáveis de ambiente** (todas no `.env.staging` / `.env`):
> | Variável | Necessária para | Obrigatória |
> |----------|-----------------|-------------|
> | `PAYMENT_GATEWAY_ACCESS_TOKEN` | Gateway real (modo sandbox) | não (mock sem ela) |
> | `PAYMENT_GATEWAY_NOTIFICATION_URL` | Mercado Pago notificar o webhook | não |
> | `PAYMENT_GATEWAY_WEBHOOK_SECRET` | Validar assinatura do webhook MP | **sim** (sem ela o webhook MP é rejeitado) |
> | `PAYMENT_GATEWAY_PAYER_EMAIL` | Email do pagador nas cobranças sandbox | não (default `sandbox@pode-deixar.com`) |
> | `MOCK_WEBHOOK_KEY` | Webhook mock confirmar pagamento | não (sem ela o webhook mock é rejeitado) |
> | `PLATFORM_FEE_RATE` | Taxa retida pela plataforma (0.10 = 10%) | não (default `0.10`) |
>
> **CORS:** restrito em `ALLOWED_ORIGINS` (lista separada por vírgulas; default `http://localhost:3000`).
>
> **Tabela de modo por endpoint:**
> | Endpoint | Modo (sem token) | Modo (com token `TEST-`) |
> |----------|------------------|--------------------------|
> | `GET /health` | — | — |
> | `GET /health/ready` | — | — |
> | `GET /health/live` | — | — |
> | `GET /payments` | Mock | Mock |
> | `POST /payments` | Mock | Mock |
> | `POST /payments/:paymentId/charge` | Mock | **Gateway** (PIX) / Mock (CREDIT_CARD) |
> | `GET /payments/:paymentId/status` | Mock | Mock (lê o banco) |
> | `GET /payments/provider/me/finance/summary` | Mock | Mock (lê o banco) |
> | `GET /payments/provider/me/finance/items` | Mock | Mock (lê o banco) |
> | `GET /payments/provider/me/finance/chart` | Mock | Mock (lê o banco) |
> | `POST /payments/webhook` | **Mock** | **Mock** (apenas simulação manual) |
> | `POST /payments/webhook/:gateway` | Mock (gateway desconhecido → `404`) | **Real** (ex.: `/webhook/mercadopago` recebe eventos do MP) |

### Health

#### `GET /health`

Verificação de saúde do serviço (banco de dados). Sem autenticação. Sem mock.

#### `GET /health/ready`

Verificação de prontidão (banco de dados). Sem autenticação. Sem mock.

#### `GET /health/live`

Verificação de atividade. Sem autenticação. Sem mock.

Idênticos ao [Auth Service Health](#health).

---

### Transações de Pagamento

#### `GET /payments`

- **Modo:** `Mock` (sempre — lê apenas o banco local)
- **Requisitos:** autenticação JWT (Bearer) com role `CLIENT`
- **Retorno:** `200` com os pagamentos **do cliente autenticado**, ordenados por criação (mais recentes primeiro)

```json
[
  {
    "id": "uuid-do-pagamento",
    "serviceOrderId": "uuid-do-pedido",
    "amount": 150.00,
    "method": "PIX",
    "status": "PENDING",
    "externalRef": null,
    "paidAt": null,
    "createdAt": "2026-08-08T10:00:00.000Z",
    "updatedAt": "2026-08-08T10:00:00.000Z"
  }
]
```

---

#### `POST /payments`

- **Modo:** `Mock` e `Gateway` (mesmo comportamento — apenas registra no banco)
- **Requisita:** `CreatePaymentDto` no body
- **Requisitos:** autenticação JWT (Bearer) com role `CLIENT`; o pedido deve pertencer ao cliente autenticado
- **Retorno:** `201` com o pagamento criado em `PENDING`

Registra a transação de pagamento no banco. O **preço não é enviado pelo frontend**
— o valor é obtido pelo backend a partir do **preço acordado** (`agreedPrice`) ou da
**proposta aceita** do pedido. Nenhuma chamada externa é feita — a cobrança é gerada
depois, no `charge`.
Para operação real, deve ser chamado logo após o aceite da proposta (ver fluxo abaixo).

O **agendamento do serviço também é definido aqui** (cliente no checkout): o
`scheduledAt` (e opcionalmente `scheduledEndAt`) é gravado no pedido. O pagamento só
pode virar `PAID` se o pedido tiver `scheduled_at` (webhooks rejeitam com `400` caso
contrário — fail-closed).

**Request body (`CreatePaymentDto`):**
```json
{
  "serviceOrderId": "uuid-do-pedido",
  "method": "PIX",
  "scheduledAt": "2026-08-20T14:00:00.000Z",
  "scheduledEndAt": "2026-08-20T17:00:00.000Z"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `serviceOrderId` | `string` (UUID) | sim | ID do pedido de serviço (deve pertencer ao cliente) |
| `method` | `PaymentMethod` | sim | `PIX` ou `CREDIT_CARD` |
| `scheduledAt` | `string` (ISO 8601) | sim | Data/hora agendada do serviço — gravada no pedido |
| `scheduledEndAt` | `string` (ISO 8601) | não | Término previsto do serviço — deve ser posterior a `scheduledAt` |

| Status | Código | Retorno |
|--------|--------|---------|
| Sucesso | `201` | Payment criado (`status: "PENDING"`, valor vindo do backend) |
| Validação | `400` | `BadRequestException` — { message, errors[] } |
| Pedido não pertence ao cliente | `403` | `ForbiddenException` |
| Sem preço definido | `400` | `BadRequestException` (pedido sem proposta aceita) |

---

### Cobrança e Status

#### `POST /payments/:paymentId/charge`

> **Modo:**
> - **PIX + gateway configurado (`TEST-...`)**: **real** — cria cobrança no Mercado Pago (responde QR code real do sandbox).
> - **PIX sem gateway**: **mock** — gera `chg_mock_...`.
> - **CREDIT_CARD**: **mock** sempre (fluxo de card token ainda não implementado).

- **Requisita:** pagamento existente (`404` se não) com `status: PENDING` (`400` caso contrário) — a cobrança só pode ser gerada uma vez por transação pendente.
- **Requisitos:** autenticação JWT (Bearer) com role `CLIENT`; o pagamento deve pertencer ao cliente autenticado (`403` caso contrário). Rate limit: 10 req/min.
- **Variáveis necessárias:** `PAYMENT_GATEWAY_ACCESS_TOKEN` (modo real); `PAYMENT_GATEWAY_PAYER_EMAIL` (opcional).
- **Retorno:** `200` com `paymentId`, `chargeRef`, `status` e `cobranca` (campos variam por método/modo).

**Fluxo real (PIX, modo gateway):**
1. `POST /payments/:paymentId/charge` é chamado com gateway configurado
2. Mercado Pago retorna `external_ref` = `paymentId` local + `notification_url` configurada
3. Resposta contém `pixCopiaECola` (texto copia-e-cola) e `qrCodeBase64` (imagem)

**Resposta `200` (mock PIX ou gateway PIX):**
```json
{
  "paymentId": "uuid-do-pagamento",
  "chargeRef": "chg_mock_a1b2c3d4e5f6",
  "status": "PENDING",
  "cobranca": {
    "pixCopiaECola": "00020126580014br.gov.bcb.pix0136chg_mock_a1b2c3d4e5f6..."
  }
}
```

**Resposta `200` (gateway PIX real) — adiciona `qrCodeBase64` e `mercadoPagoId`:**
```json
{
  "paymentId": "uuid-do-pagamento",
  "chargeRef": "123456789",
  "status": "PENDING",
  "cobranca": {
    "pixCopiaECola": "00020126580014br.gov.bcb.pix0136...",
    "qrCodeBase64": "iVBORw0KGgo...",
    "mercadoPagoId": 123456789
  }
}
```

**Resposta `200` (CREDIT_CARD — mock):**
```json
{
  "paymentId": "uuid-do-pagamento",
  "chargeRef": "chg_mock_a1b2c3d4e5f6",
  "status": "PENDING",
  "cobranca": {
    "linkCheckout": "https://checkout.pode-deixar.com/chg_mock_a1b2c3d4e5f6"
  }
}
```

> **PCI-DSS:** dados de cartão (PAN/CVV) **nunca** são enviados ao backend.
> Quando o CREDIT_CARD real for implementado, será usado **tokenização do
> Mercado Pago** (card token no cliente via SDK/Bricks) ou **Checkout Pro
> hospedado** — o backend só recebe o token/ID da transação. Logs são
> sanitizados contra PAN/CVV.

| Status | Código | Retorno |
|--------|--------|---------|
| Sucesso | `200` | Cobrança gerada (ver campos acima) |
| Pagamento não encontrado | `404` | `NotFoundException` |
| Pagamento não pertence ao cliente | `403` | `ForbiddenException` |
| Pagamento não pendente | `400` | `BadRequestException` |

---

#### `GET /payments/:paymentId/status`

- **Modo:** `Mock` sempre (lê a situação do banco local, independente do gateway)
- **Requisita:** pagamento existente (`404` se não)
- **Requisitos:** autenticação JWT (Bearer) com role `CLIENT`; o pagamento deve pertencer a um pedido do cliente autenticado (`403` caso contrário)
- **Retorno:** `200` com o status atual do pagamento (podendo refletir atualização feita pelo webhook)

**Resposta `200`:**
```json
{
  "paymentId": "uuid-do-pagamento",
  "status": "PENDING",
  "method": "PIX",
  "amount": 150.00,
  "externalRef": "chg_mock_a1b2c3d4e5f6",
  "paidAt": null,
  "createdAt": "2026-08-08T10:00:00.000Z"
}
```

| Status | Código | Retorno |
|--------|--------|---------|
| Sucesso | `200` | status/method/amount/externalRef/paidAt |
| Pagamento não encontrado | `404` | `NotFoundException` |
| Pagamento não pertence ao cliente | `403` | `ForbiddenException` |

---

### Webhooks de Confirmação

São dois webhooks: o **mock** (para testes manuais do fluxo) e o **genérico de gateway** `POST /payments/webhook/:gateway`, que resolve o adapter pelo nome no path (ex.: `mercadopago`) — gateway desconhecido retorna `404`.

#### `POST /payments/webhook` (simulador mock)

- **Modo:** `Mock` — simula manualmente a confirmação de pagamento do gateway
- **Requisita:** `PaymentWebhookDto` (body), pagamento existente e header **`x-webhook-key`** igual a `MOCK_WEBHOOK_KEY` (sem chave válida → `403`)
- **Retorno:** `200` com o pagamento atualizado para `PAID` (idempotente — reenvio não altera um pagamento já `PAID`)

> O `amount` recebido **é comparado** com o valor registrado na transação — se diferente, o webhook é rejeitado (`400`).
>
> O pedido precisa ter `scheduled_at` (definido no `POST /payments`) — sem agendamento, a confirmação de `PAID` é rejeitada (`400`).

**Request body:**
```json
{
  "paymentId": "uuid-do-pagamento",
  "externalId": "tx_mock_1234567890",
  "amount": 150.00
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `paymentId` | `string` (UUID) | sim | ID do pagamento no sistema |
| `externalId` | `string` | sim | ID da transação no gateway (mock) |
| `amount` | `number` | sim | Valor confirmado (deve conferir com o registrado) |

**Header:** `x-webhook-key: <MOCK_WEBHOOK_KEY>`

| Status | Código | Retorno |
|--------|--------|---------|
| Sucesso | `200` | Payment atualizado (`status: "PAID"`, `paidAt` preenchido) |
| Pagamento não encontrado | `404` | `NotFoundException` |
| Chave de webhook inválida | `403` | `ForbiddenException` |
| Valor não confere | `400` | `BadRequestException` |

---

#### `POST /payments/webhook/:gateway` (oficial, ex.: `mercadopago`)

- **Modo:** **Real** — endpoint público chamado pelo gateway (Mercado Pago em sandbox ou produção) com os eventos de pagamento
- **Requisita:**
  - Em prod: `PAYMENT_GATEWAY_NOTIFICATION_URL` apontando para a URL pública deste endpoint (ex: `https://dominio/api/payments/webhook/mercadopago`; dev: tunnel ngrok)
  - Pagamento local cujo `externalRef` seja o ID retornado pelo charge (vínculo entre gateway e banco)
  - **`PAYMENT_GATEWAY_WEBHOOK_SECRET` obrigatório** — sem ele, o webhook é rejeitado (`403`); assinatura HMAC validada via headers `x-signature` (`ts`+`v1`) e `x-request-id` (fail-closed)
  - Valor do payload do gateway deve conferir com o `amount` registrado (`400` se divergir)
- **Retorno:** `200` com o pagamento sincronizado com o status do gateway
- **Necessita de:** nenhuma autenticação de usuário para o gateway (webhook externo)

**Request body — payload oficial do Mercado Pago (JSON puro, sem DTO):**
```json
{
  "type": "payment",
  "action": "payment.updated",
  "data": { "id": "123456789" }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | `string` | sim | Tipo do evento (`payment`) |
| `action` | `string` | sim | `payment.created` ou `payment.updated` |
| `data.id` | `string` | sim | ID do pagamento no Mercado Pago |

**Headers (com secret):** `x-signature` (`ts` e `v1`), `x-request-id`.

**Tradução de status do gateway:**
| Gateway | Pode Deixar |
|---------|-------------|
| `approved` | `PAID` |
| `pending`, `in_process` | `PENDING` |
| `rejected` | `FAILED` |
| `cancelled` | `CANCELLED` |
| `refunded` | `REFUNDED` |

| Status | Código | Retorno |
|--------|--------|---------|
| Sucesso | `200` | Pagamento local sincronizado (status + paidAt + externalRef) |
| Pagamento local não encontrado | `404` | `NotFoundException` |
| Assinatura inválida ou secret ausente | `403` | `ForbiddenException` |
| Valor do gateway não confere | `400` | `BadRequestException` |

---

### Fluxo completo recomendado (proposta aceita)

```
1. POST /payments                    → cria transação com status PENDING
2. POST /payments/:paymentId/charge  → cobrança (real PIX no sandbox OU mock)
3. Cliente paga (QR/copia-e-cola/checkout)
4. POST /payments/webhook/mercadopago → Mercado Pago notifica (real)
   OU POST /payments/webhook          → simula confirmação (mock)
5. GET  /payments/:paymentId/status   → status final (PAID)
```

---

### Financeiro do Prestador (JTT-95)

Endpoints de **leitura** para o prestador consultar o que tem a receber com base nas
propostas aceitas e no status do pagamento do cliente.

> **Fonte da verdade no backend:** bruto, taxa e líquido são **calculados no backend**
> no momento da criação do pagamento (`POST /payments`) e persistidos no `Payment`
> (`fee_rate`, `fee_amount`, `net_amount`), usando a taxa configurada em
> `PLATFORM_FEE_RATE` (default `0.10` = 10%). Pagamentos criados antes desse modelo
> (campos nulos) têm os valores calculados na leitura com a taxa atual. O frontend
> **nunca** deve calcular fee/líquido.
>
> **Acesso (ownership):** o prestador autenticado só enxerga pagamentos de pedidos
> em que ele é o provider de uma proposta **ACCEPTED**. Nunca expõe dados de cartão
> (PCI) — apenas totais e status.

#### `GET /payments/provider/me/finance/summary`

- **Modo:** `Mock` sempre (lê o banco local)
- **Requisitos:** autenticação JWT (Bearer) com role `PROVIDER`
- **Retorno:** `200` com o resumo financeiro do prestador autenticado

**Resposta `200`:**
```json
{
  "currency": "BRL",
  "feeRate": 0.1,
  "pendingNet": 135.00,
  "grossToReceive": 550.00,
  "feesOnToReceive": 55.00,
  "toReceiveNet": 495.00,
  "receivedThisMonthNet": 315.00,
  "feesThisMonth": 35.00
}
```

| Campo | Descrição |
|-------|-----------|
| `currency` | Moeda (fixa `BRL`) |
| `feeRate` | Taxa da plataforma vigente (fração, ex.: `0.1`) |
| `pendingNet` | Líquido a receber de pagamentos `PENDING` (cliente ainda não pagou) |
| `grossToReceive` | Bruto de pagamentos `PAID` (disponível para repasse) |
| `feesOnToReceive` | Taxa retida sobre os pagamentos `PAID` |
| `toReceiveNet` | Líquido de pagamentos `PAID` (bruto − taxa) |
| `receivedThisMonthNet` | Líquido de pagamentos `PAID` no mês atual |
| `feesThisMonth` | Taxa retida sobre pagamentos `PAID` no mês atual |

#### `GET /payments/provider/me/finance/items?status=PAID`

- **Modo:** `Mock` sempre (lê o banco local)
- **Requisitos:** autenticação JWT (Bearer) com role `PROVIDER`
- **Query opcional:** `status` = `PENDING` \| `PAID` \| `FAILED` \| `REFUNDED` \| `CANCELLED`
- **Retorno:** `200` com a lista de itens vinculados à proposta aceita do prestador (mais recentes primeiro)

**Resposta `200`:**
```json
[
  {
    "paymentId": "uuid-do-pagamento",
    "proposalId": "uuid-da-proposta",
    "serviceOrderId": "uuid-do-pedido",
    "paymentStatus": "PAID",
    "method": "PIX",
    "grossAmount": 350.00,
    "feeAmount": 35.00,
    "netAmount": 315.00,
    "feeRate": 0.1,
    "paidAt": "2026-08-10T12:00:00.000Z",
    "createdAt": "2026-08-08T10:00:00.000Z"
  }
]
```

| Campo | Descrição |
|-------|-----------|
| `paymentId` | ID do pagamento |
| `proposalId` | ID da proposta aceita do prestador no pedido |
| `serviceOrderId` | ID do pedido |
| `paymentStatus` | Status do pagamento do cliente |
| `method` | `PIX` ou `CREDIT_CARD` |
| `grossAmount` | Valor bruto pago pelo cliente |
| `feeAmount` | Taxa retida pela plataforma |
| `netAmount` | Líquido a repassar ao prestador (bruto − taxa) |
| `feeRate` | Taxa aplicada (fração) |
| `paidAt` | Data da confirmação do pagamento (null se não pago) |
| `createdAt` | Data de criação do pagamento |

#### `GET /payments/provider/me/finance/chart?months=6`

- **Modo:** `Mock` sempre (lê o banco local)
- **Requisitos:** autenticação JWT (Bearer) com role `PROVIDER`
- **Query opcional:** `months` (1–24, default `6`) — quantidade de meses incluindo o atual
- **Retorno:** `200` com dados mensais de pagamentos `PAID` (meses sem movimento aparecem com zeros), do mais antigo ao mais recente

**Resposta `200`:**
```json
[
  { "month": "2026-03", "netReceived": 0.00, "feesRetained": 0.00 },
  { "month": "2026-04", "netReceived": 315.00, "feesRetained": 35.00 },
  { "month": "2026-05", "netReceived": 180.00, "feesRetained": 20.00 }
]
```

| Campo | Descrição |
|-------|-----------|
| `month` | Mês no formato `YYYY-MM` |
| `netReceived` | Líquido recebido no mês (pagamentos `PAID`) |
| `feesRetained` | Taxa retida pela plataforma no mês |

---

## Reviews Service

**Porta:** `3005` | **Proxy Caddy:** `/api/reviews/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Idênticos ao [Auth Service Health](#health).

> Microsserviço de avaliações (clientes ↔ prestadores) em construção — estrutura base
> disponível. Os endpoints de avaliação serão adicionados nas próximas etapas.

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

### `PaymentStatus`

| Valor | Descrição |
|-------|-----------|
| `PENDING` | Transação registrada, aguardando confirmação |
| `PAID` | Pagamento confirmado (webhook) |
| `FAILED` | Falhou |
| `REFUNDED` | Reembolsado |
| `CANCELLED` | Cancelado |

### `PaymentMethod`

| Valor | Descrição |
|-------|-----------|
| `PIX` | PIX |
| `CREDIT_CARD` | Cartão de crédito |

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

### `Category`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `name` | String | Nome (único) |
| `slug` | String | Slug (único) |
| `description` | String? | Descrição |
| `icon` | String? | Ícone Lucide |
| `order` | Int | Ordem de exibição |
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
| `category_id` | UUID | FK → Category |
| `category` | Category | Objeto da categoria (via include) |
| `images` | `ServiceImage[]` | Imagens do serviço (via include) |
| `is_active` | Boolean | Ativo? (soft delete) |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ServiceImage`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `provider_service_id` | UUID | FK → ProviderService (cascade on delete) |
| `url` | String | URL pública da imagem no MinIO |
| `created_at` | DateTime | |

### `ServiceOrder`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK → User |
| `provider_id` | UUID? | FK → User (prestador alvo, solicitação direta) |
| `provider_service_id` | UUID? | FK → ProviderService (contratação direta) |
| `agreed_price` | Decimal? | Valor fixo acordado (contratação direta) |
| `title` | String | Título |
| `description` | Text | Descrição |
| `category_id` | UUID | FK → Category |
| `category` | Category | Objeto da categoria (via include) |
| `budget_min` | Decimal? | Orçamento mínimo |
| `budget_max` | Decimal? | Orçamento máximo |
| `address` | JSON? | Endereço (street, number, neighborhood, city, state, postalCode) |
| `scheduled_at` | DateTime? | Data/hora agendada do serviço (definida no checkout; obrigatória quando o pagamento vira PAID) |
| `scheduled_end_at` | DateTime? | Término previsto do serviço |
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

### `Payment`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `service_order_id` | UUID | FK → ServiceOrder (cascade on delete) |
| `amount` | Decimal | Valor bruto da transação |
| `currency` | String | Moeda (default: BRL) |
| `method` | `PaymentMethod` | PIX ou CREDIT_CARD (default: PIX) |
| `status` | `PaymentStatus` | Status atual (default: PENDING) |
| `fee_rate` | Decimal? | Taxa da plataforma aplicada no momento da criação (ex.: `0.1`); null para pagamentos legados |
| `fee_amount` | Decimal? | Taxa retida pela plataforma (bruto × taxa); null para pagamentos legados |
| `net_amount` | Decimal? | Líquido a repassar ao prestador (bruto − taxa); null para pagamentos legados |
| `external_ref` | String? | ID da transação no gateway |
| `idempotency_key` | String? | Chave de idempotência (unique com service_order_id) |
| `paid_at` | DateTime? | Data da confirmação do pagamento |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

---

## Tabela Resumo

### Caddy Proxy

| Rota | Destino | Serviço |
|------|---------|---------|
| `/api/auth/*` | `:3001` | Auth |
| `/api/profiles/*` | `:3002` | Users |
| `/api/providers/*` | `:3002` | Users |
| `/api/categories/*` | `:3002` | Users |
| `/api/services/*` | `:3003` | Service Orders |
| `/api/proposals/*` | `:3003` | Service Orders |
| `/api/payments/*` | `:3004` | Payments |
| `/api/reviews/*` | `:3005` | Reviews |
| `/api/storage/*` | `:9000` | MinIO (via proxy reverso) |
| `/*` (demais) | `:3000` | Frontend |

### Auth Service (13 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |
| `POST` | `/auth/login` | — | — | Login |
| `POST` | `/auth/refresh-token` | — | — | Refresh token |
| `GET` | `/auth/verify` | Bearer (opcional) | — | Validar sessão / access token |
| `POST` | `/auth/logout` | Bearer | — | Logout |
| `POST` | `/auth/register` | — | — | Registro |
| `POST` | `/auth/verify-email` | — | — | Verificar email |
| `POST` | `/auth/resend-email-verification` | — | — | Reenviar verificação |
| `POST` | `/auth/forgot-password` | — | — | Esqueci senha |
| `POST` | `/auth/reset-password` | — | — | Redefinir senha |
| `PUT` | `/auth/change-password` | Bearer | — | Alterar senha |

### Users Service (23 endpoints)

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
| `GET` | `/providers/search` | Bearer | CLIENT | Buscar prestadores |
| `POST` | `/providers/me/services` | Bearer | PROVIDER | Criar serviço |
| `GET` | `/providers/me/services` | Bearer | PROVIDER | Meus serviços |
| `PATCH` | `/providers/me/services/:serviceId` | Bearer | PROVIDER | Atualizar serviço |
| `DELETE` | `/providers/me/services/:serviceId` | Bearer | PROVIDER | Desativar serviço |
| `POST` | `/providers/me/services/:serviceId/images` | Bearer | PROVIDER | Upload imagem |
| `GET` | `/providers/me/services/:serviceId/images` | Bearer | PROVIDER | Listar imagens |
| `DELETE` | `/providers/me/services/:serviceId/images/:imageId` | Bearer | PROVIDER | Remover imagem |
| `GET` | `/providers/:providerId/services` | — | — | Serviços públicos |
| `GET` | `/categories` | — | — | Listar categorias |
| `POST` | `/categories` | Bearer | ADMIN | Criar categoria |
| `PATCH` | `/categories/:id` | Bearer | ADMIN | Atualizar categoria |
| `DELETE` | `/categories/:id` | Bearer | ADMIN | Excluir categoria |

### Service Orders Service (25 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |
| `POST` | `/services/me` | Bearer | CLIENT | Criar pedido |
| `POST` | `/services/me/hire` | Bearer | CLIENT | Contratar serviço fixo |
| `GET` | `/services/me` | Bearer | CLIENT | Meus pedidos |
| `GET` | `/services/me/agenda` | Bearer | PROVIDER | Agenda do prestador (serviços pagos, `from`/`to`) |
| `GET` | `/services/me/:orderId` | Bearer | CLIENT | Detalhe do pedido (dono) |
| `PATCH` | `/services/me/:orderId` | Bearer | CLIENT | Atualizar pedido |
| `DELETE` | `/services/me/:orderId` | Bearer | CLIENT | Cancelar pedido |
| `POST` | `/services/me/:orderId/complete` | Bearer | PROVIDER | Concluir pedido (IN_PROGRESS → COMPLETED) |
| `GET` | `/services` | — | — | Pedidos abertos |
| `GET` | `/services/:orderId` | Bearer | CLIENT, PROVIDER | Detalhe do pedido (autenticado, com fotos) |
| `GET` | `/services/requests/received` | Bearer | PROVIDER | Solicitações recebidas |
| `POST` | `/proposals` | Bearer | PROVIDER | Criar proposta |
| `GET` | `/proposals/me` | Bearer | PROVIDER | Minhas propostas |
| `PATCH` | `/proposals/:proposalId` | Bearer | PROVIDER | Atualizar proposta |
| `DELETE` | `/proposals/:proposalId` | Bearer | PROVIDER | Retirar proposta |
| `POST` | `/proposals/:proposalId/accept` | Bearer | CLIENT | Aceitar proposta |
| `POST` | `/proposals/:proposalId/reject` | Bearer | CLIENT | Rejeitar proposta |
| `POST` | `/counter-proposals` | Bearer | CLIENT, PROVIDER | Criar contraproposta |
| `GET` | `/counter-proposals/me` | Bearer | CLIENT, PROVIDER | Minhas contrapropostas |
| `GET` | `/counter-proposals/proposal/:proposalId` | Bearer | CLIENT, PROVIDER | Contrapropostas da proposta |
| `POST` | `/counter-proposals/:counterProposalId/accept` | Bearer | CLIENT, PROVIDER | Aceitar contraproposta |
| `POST` | `/counter-proposals/:counterProposalId/reject` | Bearer | CLIENT, PROVIDER | Rejeitar contraproposta |

### Payments Service (12 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|--------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |
| `GET` | `/payments` | JWT + Roles | CLIENT | Listar pagamentos do cliente |
| `POST` | `/payments` | JWT + Roles | CLIENT | Registrar transação (PENDING) |
| `POST` | `/payments/:paymentId/charge` | JWT + Roles | CLIENT | Gerar cobrança (MP PIX se configurado, senão mock) |
| `GET` | `/payments/:paymentId/status` | JWT + Roles | CLIENT | Consultar status do pagamento |
| `GET` | `/payments/provider/me/finance/summary` | JWT + Roles | PROVIDER | Resumo financeiro do prestador |
| `GET` | `/payments/provider/me/finance/items` | JWT + Roles | PROVIDER | Itens financeiros do prestador (filtro `status`) |
| `GET` | `/payments/provider/me/finance/chart` | JWT + Roles | PROVIDER | Dados mensais para gráfico (`months`) |
| `POST` | `/payments/webhook` | Chave `x-webhook-key` | — | Webhook (mock) — confirmar pagamento (PAID) |
| `POST` | `/payments/webhook/mercadopago` | Assinatura HMAC | — | Webhook do Mercado Pago — sincronizar status (via `POST /payments/webhook/:gateway`) |

> Sem `PAYMENT_GATEWAY_ACCESS_TOKEN` (TEST-), os endpoints de pagamento operam com valores mockados. Ver [modo de operação](#payments-service).

### Reviews Service (3 endpoints)

| Método | Rota | Autenticação | Roles | Descrição |
|--------|------|--------------|-------|-----------|
| `GET` | `/health` | — | — | Saúde do serviço |
| `GET` | `/health/ready` | — | — | Prontidão |
| `GET` | `/health/live` | — | — | Atividade |

> Estrutura base do microsserviço de avaliações. Endpoints de avaliação (criar/listar)
> serão adicionados nas próximas etapas.

### Totais

| Métrica | Quantidade |
|---------|-----------|
| **Endpoints** | **75** |
| **Serviços** | **5** |
| **Controllers** | **33** |
| **DTOs** | **30** |
| **Autenticação (Bearer)** | **2 endpoints** |
| **Bearer + Roles** | **43 endpoints** |
| **Públicos (sem auth)** | **29 endpoints** |