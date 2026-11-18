# Backend development

The frontend runs on port `8000`; the API runs on port `8001` and is proxied through `/api` by Vite.

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL database you control. Set `SESSION_SECRET`, `ADMIN_BOOTSTRAP_TOKEN`, and `PAYFAST_ENCRYPTION_SECRET` to separate random values.
2. From the repository root, apply the Drizzle schema with `corepack pnpm --filter @workspace/db run push`.
3. In one terminal, start the API with `corepack pnpm --filter @workspace/api-server run dev`.
4. In another terminal, start the UI with `corepack pnpm --filter @workspace/sa-ticketing run dev`.

Create the first platform administrator once with `POST /api/auth/bootstrap-admin` and a JSON body containing `{ "token", "name", "email", "password" }`. The endpoint is disabled when `ADMIN_BOOTSTRAP_TOKEN` is absent and shuts itself off after the first administrator is created.

The API stores account passwords as scrypt hashes and uses opaque, signed, HTTP-only session cookies. Production deployment must provide a managed PostgreSQL database, a strong session secret, HTTPS, and provider credentials through deployment secrets. PayFast payment credentials must be configured separately per organiser; no merchant credentials or real payment confirmations are stored in the browser.
