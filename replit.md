# TokiMail — Disposable Email SaaS Template

## Overview

Full-stack temporary email service built on Cloudflare Email Routing. No IMAP required. Designed as a **multi-tenant SaaS template** — each tenant self-hosts with their own domain(s) and branding, configured entirely via environment variables.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite (Wouter routing, TanStack React Query)
- **Build**: esbuild (CJS bundle)
- **Email routing**: Cloudflare Email Routing + Custom Email Worker

## Features

- Multi-domain support (filtered per tenant via `ALLOWED_DOMAINS`)
- Random & custom email address generation
- Inbox with auto-refresh every 15 seconds
- OTP auto-detection with one-click copy
- HTML and plain text email rendering (with clickable links)
- REST API with API key authentication
- Fully configurable branding (name, tagline) via env vars
- Auto-creates mailboxes when email arrives (no pre-registration needed)

## Environment Variables (all configurable per tenant)

### Branding
| Variable | Default | Description |
|---|---|---|
| `APP_NAME` | `TokiMail` | Brand name shown throughout the UI |
| `APP_TAGLINE` | `Disposable email. Instant. Private.` | Subtitle shown on docs/keys pages |

### Email & Domain
| Variable | Description |
|---|---|
| `MAIL_DOMAIN` | Fallback domain if no Cloudflare token or ALLOWED_DOMAINS |
| `ALLOWED_DOMAINS` | Comma-separated list of allowed domains, e.g. `mail.acme.com,temp.acme.io` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token — fetches active zones automatically |
| `WEBHOOK_SECRET` | Secret shared between Cloudflare Worker and this API |

### System
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API server port (default: varies by environment) |

### Domain resolution logic
1. If `ALLOWED_DOMAINS` set + `CLOUDFLARE_API_TOKEN` set → fetch CF zones, filter to allowed list
2. If `ALLOWED_DOMAINS` set but no CF token → use the list directly (no CF API call)
3. If only CF token → return all active zones from Cloudflare account
4. Fallback → use `MAIL_DOMAIN` (single domain)

## Cloudflare Email Worker Setup

The file `cloudflare-email-worker.js` in the project root is the Worker script.

**Per-domain setup (repeat for each domain):**
1. Cloudflare Dashboard → Workers & Pages → Create Worker → paste `cloudflare-email-worker.js`
2. Worker Settings → Variables & Secrets:
   - `WEBHOOK_SECRET`: same as server `WEBHOOK_SECRET`
   - `API_URL`: `https://your-deployed-app.com/api/inbound`
3. Cloudflare Dashboard → select domain → Email → Email Routing → Routes
4. Catch-all → Send to Worker → select the Worker above

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | App branding config (name, tagline) |
| GET | `/api/domains` | List allowed/active domains |
| GET | `/api/mailboxes` | List all mailboxes |
| POST | `/api/mailboxes` | Create custom mailbox |
| POST | `/api/mailboxes/generate` | Generate random mailbox |
| GET | `/api/mailboxes/:address` | Get mailbox info |
| DELETE | `/api/mailboxes/:address` | Delete mailbox |
| GET | `/api/mailboxes/:address/messages` | List messages |
| GET | `/api/mailboxes/:address/messages/:id` | Get message detail |
| DELETE | `/api/mailboxes/:address/messages/:id` | Delete message |
| PATCH | `/api/mailboxes/:address/messages/:id/read` | Mark as read |
| GET | `/api/keys` | List API keys |
| POST | `/api/keys` | Create API key |
| DELETE | `/api/keys/:id` | Delete API key |
| POST | `/api/inbound` | Cloudflare Worker webhook |
| GET | `/api/stats` | Service statistics |
| GET | `/api/healthz` | Health check |

## Database Schema

- `mailboxes` — email addresses with metadata (auto-created on first inbound email)
- `messages` — incoming emails (from, subject, body_text, body_html, is_read)
- `api_keys` — API keys (stored as SHA-256 hashes, prefix `tmk_`)

## Architecture

```
Cloudflare Email Routing (per domain)
  └── Email Worker (cloudflare-email-worker.js)
        └── POST /api/inbound (secured by WEBHOOK_SECRET)
              └── Express API Server
                    └── PostgreSQL (Drizzle ORM)
                          ↑
                    React Frontend (TanStack Query, 15s auto-refresh)
```
