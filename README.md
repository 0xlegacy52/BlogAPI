# BlogAPI

A professional, production-ready REST API for a blogging platform. Built as a portfolio project to demonstrate backend engineering skills: clean architecture, JWT auth, RBAC, pagination, search, and full Swagger documentation.

## Architecture

**Monorepo** managed with pnpm workspaces:

- `artifacts/api-server/` — Express + TypeScript API server
- `lib/db/` — Drizzle ORM + PostgreSQL schema (`@workspace/db`)
- `lib/api-zod/` — Shared Zod validation schemas (`@workspace/api-zod`)

## Tech Stack

- **Runtime**: Node.js + Express 5 + TypeScript (ESM)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (access token 15m + refresh token 7d with `jti` for uniqueness)
- **Password hashing**: bcrypt (12 rounds)
- **Docs**: Swagger UI (static spec at `/api/api-docs`)
- **Validation**: express-validator
- **File uploads**: multer (memory) + Cloudinary
- **Security**: helmet, cors, express-rate-limit
- **Logging**: pino + pino-http
- **Tests**: vitest + supertest (51 tests, 5 test files)
- **Build**: esbuild (bundles to `dist/index.mjs`)

## API Endpoints

All routes are under `/api/v1/`:

| Group    | Endpoints |
|----------|-----------|
| Auth     | POST /auth/register, /auth/login, /auth/refresh, /auth/logout · GET /auth/me |
| Users    | GET /users (admin), GET /users/:username · PUT /users/me · POST /users/me/avatar · DELETE /users/:id (admin) |
| Posts    | GET/POST /posts · GET/PUT/DELETE /posts/:id · PATCH /posts/:id/publish|archive · POST /posts/:id/like|bookmark |
| Comments | GET/POST /posts/:id/comments · PUT/DELETE /comments/:id |
| Tags     | GET/POST /tags · PUT/DELETE /tags/:id (admin) |

## Database Schema

8 tables: `users`, `posts`, `tags`, `post_tags`, `comments`, `likes`, `bookmarks`, `refresh_tokens`

Roles: `USER` (default), `ADMIN`  
Post statuses: `DRAFT`, `PUBLISHED`, `ARCHIVED`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string  |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (for avatar uploads) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PORT` | Server port (default 8080) |
| `NODE_ENV` | `development` or `production` |

## Standard Response Format

```json
// Success
{ "success": true, "message": "...", "data": {}, "meta": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

## Running

```bash
pnpm --filter @workspace/api-server run dev   # build + start
pnpm --filter @workspace/api-server run test  # run all 51 integration tests
pnpm --filter @workspace/db run push          # push DB schema (run once on new DB)
```

## Swagger UI

Live at `/api/api-docs` — use the **Authorize** button to paste a Bearer token from `/api/v1/auth/login`, then test any endpoint directly in the browser.

## Notes

- Cloudinary upload endpoints (`POST /users/me/avatar`) require Cloudinary env vars to be set. Without them, a 500 with `"Cloudinary is not configured"` is returned — all other endpoints work without Cloudinary.
- Refresh tokens include a `jti` (JWT ID) random claim to guarantee uniqueness even when generated within the same second.
- Tests run sequentially against the live database and clean up all test data in `afterAll` hooks.
