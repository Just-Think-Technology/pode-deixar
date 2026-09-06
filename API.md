# API — Pode Deixar

## Table of Contents

- [Auth Service](#auth-service) (`:3001`)
- [Users Service](#users-service) (`:3002`)
- [Service Orders Service](#service-orders-service) (`:3003`)
- [Payments Service](#payments-service) (`:3004`)
- [Reviews Service](#reviews-service) (`:3005`)
- [Enums](#enums)
- [Models (Prisma)](#models-prisma)
- [Summary Table](#summary-table)

---

## Auth Service

**Port:** `3001` | **Caddy Proxy:** `/api/auth/*`

### Health

#### `GET /health`

Service health check. No authentication.

| Response | Code | Description |
|----------|--------|-----------|
| `HealthCheckResult` | `200` | Healthy service |
| `HealthCheckResult` | `503` | Unhealthy service |

---

#### `GET /health/ready`

Service readiness check. No authentication.

| Response | Code | Description |
|----------|--------|-----------|
| `HealthCheckResult` | `200` | Service ready |
| `HealthCheckResult` | `503` | Service not ready |

---

#### `GET /health/live`

Service liveness check. No authentication.

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-28T10:00:00.000Z"
}
```

---

### Access

#### `POST /auth/login`

Authenticate a user and return JWT tokens.

**Rate limited** (`ThrottlerGuard`).

**Request body (`LoginDto`):**
```json
{
  "email": "john.doe@example.com",
  "password": "Password123!",
  "rememberMe": false
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `email` | `string` | yes | User email |
| `password` | `string` | yes | User password |
| `rememberMe` | `boolean` | no | Extended session (default: `false`) |

**Response `200`:**
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

| Error | Code |
|------|--------|
| Invalid email or password | `401` |
| Account temporarily locked | `423` |
| Email not verified | `403` |

---

#### `POST /auth/refresh-token`

Refresh the access token using a refresh token.

**Rate limited** (`ThrottlerGuard`).

**Request body (`RefreshTokenDto`):**
```json
{
  "refreshToken": "eyJ..."
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `refreshToken` | `string` | yes | Refresh token obtained at login |

**Response `200`:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer"
}
```

| Error | Code |
|------|--------|
| Invalid or expired refresh token | `401` |

---

#### `GET /auth/verify`

Validate the access token and return the current user data. Used by the frontend to confirm the session before loading authenticated areas.

**Headers:**
| Header | Required | Value |
|--------|-------------|-------|
| `Authorization` | no | `Bearer eyJ...` (without token → `authorized: false`) |

**Response `200` (valid token):**
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

**Response `200` (missing, invalid, expired, revoked or inconsistent token):**
```json
{
  "authorized": false,
  "access_token": "eyJ...|null"
}
```

> Always returns HTTP `200`. The frontend must check the `authorized` field, not the HTTP status.
>
> Validates the JWT signature, `access` type, blacklist (`jti`), user existence and `email`/`role` consistency with the database.

---

#### `POST /auth/logout`

Invalidate user tokens. Requires **Bearer token**.

**Rate limited** (`ThrottlerGuard`). **Protected** (`JwtAuthGuard`).

**Headers:**
| Header | Required | Value |
|--------|-------------|-------|
| `Authorization` | yes | `Bearer eyJ...` |

**Response `200`:**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

### Registration

#### `POST /auth/register`

Register a new user.

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

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `complete_name` | `string` | yes | Full name (3-50 characters) |
| `email` | `string` | yes | Email |
| `password` | `string` | yes | Min. 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |
| `confirm_password` | `string` | yes | Must match `password` |
| `phone` | `string` | yes | Phone |
| `postal_code` | `string` | yes | Postal code |
| `role` | `enum` | yes | `CLIENT` or `PROVIDER` |

**Response `201`:**
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

| Error | Code |
|------|--------|
| Email already registered | `409` |
| Invalid data (validation) | `400` |
| Password does not match confirmation | `400` |

> `email_verification_token` is only returned in the development environment.

---

#### `POST /auth/verify-email`

Verify the user email with a token.

**Rate limited** (`ThrottlerGuard`).

**Request body (`VerifyEmailDto`):**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `token` | `string` | yes | Token received by email |

**Response `200`:** `{ "message": "Email verificado com sucesso" }`

| Error | Code |
|------|--------|
| Invalid or expired token | `400` |

---

#### `POST /auth/resend-email-verification`

Resend the email verification link.

**Rate limited** (`ThrottlerGuard`).

**Request body (`ResendVerificationDto`):**
```json
{
  "email": "john.doe@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `email` | `string` | yes | User email |

**Response `200`:**
```json
{
  "message": "Link de verificação reenviado com sucesso",
  "email_verification_token": "uuid-apenas-em-dev"
}
```

| Error | Code |
|------|--------|
| Email not found | `404` |
| Email already verified | `400` |

---

### Password

#### `POST /auth/forgot-password`

Request a password reset. Sends an email with a token. No authentication.

**Request body (`ForgotPasswordDto`):**
```json
{
  "email": "john.doe@example.com"
}
```

**Response `200`:**
```json
{
  "message": "Se o email existir, você receberá um link de redefinição de senha",
  "reset_password_token": "uuid-apenas-em-dev"
}
```

---

#### `POST /auth/reset-password`

Reset the password using the token received by email. No authentication.

**Request body (`ResetPasswordDto`):**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "NewPassword123!"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `token` | `string` | yes | Reset token |
| `newPassword` | `string` | yes | Min. 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |

**Response `200`:**
```json
{
  "message": "Senha redefinida com sucesso",
  "user": { "email": "john.doe@example.com", "role": "CLIENT" }
}
```

| Error | Code |
|------|--------|
| Invalid or expired token | `400` |

---

#### `PUT /auth/change-password`

Change the authenticated user password. Requires **Bearer token**.

**Protected** (`JwtAuthGuard`).

**Request body (`ChangePasswordDto`):**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `currentPassword` | `string` | yes | Current password |
| `newPassword` | `string` | yes | Min. 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char |

**Response `200`:** `{ "message": "Senha alterada com sucesso" }`

| Error | Code |
|------|--------|
| Incorrect current password | `400` |

> Invalidates the current access token and clears the refresh token in the database.

---

## Users Service

**Port:** `3002` | **Caddy Proxy:** `/api/profiles/*`, `/api/providers/*`, `/api/categories/*`, `/api/storage/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Identical to [Auth Service Health](#health).

---

### Categories

**Prefix:** `categories` | **Public GET** | **POST/PATCH/DELETE:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `ADMIN`

#### `GET /categories`

List all categories, ordered by `order`. No authentication.

**Response `200`:**
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

Create a new category. Requires **Bearer token** with `ADMIN` role.

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

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `name` | `string` | yes | Name (max 100 characters) |
| `slug` | `string` | yes | Unique slug (max 100 characters) |
| `description` | `string` | no | Description (max 500 characters) |
| `icon` | `string` | no | Lucide icon name (max 50 characters) |
| `order` | `number` | no | Display order (≥ 0) |

**Response `201`:** Created category.

| Error | Code |
|------|--------|
| Name or slug already exists | `409` |

---

#### `PATCH /categories/:id`

Update a category. Requires **Bearer token** with `ADMIN` role.

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `id` | `string` (UUID) | Category ID |

**Request body (`UpdateCategoryDto`):** Same fields as `CreateCategoryDto`, all optional.

**Response `200`:** Updated category.

| Error | Code |
|------|--------|
| Category not found | `404` |
| Name or slug already exists | `409` |

---

#### `DELETE /categories/:id`

Delete a category. Requires **Bearer token** with `ADMIN` role.

**Response `200`:** `{ "message": "Categoria excluída com sucesso" }`

| Error | Code |
|------|--------|
| Category not found | `404` |
| Category has linked services | `409` |

---

### Profiles

**Prefix:** `profiles` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Bearer token**

#### `GET /profiles/me`

Get the authenticated user profile.

**Roles:** `CLIENT`, `PROVIDER`

**Response `200` (CLIENT):**
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

**Response `200` (PROVIDER):**
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

| Error | Code |
|------|--------|
| Profile not found | `404` |

---

#### `POST /profiles/client`

Create a client profile.

**Roles:** `CLIENT`

**Request body (`CreateClientProfileDto`):**
```json
{
  "avatarUrl": "https://...",
  "preferences": { "notifications": true }
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `avatarUrl` | `string` | no | Avatar URL |
| `preferences` | `object` | no | Preferences as JSON |

**Response `201`:**
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

| Error | Code |
|------|--------|
| Profile already exists | `409` |

---

#### `PATCH /profiles/client`

Update the client profile.

**Roles:** `CLIENT`

**Request body (`UpdateClientProfileDto`):**
```json
{
  "avatarUrl": "https://nova-url",
  "preferences": { "notifications": false }
}
```

Both fields optional.

**Response `200`:** Same structure as `POST /profiles/client`.

| Error | Code |
|------|--------|
| Profile not found | `404` |

---

#### `POST /profiles/provider`

Create a provider profile.

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

All fields optional.

**Response `201`:**
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

| Error | Code |
|------|--------|
| Profile already exists | `409` |

---

#### `PATCH /profiles/provider`

Update the provider profile.

**Roles:** `PROVIDER`

**Request body (`UpdateProviderProfileDto`):** Same fields as `CreateProviderProfileDto`, all optional.

**Response `200`:** Same structure as `POST /profiles/provider`.

| Error | Code |
|------|--------|
| Profile not found | `404` |

---

#### `PATCH /profiles/avatar`

Upload an avatar (for both profile types). Multipart form-data, `file` field.

**Roles:** `CLIENT`, `PROVIDER`

**Request (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `file` | `binary` | yes | JPEG, PNG, WebP or GIF, max 2MB |

**Response `200`:** Updated profile (same structure as `GET /profiles/me`), with `avatar_url` pointing to MinIO.

| Error | Code |
|------|--------|
| No file uploaded | `400` |
| Invalid format | `400` |
| Profile not found | `404` |

> The old avatar is automatically removed from MinIO when a new one is uploaded.

---

### Provider Public Profile

**Prefix:** `providers/:providerId/profile` | **No authentication**

#### `GET /providers/:providerId/profile`

View a provider public profile, including their active services.

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `providerId` | `string` (UUID) | Provider profile ID |

**Response `200`:**
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

| Error | Code |
|------|--------|
| Profile not found | `404` |

---

### Provider Services (Own)

**Prefix:** `providers/me/services` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `POST /providers/me/services`

Register a new service.

**Request body (`CreateProviderServiceDto`):**
```json
{
  "title": "Instalação de chuveiro elétrico",
  "description": "Instalação completa com garantia de 90 dias",
  "fixedPrice": 150.00,
  "categoryId": "uuid-da-categoria"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `title` | `string` | yes | Max 200 characters |
| `description` | `string` | yes | Max 2000 characters |
| `fixedPrice` | `number` | yes | 2 decimal places, positive |
| `categoryId` | `string` (UUID) | yes | Category ID |

**Response `201`:**
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

| Error | Code |
|------|--------|
| Provider profile not found | `404` |

---

#### `GET /providers/me/services`

List all services of the authenticated provider.

**Response `200`:** Array with the same structure as `POST` above.

| Error | Code |
|------|--------|
| Provider profile not found | `404` |

---

### Provider Services (Detail/Owner)

**Prefix:** `providers/me/services/:serviceId` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `PATCH /providers/me/services/:serviceId`

Update a service (owner only).

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `serviceId` | `string` (UUID) | Service ID |

**Request body (`UpdateProviderServiceDto`):** Same fields as `CreateProviderServiceDto`, all optional.

**Response `200`:** Updated service (same structure as `POST`).

| Error | Code |
|------|--------|
| Service not found | `404` |
| Service does not belong to this provider | `400` |

---

#### `DELETE /providers/me/services/:serviceId`

Deactivate a service (soft delete — sets `is_active = false`).

**Response `200`:** Deactivated service (same structure with `is_active: false`).

| Error | Code |
|------|--------|
| Service not found | `404` |
| Service does not belong to this provider | `400` |

> The record remains in the database, only `is_active` is set to `false`.

---

### Service Images

**Prefix:** `providers/me/services/:serviceId/images` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `POST /providers/me/services/:serviceId/images`

Upload an image for a service. Multipart form-data, `file` field.

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `serviceId` | `string` (UUID) | Service ID |

**Request (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `file` | `binary` | yes | JPEG, PNG, WebP or GIF, max 5MB |

**Response `201`:**
```json
{
  "id": "uuid",
  "provider_service_id": "uuid",
  "url": "http://localhost:8080/api/storage/service-images/uuid-nome-do-arquivo",
  "created_at": "2026-07-09T10:00:00.000Z"
}
```

| Error | Code |
|------|--------|
| No file uploaded | `400` |
| Invalid format | `400` |
| Service not found | `404` |

---

#### `GET /providers/me/services/:serviceId/images`

List images of a service.

**Response `200`:**
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

| Error | Code |
|------|--------|
| Service not found | `404` |

---

#### `DELETE /providers/me/services/:serviceId/images/:imageId`

Remove an image from a service.

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `serviceId` | `string` (UUID) | Service ID |
| `imageId` | `string` (UUID) | Image ID |

**Response `200`:**
```json
{
  "id": "uuid",
  "provider_service_id": "uuid",
  "url": "http://localhost:8080/api/storage/service-images/uuid-nome-do-arquivo",
  "created_at": "2026-07-09T10:00:00.000Z"
}
```

| Error | Code |
|------|--------|
| Image or service not found | `404` |

> Images are stored in MinIO and served via the Caddy proxy (`/api/storage/*` → `minio:9000`), without going through the NestJS backend.

---

### Provider Search

**Prefix:** `providers/search` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `GET /providers/search`

Search providers by category or text.

**Query params:**
| Parameter | Type | Required | Description | Default |
|-----------|------|-------------|-----------|---------|
| `categoryId` | `string` (UUID) | no | Filter by category ID | — |
| `q` | `string` | no | Text to search in title/description | — |
| `page` | `number` | no | Page number | `1` |
| `limit` | `number` | no | Items per page | `10` |

**Response `200`:**
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

| Error | Code |
|------|--------|
| Invalid or unauthorized token | `401` |
| Unauthorized role (not CLIENT) | `403` |

---

### Provider Services (Public)

**Prefix:** `providers/:providerId/services` | **No authentication**

#### `GET /providers/:providerId/services`

List active services of a specific provider.

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `providerId` | `string` (UUID) | Provider profile ID |

**Response `200`:**
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

| Error | Code |
|------|--------|
| Provider profile not found | `404` |

---

## Service Orders Service

**Port:** `3003` | **Caddy Proxy:** `/api/services/*`, `/api/proposals/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Identical to [Auth Service Health](#health).

---

### Service Orders (Client)

**Prefix:** `services/me` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `POST /services/me`

Create a new service order. If `providerId` is provided, the order is directed to a specific provider (direct quote request).

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

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `title` | `string` | yes | Max 200 characters |
| `description` | `string` | yes | Max 2000 characters |
| `categoryId` | `string` (UUID) | yes | Category ID |
| `providerId` | `string` (UUID) | no | Provider ID (direct request) |
| `budgetMin` | `number` | no | Minimum budget (≥ 0) |
| `budgetMax` | `number` | no | Maximum budget (> 0) |
| `address` | `object` | no | Address where the service will be performed (fields: `street`, `number`, `neighborhood`, `city`, `state`, `postalCode`) |

> The `address` is provided by the client in the order (all fields optional). Lat/lng is not required — the frontend builds the Google Maps link from the textual address.

**Response `201`:**
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

> In responses, the address is returned formatted in **snake_case** (`postal_code`), with `null` for missing fields.

---

#### `GET /services/me`

List all orders of the authenticated client.

**Response `200`:** Array with the same structure as `POST` above.

---

#### `POST /services/me/hire`

Hire a service with a fixed price directly (without a proposal). Creates an order with `IN_PROGRESS` status.

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

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `providerServiceId` | `string` (UUID) | yes | Provider service ID |
| `address` | `object` | no | Address where the service will be performed (same structure as `POST /services/me`) |

**Response `201`:** Same structure as `POST /services/me`, with additions:

| Field | Description |
|-------|-----------|
| `provider_service_id` | Contracted service ID |
| `agreed_price` | Agreed fixed price (copied from the service) |
| `status` | `IN_PROGRESS` (already starts in progress) |

| Error | Code |
|------|--------|
| Provider service not found | `404` |
| Service is not available | `400` |
| Cannot hire own service | `400` |

---

### Service Orders (Owner)

**Prefix:** `services/me/:orderId` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `GET /services/me/:orderId`

Get order detail (owner only).

**URL parameters:**
| Parameter | Type | Description |
|-----------|------|-----------|
| `orderId` | `string` (UUID) | Order ID |

**Response `200`:**
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

| Error | Code |
|------|--------|
| Order not found | `404` |
| Order does not belong to the client | `400` |

---

#### `PATCH /services/me/:orderId`

Update an order (owner only, only if open).

**Request body (`UpdateServiceOrderDto`):** Same fields as `CreateServiceOrderDto`, all optional.

**Response `200`:** Updated order (same structure without proposals).

| Error | Code |
|------|--------|
| Order not found | `404` |
| Order does not belong to the client or is not open | `400` |

---

#### `DELETE /services/me/:orderId`

Cancel an order (owner only). Changes status to `CANCELLED`.

**Response `200`:** Cancelled order (same structure with `status: "CANCELLED"`).

| Error | Code |
|------|--------|
| Order not found | `404` |
| Order does not belong to the client | `400` |

---

### Service Orders (Provider)

**Prefix:** `services/requests/received` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `GET /services/requests/received`

List orders directed to the logged-in provider (received requests).

**Response `200`:** Array with the same structure as `POST /services/me`.

| Error | Code |
|------|--------|
| Invalid token | `401` |

---

### Complete Order (Provider)

**Route:** `POST /services/me/:orderId/complete` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

Transitions the order from `IN_PROGRESS` to `COMPLETED`. Prerequisite for the service review. Only the **provider assigned to the order** (`provider_id`) can complete it.

| Error | Code |
|------|--------|
| Order not found | `404` |
| Order does not belong to the provider | `403` |
| Order is not in progress or is already completed | `400` |

---

### Provider Agenda (JTT-94)

**Prefix:** `services/me/agenda` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `GET /services/me/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD`

List the authenticated provider **paid and scheduled services** in the period — used to place jobs on the agenda calendar.

**Inclusion criteria (all):**
- Order provider: `provider_id` = authenticated user **OR** `ACCEPTED` proposal from this provider on the order (marketplace orders)
- `PAID` payment (excludes `REFUNDED`, `FAILED`, `CANCELLED`)
- Order status `IN_PROGRESS` (upcoming) or `COMPLETED` (done)
- `scheduled_at` within the `from`/`to` period

**Query params:**
| Parameter | Type | Required | Description |
|-----------|------|-------------|-----------|
| `from` | `string` (YYYY-MM-DD) | yes | Period start date |
| `to` | `string` (YYYY-MM-DD) | yes | Period end date — **maximum 92-day** window |

**Response `200`:**
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

| Field | Description |
|-------|-----------|
| `scheduled_at` / `scheduled_end_at` | Service date/time (scheduling set by the client at checkout) |
| `order_status` | `IN_PROGRESS` (upcoming) or `COMPLETED` (past) — the frontend decides "done vs upcoming" |
| `address` | Full textual address (Google Maps link built on the frontend; lat/lng is not sent) |
| `photos` | Public MinIO URLs of the order photos |
| `payment` | Only `status`/`amount`/`paid_at` — **never** exposes card data |

| Error | Code |
|------|--------|
| Missing or invalid `from`/`to` | `400` |
| Window larger than 92 days or `from` > `to` | `400` |

---

### Service Orders (Public)

**Prefix:** `services` | **No authentication**

#### `GET /services`

List open orders (so providers can find opportunities).

**Response `200`:** Array with `OPEN` status orders (same structure without proposals).

---

#### `GET /services/:orderId`

Get order detail (authenticated — `CLIENT` or `PROVIDER`).

**Access rules:**
- **CLIENT** owning the order → sees everything (proposals + photos)
- **PROVIDER** with a proposal on the order (or target provider) → sees the order, only their proposal and the photos
- All other cases → `403 Forbidden`

**Response `200`:** Same structure with proposals from `GET /services/me/:orderId`, plus:
| Field | Description |
|-------|-----------|
| `photos` | Array `[{ id, url }]` with the order photos (public MinIO URLs) |

| Error | Code |
|------|--------|
| Order not found | `404` |
| No access to the order | `403` |

---

### Proposals (Provider)

**Prefix:** `proposals` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `POST /proposals`

Create a proposal for a service order.

**Request body (`CreateProposalDto`):**
```json
{
  "serviceOrderId": "uuid-do-pedido",
  "price": 150.00,
  "description": "Posso realizar o serviço ainda esta semana. Tenho 10 anos de experiência.",
  "estimatedDuration": "2 horas"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `serviceOrderId` | `string` (UUID) | yes | Service order ID |
| `price` | `number` | yes | Proposed price, 2 decimal places, positive |
| `description` | `string` | yes | Max 2000 characters |
| `estimatedDuration` | `string` | no | Estimated duration, max 100 characters |

**Response `201`:**
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

| Error | Code |
|------|--------|
| Order not found | `404` |
| Order is not open or you already have a proposal | `400` |

---

#### `GET /proposals/me`

List my proposals (authenticated provider).

**Response `200`:** Array with the same structure as `POST` above.

---

### Proposals (Provider Detail)

**Prefix:** `proposals/:proposalId` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `PROVIDER`

#### `PATCH /proposals/:proposalId`

Update a proposal (owner only, only if pending).

**Request body (`UpdateProposalDto`):** `price`, `description`, `estimatedDuration` — all optional. `serviceOrderId` cannot be changed.

**Response `200`:** Updated proposal.

| Error | Code |
|------|--------|
| Proposal not found | `404` |
| Proposal does not belong to the provider or is not pending | `400` |

---

#### `DELETE /proposals/:proposalId`

Withdraw a proposal (owner only, only if pending). Changes status to `WITHDRAWN`.

**Response `200`:** Proposal with `WITHDRAWN` status.

| Error | Code |
|------|--------|
| Proposal not found | `404` |
| Proposal does not belong to the provider or is not pending | `400` |

---

### Proposals (Accept/Reject)

**Prefix:** `proposals/:proposalId` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`

#### `POST /proposals/:proposalId/accept`

Accept a proposal (order owner only).

**Response `200`:** Proposal with `ACCEPTED` status. The order is changed to `IN_PROGRESS` and now points to the winning provider:
- `provider_id` ← provider of the accepted proposal
- `agreed_price` ← proposal value

> Without this, marketplace orders do not show up in the [provider agenda](#provider-agenda-jtt-94).

| Error | Code |
|------|--------|
| Proposal not found | `404` |
| Order is not open or proposal is not pending | `400` |

---

#### `POST /proposals/:proposalId/reject`

Reject a proposal (order owner only).

**Response `200`:** Proposal with `REJECTED` status.

| Error | Code |
|------|--------|
| Proposal not found | `404` |
| Order does not belong to the client | `400` |

---

### Counter-proposals

**Prefix:** `counter-proposals` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`, `PROVIDER`

#### `POST /counter-proposals`

Create a counter-proposal for a pending proposal. It can be sent by the client (order owner) or the provider (proposal owner).

**Request body (`CreateCounterProposalDto`):**
```json
{
  "proposalId": "uuid-da-proposta",
  "price": 180.00,
  "description": "Posso fazer por este valor com prazo maior",
  "estimatedDuration": "3 dias"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `proposalId` | `string` (UUID) | yes | Original proposal ID |
| `price` | `number` | yes | Counter-proposed value |
| `description` | `string` | yes | Max 2000 characters |
| `estimatedDuration` | `string` | no | Max 100 characters |

**Response `201`:**
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

| Error | Code |
|------|--------|
| Proposal not found | `404` |
| Proposal is not pending | `400` |
| No permission to counter | `400` |
| Already has a pending counter-proposal | `400` |

---

#### `GET /counter-proposals/me`

List my sent counter-proposals.

**Response `200`:** Array with the same structure as `POST` above, with an additional `proposal` field.

---

#### `GET /counter-proposals/proposal/:proposalId`

List counter-proposals of a specific proposal.

| Error | Code |
|------|--------|
| Proposal not found | `404` |

---

### Counter-proposals (Accept/Reject)

**Prefix:** `counter-proposals/:counterProposalId` | **Authentication:** `JwtAuthGuard` + `RolesGuard` | **Roles:** `CLIENT`, `PROVIDER`

#### `POST /counter-proposals/:counterProposalId/accept`

Accept a counter-proposal. Finalizes the agreement: the proposal becomes `ACCEPTED`, the order becomes `IN_PROGRESS` (with `provider_id` ← provider and `agreed_price` ← counter-proposal value), other pending proposals/counter-proposals are rejected.

**Response `200`:** Counter-proposal with `ACCEPTED` status.

| Error | Code |
|------|--------|
| Counter-proposal not found | `404` |
| Counter-proposal is not pending | `400` |
| Cannot accept own counter-proposal | `400` |
| Order is not open | `400` |

---

#### `POST /counter-proposals/:counterProposalId/reject`

Reject a counter-proposal. The original proposal remains pending.

**Response `200`:** Counter-proposal with `REJECTED` status.

| Error | Code |
|------|--------|
| Counter-proposal not found | `404` |
| Counter-proposal is not pending | `400` |
| Cannot reject own counter-proposal | `400` |

---

## Payments Service

**Port:** `3004` | **Caddy Proxy:** `/api/payments/*`

> **Operation mode — Mercado Pago Gateway (sandbox) vs Mock:**
>
> The service uses a **gateway architecture** (port/adapter): a central
> `PaymentGateway` contract and adapters per provider — currently `mercadopago` and
> `mock` (fallback). The active gateway is chosen automatically by the presence
> of `PAYMENT_GATEWAY_ACCESS_TOKEN`; webhooks arrive at
> `POST /payments/webhook/:gateway` and each adapter validates its own signature.
> Without the token, all endpoints operate with **mocked values**.
>
> | Configuration | Behavior |
> |---|---|
> | Without `PAYMENT_GATEWAY_ACCESS_TOKEN` | **Mock** — no external calls |
> | `PAYMENT_GATEWAY_ACCESS_TOKEN=TEST-...` | **Sandbox gateway** for PIX; credit card remains **mock** |
> | `PAYMENT_GATEWAY_ACCESS_TOKEN=TEST-...` + `PAYMENT_GATEWAY_NOTIFICATION_URL` | Same as above + Mercado Pago notifies the real webhook |
> | `PAYMENT_GATEWAY_WEBHOOK_SECRET` set | MP webhook **requires** a valid HMAC signature (`x-signature` + `x-request-id`) |
>
> **Mandatory security:** transaction endpoints (`GET/POST /payments`,
> `charge`, `status`) require **JWT authentication** (Bearer) with `CLIENT` role
> and only access orders **of the client themselves**. The official Mercado
> Pago webhook **rejects** requests without a configured
> `PAYMENT_GATEWAY_WEBHOOK_SECRET` (fail-closed). The mock webhook requires the
> `x-webhook-key` header equal to `MOCK_WEBHOOK_KEY`.
>
> Sandbox setup guide: [`backend/services/payments/SANDBOX.md`](backend/services/payments/SANDBOX.md)
>
> **Environment variables** (all in `.env.staging` / `.env`):
> | Variable | Needed for | Required |
> |----------|-----------------|-------------|
> | `PAYMENT_GATEWAY_ACCESS_TOKEN` | Real gateway (sandbox mode) | no (mock without it) |
> | `PAYMENT_GATEWAY_NOTIFICATION_URL` | Mercado Pago to notify the webhook | no |
> | `PAYMENT_GATEWAY_WEBHOOK_SECRET` | Validate the MP webhook signature | **yes** (without it the MP webhook is rejected) |
> | `PAYMENT_GATEWAY_PAYER_EMAIL` | Payer email in sandbox charges | no (default `sandbox@pode-deixar.com`) |
> | `MOCK_WEBHOOK_KEY` | Mock webhook to confirm payment | no (without it the mock webhook is rejected) |
> | `PLATFORM_FEE_RATE` | Platform fee rate (0.10 = 10%) | no (default `0.10`) |
>
> **CORS:** restricted in `ALLOWED_ORIGINS` (comma-separated list; default `http://localhost:3000`).
>
> **Mode table per endpoint:**
> | Endpoint | Mode (without token) | Mode (with `TEST-` token) |
> |----------|------------------|--------------------------|
> | `GET /health` | — | — |
> | `GET /health/ready` | — | — |
> | `GET /health/live` | — | — |
> | `GET /payments` | Mock | Mock |
> | `POST /payments` | Mock | Mock |
> | `POST /payments/:paymentId/charge` | Mock | **Gateway** (PIX) / Mock (CREDIT_CARD) |
> | `GET /payments/:paymentId/status` | Mock | Mock (reads the database) |
> | `GET /payments/provider/me/finance/summary` | Mock | Mock (reads the database) |
> | `GET /payments/provider/me/finance/items` | Mock | Mock (reads the database) |
> | `GET /payments/provider/me/finance/chart` | Mock | Mock (reads the database) |
> | `POST /payments/webhook` | **Mock** | **Mock** (manual simulation only) |
> | `POST /payments/webhook/:gateway` | Mock (unknown gateway → `404`) | **Real** (e.g. `/webhook/mercadopago` receives MP events) |

### Health

#### `GET /health`

Service health check (database). No authentication. No mock.

#### `GET /health/ready`

Readiness check (database). No authentication. No mock.

#### `GET /health/live`

Liveness check. No authentication. No mock.

Identical to [Auth Service Health](#health).

---

### Payment Transactions

#### `GET /payments`

- **Mode:** `Mock` (always — reads only the local database)
- **Requirements:** JWT authentication (Bearer) with `CLIENT` role
- **Returns:** `200` with the authenticated client payments, ordered by creation (newest first)

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

- **Mode:** `Mock` and `Gateway` (same behavior — only records in the database)
- **Requires:** `CreatePaymentDto` in the body
- **Requirements:** JWT authentication (Bearer) with `CLIENT` role; the order must belong to the authenticated client
- **Returns:** `201` with the payment created as `PENDING`

Records the payment transaction in the database. The **price is not sent by the frontend**
— the value is obtained by the backend from the **agreed price** (`agreedPrice`) or the
order **accepted proposal**. No external call is made — the charge is generated
later, in `charge`.
For real operation, it must be called right after proposal acceptance (see flow below).

The **service scheduling is also set here** (client at checkout): the
`scheduledAt` (and optionally `scheduledEndAt`) is stored on the order. The payment can
only become `PAID` if the order has `scheduled_at` (webhooks reject with `400`
otherwise — fail-closed).

**Request body (`CreatePaymentDto`):**
```json
{
  "serviceOrderId": "uuid-do-pedido",
  "method": "PIX",
  "scheduledAt": "2026-08-20T14:00:00.000Z",
  "scheduledEndAt": "2026-08-20T17:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `serviceOrderId` | `string` (UUID) | yes | Service order ID (must belong to the client) |
| `method` | `PaymentMethod` | yes | `PIX` or `CREDIT_CARD` |
| `scheduledAt` | `string` (ISO 8601) | yes | Scheduled service date/time — stored on the order |
| `scheduledEndAt` | `string` (ISO 8601) | no | Expected service end — must be after `scheduledAt` |

| Status | Code | Return |
|--------|--------|---------|
| Success | `201` | Created payment (`status: "PENDING"`, value from the backend) |
| Validation | `400` | `BadRequestException` — { message, errors[] } |
| Order does not belong to the client | `403` | `ForbiddenException` |
| No price defined | `400` | `BadRequestException` (order without accepted proposal) |

---

### Charge and Status

#### `POST /payments/:paymentId/charge`

> **Mode:**
> - **PIX + configured gateway (`TEST-...`)**: **real** — creates a charge in Mercado Pago (returns a real sandbox QR code).
> - **PIX without gateway**: **mock** — generates `chg_mock_...`.
> - **CREDIT_CARD**: **mock** always (card token flow not implemented yet).

- **Requires:** existing payment (`404` if not) with `PENDING` status (`400` otherwise) — the charge can only be generated once per pending transaction.
- **Requirements:** JWT authentication (Bearer) with `CLIENT` role; the payment must belong to the authenticated client (`403` otherwise). Rate limit: 10 req/min.
- **Required variables:** `PAYMENT_GATEWAY_ACCESS_TOKEN` (real mode); `PAYMENT_GATEWAY_PAYER_EMAIL` (optional).
- **Returns:** `200` with `paymentId`, `chargeRef`, `status` and `cobranca` (fields vary by method/mode).

**Real flow (PIX, gateway mode):**
1. `POST /payments/:paymentId/charge` is called with a configured gateway
2. Mercado Pago returns `external_ref` = local `paymentId` + configured `notification_url`
3. Response contains `pixCopiaECola` (copy-and-paste text) and `qrCodeBase64` (image)

**Response `200` (mock PIX or gateway PIX):**
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

**Response `200` (real gateway PIX) — adds `qrCodeBase64` and `mercadoPagoId`:**
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

**Response `200` (CREDIT_CARD — mock):**
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

> **PCI-DSS:** card data (PAN/CVV) is **never** sent to the backend.
> When real CREDIT_CARD is implemented, **Mercado Pago
> tokenization** will be used (card token on the client via SDK/Bricks) or **hosted
> Checkout Pro** — the backend only receives the transaction token/ID. Logs are
> sanitized against PAN/CVV.

| Status | Code | Return |
|--------|--------|---------|
| Success | `200` | Generated charge (see fields above) |
| Payment not found | `404` | `NotFoundException` |
| Payment does not belong to the client | `403` | `ForbiddenException` |
| Payment not pending | `400` | `BadRequestException` |

---

#### `GET /payments/:paymentId/status`

- **Mode:** always `Mock` (reads the local database state, regardless of the gateway)
- **Requires:** existing payment (`404` if not)
- **Requirements:** JWT authentication (Bearer) with `CLIENT` role; the payment must belong to an order of the authenticated client (`403` otherwise)
- **Returns:** `200` with the current payment status (may reflect an update made by the webhook)

**Response `200`:**
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

| Status | Code | Return |
|--------|--------|---------|
| Success | `200` | status/method/amount/externalRef/paidAt |
| Payment not found | `404` | `NotFoundException` |
| Payment does not belong to the client | `403` | `ForbiddenException` |

---

### Confirmation Webhooks

There are two webhooks: the **mock** (for manual flow testing) and the generic gateway `POST /payments/webhook/:gateway`, which resolves the adapter by the path name (e.g. `mercadopago`) — unknown gateway returns `404`.

#### `POST /payments/webhook` (mock simulator)

- **Mode:** `Mock` — manually simulates gateway payment confirmation
- **Requires:** `PaymentWebhookDto` (body), existing payment and **`x-webhook-key`** header equal to `MOCK_WEBHOOK_KEY` (without a valid key → `403`)
- **Returns:** `200` with the payment updated to `PAID` (idempotent — retry does not change an already `PAID` payment)

> The received `amount` **is compared** with the value recorded in the transaction — if different, the webhook is rejected (`400`).
>
> The order must have `scheduled_at` (set in `POST /payments`) — without scheduling, the `PAID` confirmation is rejected (`400`).

**Request body:**
```json
{
  "paymentId": "uuid-do-pagamento",
  "externalId": "tx_mock_1234567890",
  "amount": 150.00
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `paymentId` | `string` (UUID) | yes | Payment ID in the system |
| `externalId` | `string` | yes | Transaction ID in the gateway (mock) |
| `amount` | `number` | yes | Confirmed value (must match the recorded one) |

**Header:** `x-webhook-key: <MOCK_WEBHOOK_KEY>`

| Status | Code | Return |
|--------|--------|---------|
| Success | `200` | Updated payment (`status: "PAID"`, `paidAt` filled) |
| Payment not found | `404` | `NotFoundException` |
| Invalid webhook key | `403` | `ForbiddenException` |
| Amount mismatch | `400` | `BadRequestException` |

---

#### `POST /payments/webhook/:gateway` (official, e.g. `mercadopago`)

- **Mode:** **Real** — public endpoint called by the gateway (Mercado Pago in sandbox or production) with payment events
- **Requires:**
  - In prod: `PAYMENT_GATEWAY_NOTIFICATION_URL` pointing to the public URL of this endpoint (e.g. `https://dominio/api/payments/webhook/mercadopago`; dev: ngrok tunnel)
  - Local payment whose `externalRef` is the ID returned by charge (link between gateway and database)
  - **`PAYMENT_GATEWAY_WEBHOOK_SECRET` required** — without it, the webhook is rejected (`403`); HMAC signature validated via `x-signature` (`ts`+`v1`) and `x-request-id` headers (fail-closed)
  - Gateway payload value must match the recorded `amount` (`400` if it differs)
- **Returns:** `200` with the payment synced with the gateway status
- **Requires:** no user authentication for the gateway (external webhook)

**Request body — official Mercado Pago payload (plain JSON, no DTO):**
```json
{
  "type": "payment",
  "action": "payment.updated",
  "data": { "id": "123456789" }
}
```

| Field | Type | Required | Description |
|-------|------|-------------|-----------|
| `type` | `string` | yes | Event type (`payment`) |
| `action` | `string` | yes | `payment.created` or `payment.updated` |
| `data.id` | `string` | yes | Payment ID in Mercado Pago |

**Headers (with secret):** `x-signature` (`ts` and `v1`), `x-request-id`.

**Gateway status mapping:**
| Gateway | Pode Deixar |
|---------|-------------|
| `approved` | `PAID` |
| `pending`, `in_process` | `PENDING` |
| `rejected` | `FAILED` |
| `cancelled` | `CANCELLED` |
| `refunded` | `REFUNDED` |

| Status | Code | Return |
|--------|--------|---------|
| Success | `200` | Local payment synced (status + paidAt + externalRef) |
| Local payment not found | `404` | `NotFoundException` |
| Invalid signature or missing secret | `403` | `ForbiddenException` |
| Gateway amount mismatch | `400` | `BadRequestException` |

---

### Recommended Full Flow (Accepted Proposal)

```
1. POST /payments                    → creates a transaction with PENDING status
2. POST /payments/:paymentId/charge  → charge (real PIX in sandbox OR mock)
3. Client pays (QR/copy-and-paste/checkout)
4. POST /payments/webhook/mercadopago → Mercado Pago notifies (real)
   OR POST /payments/webhook          → simulates confirmation (mock)
5. GET  /payments/:paymentId/status   → final status (PAID)
```

---

### Provider Finance (JTT-95)

Read endpoints for the provider to check what they are owed based on
accepted proposals and the client payment status.

> **Backend source of truth:** gross, fee and net are **calculated in the backend**
> at payment creation time (`POST /payments`) and persisted on `Payment`
> (`fee_rate`, `fee_amount`, `net_amount`), using the rate configured in
> `PLATFORM_FEE_RATE` (default `0.10` = 10%). Payments created before this model
> (null fields) have values calculated at read time with the current rate. The frontend
> **never** calculates fee/net.
>
> **Access (ownership):** the authenticated provider only sees payments for orders
> where they are the provider of an **ACCEPTED** proposal. Never exposes card data
> (PCI) — only totals and status.

#### `GET /payments/provider/me/finance/summary`

- **Mode:** always `Mock` (reads the local database)
- **Requirements:** JWT authentication (Bearer) with `PROVIDER` role
- **Returns:** `200` with the authenticated provider finance summary

**Response `200`:**
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

| Field | Description |
|-------|-----------|
| `currency` | Currency (fixed `BRL`) |
| `feeRate` | Current platform fee rate (fraction, e.g. `0.1`) |
| `pendingNet` | Net receivable from `PENDING` payments (client has not paid yet) |
| `grossToReceive` | Gross from `PAID` payments (available for payout) |
| `feesOnToReceive` | Fee retained on `PAID` payments |
| `toReceiveNet` | Net from `PAID` payments (gross − fee) |
| `receivedThisMonthNet` | Net from `PAID` payments in the current month |
| `feesThisMonth` | Fee retained on `PAID` payments in the current month |

#### `GET /payments/provider/me/finance/items?status=PAID`

- **Mode:** always `Mock` (reads the local database)
- **Requirements:** JWT authentication (Bearer) with `PROVIDER` role
- **Optional query:** `status` = `PENDING` \| `PAID` \| `FAILED` \| `REFUNDED` \| `CANCELLED`
- **Returns:** `200` with the list of items linked to the provider accepted proposal (newest first)

**Response `200`:**
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

| Field | Description |
|-------|-----------|
| `paymentId` | Payment ID |
| `proposalId` | Accepted provider proposal ID on the order |
| `serviceOrderId` | Order ID |
| `paymentStatus` | Client payment status |
| `method` | `PIX` or `CREDIT_CARD` |
| `grossAmount` | Gross amount paid by the client |
| `feeAmount` | Platform fee retained |
| `netAmount` | Net to transfer to the provider (gross − fee) |
| `feeRate` | Applied rate (fraction) |
| `paidAt` | Payment confirmation date (null if unpaid) |
| `createdAt` | Payment creation date |

#### `GET /payments/provider/me/finance/chart?months=6`

- **Mode:** always `Mock` (reads the local database)
- **Requirements:** JWT authentication (Bearer) with `PROVIDER` role
- **Optional query:** `months` (1–24, default `6`) — number of months including the current one
- **Returns:** `200` with monthly `PAID` payment data (months without activity appear with zeros), from oldest to newest

**Response `200`:**
```json
[
  { "month": "2026-03", "netReceived": 0.00, "feesRetained": 0.00 },
  { "month": "2026-04", "netReceived": 315.00, "feesRetained": 35.00 },
  { "month": "2026-05", "netReceived": 180.00, "feesRetained": 20.00 }
]
```

| Field | Description |
|-------|-----------|
| `month` | Month in `YYYY-MM` format |
| `netReceived` | Net received in the month (`PAID` payments) |
| `feesRetained` | Platform fee retained in the month |

---

## Reviews Service

**Port:** `3005` | **Caddy Proxy:** `/api/reviews/*`

### Health

#### `GET /health`

#### `GET /health/ready`

#### `GET /health/live`

Identical to [Auth Service Health](#health).

> Bidirectional reviews (client ↔ provider) after order completion and payment.
> Rules: order must be `COMPLETED` with at least one `PAID` payment; rating from `1` to `5`
> with an optional comment (max 500 characters); editing allowed only within the first
> **5 minutes** after creation; deletion at any time. The author is identified by the
> JWT token (`reviewerId`) and the target (`revieweeId`) is derived from the order: the client reviews the
> provider and vice versa. The target aggregate scores (`rating`/`total_reviews`) are
> recalculated on each create/edit/delete.

#### `POST /reviews`

Create a review for a completed and paid order. Requires **Bearer token** with `CLIENT` or `PROVIDER` role.

- **Requirements:** the user must be part of the order (`403` otherwise); `COMPLETED` order with `PAID` payment (`400`); order without a defined provider (`400`); duplicate review from the same author on the same order (`400`).

**Body:**

```json
{
  "serviceOrderId": "uuid",
  "rating": 5,
  "comment": "Excelente serviço!"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "service_order_id": "uuid",
  "reviewer_id": "uuid",
  "reviewee_id": "uuid",
  "rating": 5,
  "comment": "Excelente serviço!",
  "created_at": "2026-08-16T12:00:00.000Z",
  "updated_at": "2026-08-16T12:00:00.000Z"
}
```

#### `GET /reviews/me`

List reviews written by the authenticated user. Requires **Bearer token** with `CLIENT` or `PROVIDER` role.

#### `GET /reviews/service-order/:orderId`

List reviews of an order. Requires **Bearer token** with `CLIENT` or `PROVIDER` role. Only the client owning the order or the order provider have access (`403` otherwise).

#### `GET /reviews/provider/:providerId`

List reviews received by a provider. **Public endpoint** (no authentication) — for displaying the provider public profile.

#### `PATCH /reviews/:reviewId`

Edit own review. Requires **Bearer token** with `CLIENT` or `PROVIDER` role.

- **Requirements:** only the author can edit (`403`); allowed only within the first 5 minutes after creation (`400`); at least one field (`rating` and/or `comment`) must be provided (`400`).

**Body:**

```json
{
  "rating": 4
}
```

#### `DELETE /reviews/:reviewId`

Delete own review. Requires **Bearer token** with `CLIENT` or `PROVIDER` role. Only the author can delete (`403`). Deletion is allowed at any time.

---

## Enums

### `Role`

| Value | Description |
|-------|-----------|
| `CLIENT` | Client (customer) |
| `PROVIDER` | Service provider |
| `ADMIN` | Administrator |

### `ServiceOrderStatus`

| Value | Description |
|-------|-----------|
| `OPEN` | Open for proposals |
| `IN_PROGRESS` | In progress (proposal accepted) |
| `COMPLETED` | Completed |
| `CANCELLED` | Cancelled by the client |

### `ProposalStatus`

| Value | Description |
|-------|-----------|
| `PENDING` | Pending (awaiting response) |
| `ACCEPTED` | Accepted by the client |
| `REJECTED` | Rejected by the client |
| `WITHDRAWN` | Withdrawn by the provider |

### `PaymentStatus`

| Value | Description |
|-------|-----------|
| `PENDING` | Transaction recorded, awaiting confirmation |
| `PAID` | Payment confirmed (webhook) |
| `FAILED` | Failed |
| `REFUNDED` | Refunded |
| `CANCELLED` | Cancelled |

### `PaymentMethod`

| Value | Description |
|-------|-----------|
| `PIX` | PIX |
| `CREDIT_CARD` | Credit card |

---

## Models (Prisma)

### `User`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `complete_name` | String | Full name |
| `email` | String | Email (unique) |
| `password` | String | Password hash |
| `role` | `Role` | CLIENT, PROVIDER or ADMIN |
| `phone` | String | Phone |
| `postal_code` | String | Postal code |
| `email_verified` | Boolean | Email verified? |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ClientProfile`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → User (unique) |
| `avatar_url` | String? | Avatar URL |
| `preferences` | JSON? | Preferences |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ProviderProfile`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → User (unique) |
| `avatar_url` | String? | Avatar URL |
| `bio` | String? | Bio |
| `hourly_rate` | Decimal? | Hourly rate |
| `skills` | String[] | Skill list |
| `portfolio` | JSON? | Portfolio URLs |
| `rating` | Float | Average rating |
| `total_reviews` | Int | Total reviews |
| `is_available` | Boolean | Available? |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `Category`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `name` | String | Name (unique) |
| `slug` | String | Slug (unique) |
| `description` | String? | Description |
| `icon` | String? | Lucide icon |
| `order` | Int | Display order |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ProviderService`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `provider_profile_id` | UUID | FK → ProviderProfile |
| `title` | String | Service title |
| `description` | Text | Detailed description |
| `fixed_price` | Decimal | Fixed price |
| `category_id` | UUID | FK → Category |
| `category` | Category | Category object (via include) |
| `images` | `ServiceImage[]` | Service images (via include) |
| `is_active` | Boolean | Active? (soft delete) |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `ServiceImage`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `provider_service_id` | UUID | FK → ProviderService (cascade on delete) |
| `url` | String | Public image URL in MinIO |
| `created_at` | DateTime | |

### `ServiceOrder`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `client_id` | UUID | FK → User |
| `provider_id` | UUID? | FK → User (target provider, direct request) |
| `provider_service_id` | UUID? | FK → ProviderService (direct hire) |
| `agreed_price` | Decimal? | Agreed fixed price (direct hire) |
| `title` | String | Title |
| `description` | Text | Description |
| `category_id` | UUID | FK → Category |
| `category` | Category | Category object (via include) |
| `budget_min` | Decimal? | Minimum budget |
| `budget_max` | Decimal? | Maximum budget |
| `address` | JSON? | Address (street, number, neighborhood, city, state, postalCode) |
| `scheduled_at` | DateTime? | Scheduled service date/time (set at checkout; required when payment becomes PAID) |
| `scheduled_end_at` | DateTime? | Expected service end |
| `status` | `ServiceOrderStatus` | Current status |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `Proposal`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `service_order_id` | UUID | FK → ServiceOrder |
| `provider_id` | UUID | FK → User (provider) |
| `price` | Decimal | Proposed price |
| `description` | Text | Proposal description |
| `estimated_duration` | String? | Estimated duration |
| `status` | `ProposalStatus` | Current status |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

### `TokenBlacklist`

| Field | Type | Description |
|-------|------|-----------|
| `jti` | String | JWT ID (primary key) |
| `expires_at` | DateTime | Expiration date |

### `Payment`

| Field | Type | Description |
|-------|------|-----------|
| `id` | UUID | Primary key |
| `service_order_id` | UUID | FK → ServiceOrder (cascade on delete) |
| `amount` | Decimal | Gross transaction value |
| `currency` | String | Currency (default: BRL) |
| `method` | `PaymentMethod` | PIX or CREDIT_CARD (default: PIX) |
| `status` | `PaymentStatus` | Current status (default: PENDING) |
| `fee_rate` | Decimal? | Platform fee rate applied at creation time (e.g. `0.1`); null for legacy payments |
| `fee_amount` | Decimal? | Platform fee retained (gross × rate); null for legacy payments |
| `net_amount` | Decimal? | Net to transfer to the provider (gross − fee); null for legacy payments |
| `external_ref` | String? | Transaction ID in the gateway |
| `idempotency_key` | String? | Idempotency key (unique with service_order_id) |
| `paid_at` | DateTime? | Payment confirmation date |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

---

## Summary Table

### Caddy Proxy

| Route | Target | Service |
|------|---------|---------|
| `/api/auth/*` | `:3001` | Auth |
| `/api/profiles/*` | `:3002` | Users |
| `/api/providers/*` | `:3002` | Users |
| `/api/categories/*` | `:3002` | Users |
| `/api/services/*` | `:3003` | Service Orders |
| `/api/proposals/*` | `:3003` | Service Orders |
| `/api/payments/*` | `:3004` | Payments |
| `/api/reviews/*` | `:3005` | Reviews |
| `/api/storage/*` | `:9000` | MinIO (via reverse proxy) |
| `/*` (others) | `:3000` | Frontend |

### Auth Service (13 endpoints)

| Method | Route | Authentication | Roles | Description |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Service health |
| `GET` | `/health/ready` | — | — | Readiness |
| `GET` | `/health/live` | — | — | Liveness |
| `POST` | `/auth/login` | — | — | Login |
| `POST` | `/auth/refresh-token` | — | — | Refresh token |
| `GET` | `/auth/verify` | Bearer (optional) | — | Validate session / access token |
| `POST` | `/auth/logout` | Bearer | — | Logout |
| `POST` | `/auth/register` | — | — | Registration |
| `POST` | `/auth/verify-email` | — | — | Verify email |
| `POST` | `/auth/resend-email-verification` | — | — | Resend verification |
| `POST` | `/auth/forgot-password` | — | — | Forgot password |
| `POST` | `/auth/reset-password` | — | — | Reset password |
| `PUT` | `/auth/change-password` | Bearer | — | Change password |

### Users Service (23 endpoints)

| Method | Route | Authentication | Roles | Description |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Service health |
| `GET` | `/health/ready` | — | — | Readiness |
| `GET` | `/health/live` | — | — | Liveness |
| `GET` | `/profiles/me` | Bearer | CLIENT, PROVIDER | My profile |
| `POST` | `/profiles/client` | Bearer | CLIENT | Create client profile |
| `PATCH` | `/profiles/client` | Bearer | CLIENT | Update client profile |
| `POST` | `/profiles/provider` | Bearer | PROVIDER | Create provider profile |
| `PATCH` | `/profiles/provider` | Bearer | PROVIDER | Update provider profile |
| `PATCH` | `/profiles/avatar` | Bearer | CLIENT, PROVIDER | Avatar upload |
| `GET` | `/providers/:providerId/profile` | — | — | Provider public profile |
| `GET` | `/providers/search` | Bearer | CLIENT | Search providers |
| `POST` | `/providers/me/services` | Bearer | PROVIDER | Create service |
| `GET` | `/providers/me/services` | Bearer | PROVIDER | My services |
| `PATCH` | `/providers/me/services/:serviceId` | Bearer | PROVIDER | Update service |
| `DELETE` | `/providers/me/services/:serviceId` | Bearer | PROVIDER | Deactivate service |
| `POST` | `/providers/me/services/:serviceId/images` | Bearer | PROVIDER | Upload image |
| `GET` | `/providers/me/services/:serviceId/images` | Bearer | PROVIDER | List images |
| `DELETE` | `/providers/me/services/:serviceId/images/:imageId` | Bearer | PROVIDER | Remove image |
| `GET` | `/providers/:providerId/services` | — | — | Public services |
| `GET` | `/categories` | — | — | List categories |
| `POST` | `/categories` | Bearer | ADMIN | Create category |
| `PATCH` | `/categories/:id` | Bearer | ADMIN | Update category |
| `DELETE` | `/categories/:id` | Bearer | ADMIN | Delete category |

### Service Orders Service (25 endpoints)

| Method | Route | Authentication | Roles | Description |
|--------|------|-------------|-------|-----------|
| `GET` | `/health` | — | — | Service health |
| `GET` | `/health/ready` | — | — | Readiness |
| `GET` | `/health/live` | — | — | Liveness |
| `POST` | `/services/me` | Bearer | CLIENT | Create order |
| `POST` | `/services/me/hire` | Bearer | CLIENT | Hire fixed service |
| `GET` | `/services/me` | Bearer | CLIENT | My orders |
| `GET` | `/services/me/agenda` | Bearer | PROVIDER | Provider agenda (paid services, `from`/`to`) |
| `GET` | `/services/me/:orderId` | Bearer | CLIENT | Order detail (owner) |
| `PATCH` | `/services/me/:orderId` | Bearer | CLIENT | Update order |
| `DELETE` | `/services/me/:orderId` | Bearer | CLIENT | Cancel order |
| `POST` | `/services/me/:orderId/complete` | Bearer | PROVIDER | Complete order (IN_PROGRESS → COMPLETED) |
| `GET` | `/services` | — | — | Open orders |
| `GET` | `/services/:orderId` | Bearer | CLIENT, PROVIDER | Order detail (authenticated, with photos) |
| `GET` | `/services/requests/received` | Bearer | PROVIDER | Received requests |
| `POST` | `/proposals` | Bearer | PROVIDER | Create proposal |
| `GET` | `/proposals/me` | Bearer | PROVIDER | My proposals |
| `PATCH` | `/proposals/:proposalId` | Bearer | PROVIDER | Update proposal |
| `DELETE` | `/proposals/:proposalId` | Bearer | PROVIDER | Withdraw proposal |
| `POST` | `/proposals/:proposalId/accept` | Bearer | CLIENT | Accept proposal |
| `POST` | `/proposals/:proposalId/reject` | Bearer | CLIENT | Reject proposal |
| `POST` | `/counter-proposals` | Bearer | CLIENT, PROVIDER | Create counter-proposal |
| `GET` | `/counter-proposals/me` | Bearer | CLIENT, PROVIDER | My counter-proposals |
| `GET` | `/counter-proposals/proposal/:proposalId` | Bearer | CLIENT, PROVIDER | Counter-proposals of the proposal |
| `POST` | `/counter-proposals/:counterProposalId/accept` | Bearer | CLIENT, PROVIDER | Accept counter-proposal |
| `POST` | `/counter-proposals/:counterProposalId/reject` | Bearer | CLIENT, PROVIDER | Reject counter-proposal |

### Payments Service (12 endpoints)

| Method | Route | Authentication | Roles | Description |
|--------|------|--------------|-------|-----------|
| `GET` | `/health` | — | — | Service health |
| `GET` | `/health/ready` | — | — | Readiness |
| `GET` | `/health/live` | — | — | Liveness |
| `GET` | `/payments` | JWT + Roles | CLIENT | List client payments |
| `POST` | `/payments` | JWT + Roles | CLIENT | Register transaction (PENDING) |
| `POST` | `/payments/:paymentId/charge` | JWT + Roles | CLIENT | Generate charge (MP PIX if configured, otherwise mock) |
| `GET` | `/payments/:paymentId/status` | JWT + Roles | CLIENT | Get payment status |
| `GET` | `/payments/provider/me/finance/summary` | JWT + Roles | PROVIDER | Provider finance summary |
| `GET` | `/payments/provider/me/finance/items` | JWT + Roles | PROVIDER | Provider finance items (`status` filter) |
| `GET` | `/payments/provider/me/finance/chart` | JWT + Roles | PROVIDER | Monthly chart data (`months`) |
| `POST` | `/payments/webhook` | `x-webhook-key` key | — | Webhook (mock) — confirm payment (PAID) |
| `POST` | `/payments/webhook/mercadopago` | HMAC signature | — | Mercado Pago webhook — sync status (via `POST /payments/webhook/:gateway`) |

> Without `PAYMENT_GATEWAY_ACCESS_TOKEN` (`TEST-`), payment endpoints operate with mocked values. See [operation mode](#payments-service).

### Reviews Service (9 endpoints)

| Method | Route | Authentication | Roles | Description |
|--------|------|--------------|-------|-----------|
| `GET` | `/health` | — | — | Service health |
| `GET` | `/health/ready` | — | — | Readiness |
| `GET` | `/health/live` | — | — | Liveness |
| `POST` | `/reviews` | JWT + Roles | CLIENT, PROVIDER | Create review for completed and paid order |
| `GET` | `/reviews/me` | JWT + Roles | CLIENT, PROVIDER | My reviews (written by me) |
| `GET` | `/reviews/service-order/:orderId` | JWT + Roles | CLIENT, PROVIDER | Reviews of an order (order parties) |
| `GET` | `/reviews/provider/:providerId` | — | — | Reviews received by the provider (public) |
| `PATCH` | `/reviews/:reviewId` | JWT + Roles | CLIENT, PROVIDER | Edit own review (5-min window) |
| `DELETE` | `/reviews/:reviewId` | JWT + Roles | CLIENT, PROVIDER | Delete own review |

> Bidirectional reviews (client ↔ provider) after a `COMPLETED` and paid order. Rating
> `1–5`, optional comment (max 500), editing within 5 minutes, deletion at any time.

### Totals

| Metric | Count |
|---------|-----------|
| **Endpoints** | **81** |
| **Services** | **5** |
| **Controllers** | **35** |
| **DTOs** | **32** |
| **Authentication (Bearer)** | **2 endpoints** |
| **Bearer + Roles** | **48 endpoints** |
| **Public (no auth)** | **30 endpoints** |
