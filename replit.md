# TempMail - tokito.me

## Overview

Full-stack temporary email service using the custom domain `tokito.me` via Cloudflare Email Routing. No IMAP required — all email routing is done through Cloudflare Email Workers.

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

- Generate random email addresses at `*@tokito.me`
- Custom email address creation
- Inbox view with auto-refresh (every 15 seconds)
- HTML and plain text email rendering
- REST API with API key authentication
- API documentation page
- Service statistics dashboard

## Domain

`tokito.me` — set via `MAIL_DOMAIN` environment variable

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Environment Variables

- `MAIL_DOMAIN` — Domain to use for email addresses (set to `tokito.me`)
- `WEBHOOK_SECRET` — Secret key shared between Cloudflare Email Worker and API server

## Cloudflare Email Worker Setup

The file `cloudflare-email-worker.js` in the project root is the Cloudflare Worker script.

**Setup steps:**
1. Go to Cloudflare Dashboard → Workers & Pages → Create a Worker
2. Paste the contents of `cloudflare-email-worker.js`
3. Set Worker environment variables:
   - `WEBHOOK_SECRET`: Same value as `WEBHOOK_SECRET` in this project
   - `API_URL`: `https://yourapp.replit.app/api/inbound`
4. Go to Email → Email Routing → Routes
5. Add a **Catch-all** rule → "Send to Worker" → select your deployed Worker

## API Endpoints

All endpoints at `/api/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/mailboxes` | List all mailboxes |
| POST | `/mailboxes` | Create mailbox (custom localPart) |
| POST | `/mailboxes/generate` | Generate random mailbox |
| GET | `/mailboxes/:address` | Get mailbox info |
| DELETE | `/mailboxes/:address` | Delete mailbox |
| GET | `/mailboxes/:address/messages` | List messages |
| GET | `/mailboxes/:address/messages/:id` | Get message detail |
| DELETE | `/mailboxes/:address/messages/:id` | Delete message |
| PATCH | `/mailboxes/:address/messages/:id/read` | Mark as read |
| GET | `/keys` | List API keys |
| POST | `/keys` | Create API key |
| DELETE | `/keys/:id` | Delete API key |
| POST | `/inbound` | Cloudflare Worker webhook |
| GET | `/stats` | Service statistics |

## Database Schema

- `mailboxes` — email addresses with metadata
- `messages` — incoming emails (from, subject, body_text, body_html)
- `api_keys` — API keys (stored as SHA-256 hashes)

## Architecture

```
Cloudflare Email Routing
  └── Email Worker (cloudflare-email-worker.js)
        └── POST /api/inbound → Express API Server
              └── PostgreSQL (stores messages)
                    ↑
              React Frontend (reads via REST API)
```

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
