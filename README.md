# Multi-Tenant REST API

Production-ready multi-tenant API built with **Node.js**, **TypeScript**, **Express**, and **Prisma**. Full tenant isolation, JWT authentication with refresh token rotation, role-based access control, and API key management — structured for real SaaS workloads.

## Architecture

```
src/
├── config/          # Database client, environment validation
├── controllers/     # Auth, Users, Projects, API Keys
├── middleware/       # JWT auth, RBAC, Zod validation, error handler
├── routes/          # Versioned route registration
├── utils/           # ApiError class, JWT helpers, response builder
└── validators/      # Zod schemas for all request bodies
prisma/
├── schema.prisma    # Tenant, User, RefreshToken, ApiKey, Project models
└── seed.ts          # Development seed data
```

## Stack

- **Runtime**: Node.js 20 + TypeScript (strict mode)
- **Framework**: Express 4
- **ORM**: Prisma with PostgreSQL
- **Auth**: JWT (access + refresh token rotation), bcrypt password hashing
- **Validation**: Zod on all request bodies and query params
- **Security**: Helmet, CORS, express-rate-limit (global + per-route)

## Features

- **Multi-tenancy**: Every resource is scoped to a tenant via `tenantId`. Cross-tenant data leakage is structurally impossible.
- **JWT rotation**: Access tokens (15m), refresh tokens (7d) stored hashed in DB, rotated on every refresh.
- **RBAC**: Four roles — `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` — enforced at route level.
- **API keys**: SHA-256 hashed, prefix-indexed, permission-scoped, optional expiry. Raw key returned once only.
- **Pagination**: All list endpoints support `page` + `limit` with total/totalPages metadata.
- **Soft deletes**: Projects use status-based soft delete to preserve audit trail.
- **Graceful shutdown**: SIGTERM/SIGINT handlers flush DB connections cleanly.

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register tenant + owner account |
| POST | `/api/v1/auth/login` | Login (returns access + refresh tokens) |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |

### Users
| Method | Path | Role Required |
|--------|------|---------------|
| GET | `/api/v1/users/me` | Any authenticated |
| GET | `/api/v1/users` | OWNER, ADMIN |
| GET | `/api/v1/users/:id` | OWNER, ADMIN |
| POST | `/api/v1/users` | OWNER, ADMIN |
| PATCH | `/api/v1/users/:id/role` | OWNER, ADMIN |
| DELETE | `/api/v1/users/:id` | OWNER, ADMIN |

### Projects
| Method | Path | Role Required |
|--------|------|---------------|
| GET | `/api/v1/projects` | Any authenticated |
| GET | `/api/v1/projects/:id` | Any authenticated |
| POST | `/api/v1/projects` | OWNER, ADMIN, MEMBER |
| PATCH | `/api/v1/projects/:id` | OWNER, ADMIN, MEMBER |
| DELETE | `/api/v1/projects/:id` | OWNER, ADMIN |

### API Keys
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/api-keys` | List active keys (no raw key) |
| POST | `/api/v1/api-keys` | Create key (raw returned once) |
| DELETE | `/api/v1/api-keys/:id` | Revoke key |
| POST | `/api/v1/api-keys/verify` | Verify key validity (public) |

## Setup

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Min 32-char secret for access tokens |
| `JWT_REFRESH_SECRET` | Min 32-char secret for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PORT` | Server port (default: `3000`) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms (default: `900000`) |
| `RATE_LIMIT_MAX` | Max requests per window (default: `100`) |

## Response Format

All responses follow a consistent envelope:

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

## Security Notes

- Passwords hashed with bcrypt (cost factor 12)
- API keys hashed with SHA-256 — raw value never stored
- Refresh tokens stored hashed, rotated on every use (rotation attack detection)
- Auth endpoints rate-limited to 10 req/15min separately from global limiter
- Helmet sets security headers on all responses
- Request body capped at 10kb to prevent payload attacks

## Why This Over Other Node.js API Boilerplates?

| Feature | This API | Typical Express Starters |
|---|---|---|
| Multi-tenancy | ✅ Full tenant isolation with Prisma middleware | ❌ Single-tenant |
| Docker one-command setup | ✅ docker-compose + setup script | ❌ Manual DB setup |
| Example API calls | ✅ Ready-to-run curl scripts | ❌ Postman collection at best |
| JWT + refresh token rotation | ✅ Access + refresh with revocation | ⚠️ Basic JWT only |
| RBAC | ✅ Owner, Admin, Member, Viewer | ⚠️ No role system |
| API key system | ✅ Hashed keys with permissions + expiry | ❌ Not included |
| Seed script | ✅ Demo users + tenant + project | ❌ Empty database |
