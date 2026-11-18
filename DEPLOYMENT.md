# Mzansi Event Hub — Deployment Guide

This guide covers running Mzansi Event Hub locally for in-house testing and deploying it to Render for a public beta.

## Prerequisites

- **Node.js** 24.x (pinned via the root `package.json` `engines` field and enforced by `.npmrc` `engine-strict=true`)
- **pnpm** 10+ (pinned via `packageManager`: `pnpm@10.32.1`)
- **PostgreSQL** 14+ (local install or a hosted database)
- **Resend account** (free) at [resend.com](https://resend.com) — for sending emails
- **Render account** (free) at [render.com](https://render.com) — for deployment

---

## 1. Local Development (In-House Testing)

### 1.1 Install dependencies

```bash
pnpm install
```

### 1.2 Set up PostgreSQL

Create a database named `mzansi_events`:

```bash
# Using psql (adjust path to your PostgreSQL install)
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -U postgres -c "CREATE DATABASE mzansi_events;"
```

Or use pgAdmin / your preferred Postgres GUI.

### 1.3 Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
copy .env.example .env
```

Edit `.env` with your settings:

| Variable | Local Value | Notes |
|----------|-------------|-------|
| `DATABASE_URL` | `postgresql://postgres@127.0.0.1:5432/mzansi_events` | Your Postgres connection string |
| `SESSION_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` | Must be 32+ chars |
| `ADMIN_BOOTSTRAP_TOKEN` | Generate a 32+ char token | Used once to create the first admin |
| `PAYFAST_ENCRYPTION_SECRET` | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` | Encrypts organiser PayFast credentials |
| `PAYFAST_NOTIFY_URL` | `http://localhost:8001/api/payments/payfast/itn` | PayFast callback URL |
| `RESEND_API_KEY` | Your `re_xxx` key from [resend.com](https://resend.com) | Free tier: 3,000 emails/month, 100/day |
| `EMAIL_FROM` | `Out There ZA <onboarding@resend.dev>` | Without a domain, use `onboarding@resend.dev` |
| `WEB_ORIGIN` | `http://localhost:8000` | Frontend URL |
| `PORT` | `8001` | API server port |

### 1.4 Apply database schema

```bash
# Set DATABASE_URL in your shell, then push the schema:
$env:DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/mzansi_events"
pnpm --filter @workspace/db run push
```

### 1.5 Build and start the API server

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

The API server runs at `http://localhost:8001`. Verify it's healthy:

```bash
curl http://localhost:8001/api/healthz
# Expected: {"status":"ok","checks":{"database":"up","email":"configured",...}}
```

### 1.6 Start the frontend

In a separate terminal:

```bash
pnpm --filter @workspace/sa-ticketing run dev
```

The frontend runs at `http://localhost:8000` and proxies `/api/*` to the API server.

### 1.7 Create the first admin account

```bash
curl -X POST http://localhost:8001/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ADMIN_BOOTSTRAP_TOKEN",
    "name": "Platform Admin",
    "email": "admin@yourdomain.co.za",
    "password": "A_SECURE_PASSWORD_MIN_12_CHARS"
  }'
```

This endpoint only works once — after the first admin is created, it returns 410.

### 1.8 Sign in as admin

Go to `http://localhost:8000`, click "Sign in", and use the admin credentials you just created. You'll be redirected to the admin dashboard at `/admin`.

---

## 2. Email Testing Without a Domain

Resend's free tier without a verified domain can only send emails **to your own account email** from `@resend.dev`. For in-house testing:

1. **Use your Resend account email** when registering test users. Emails will arrive in your inbox.
2. **View all sent emails** at `http://localhost:8000/admin/emails` — the admin email outbox shows every email the system tried to send, with full HTML content, regardless of whether Resend delivered it.
3. **View sent emails in Resend dashboard** at [resend.com/emails](https://resend.com/emails) — shows delivery status, opens, clicks.

### Adding a domain later (for sending to any email)

1. Add a domain in the [Resend dashboard](https://resend.com/domains).
2. Add the DNS records (DKIM, SPF) to your domain's DNS provider.
3. Wait for verification (up to 72 hours).
4. Update `EMAIL_FROM` in `.env` to `Out There ZA <tickets@yourdomain.co.za>`.
5. No code changes needed — everything works automatically.

---

## 3. Testing the Full Workflow

### 3.1 As a Customer

1. Register a new account at `/sign-in` (Create account tab).
2. Browse the marketplace at `/`.
3. Click an event → select a ticket category → "Continue to PayFast".
4. Complete the PayFast sandbox payment (use test card details from PayFast docs).
5. Check your email (or `/admin/emails`) for the ticket confirmation.
6. View your tickets at `/account/tickets`.

### 3.2 As an Organiser

1. Sign in as the customer from above.
2. Go to `/organiser/apply`.
3. Upload an identity document (PDF/JPG/PNG) and business document (if business type).
4. Accept the declarations and submit.
5. Check `/organiser/verification` — you'll see "Under review".
6. Check your email — you should receive a submission confirmation.

### 3.3 As an Admin (Reviewing)

1. Sign in as admin at `/admin`.
2. Go to "Organiser Applications" (`/admin/applications`).
3. Click "Review" on a pending application.
4. Choose "Approve", add a review note, and submit.
5. The organiser receives an approval email.
6. Go to "Onboarding Payments" (`/admin/onboarding`).
7. Mark the organiser's onboarding payment as "Paid" with a reconciliation reference.
8. The organiser receives a "payment confirmed" email and can now create events.

### 3.4 Event Approval Flow

1. As the organiser (approved + paid), create an event at `/organiser/create`.
2. Submit it for review.
3. As admin, go to "Event Applications" (`/admin/approvals`).
4. Approve the event → the organiser gets an "approved" email.
5. Publish the event → the organiser gets a "published" email.
6. The event now appears on the public marketplace.

### 3.5 Password Reset

1. On the sign-in page, click "Forgot password?".
2. Enter your email → you receive a reset link (valid for 1 hour).
3. Click the link → enter a new password.
4. Sign in with the new password. All previous sessions are invalidated.

---

## 4. Deploying to Render

The production deployment is a **single Node web service** that serves both the API (`/api/*`) and the built React frontend (static assets + SPA fallback). This is cheaper and simpler than running two services, and it is what a "New → Web Service from repo" deploy produces.

### 4.1 Prepare the Repository

1. Push your code to a GitHub/GitLab repository.
2. Ensure `render.yaml`, `.npmrc`, and `pnpm-lock.yaml` are committed (they are).
3. Ensure `.env` is in `.gitignore` (never commit secrets).

### 4.2 Create a PostgreSQL Database

1. In the Render dashboard, create a new **PostgreSQL** database.
2. Copy the **Internal Database URL** (e.g., `postgresql://user:pass@dpg-xxx/dbname`).

### 4.3 Create the Web Service

1. In the Render dashboard, click **New → Web Service** and connect your repository.
2. Use these settings:

   | Setting | Value |
   |---------|-------|
   | Runtime | Node |
   | Build Command | `pnpm install --frozen-lockfile && pnpm run build` |
   | Start Command | `pnpm run start` |
   | Health Check Path | `/api/healthz` |

   The `pnpm run start` script now **auto-applies the DB schema** (it runs `pnpm --filter @workspace/db run push-force` before booting the server). This is **idempotent** — it creates the tables on a fresh database and is a fast no-op on every subsequent deploy/restart. You do **not** need to apply the schema manually.

3. Add the environment variables:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | The Internal Database URL from step 4.2 |
   | `SESSION_SECRET` | A 32+ char random string |
   | `ADMIN_BOOTSTRAP_TOKEN` | A 32+ char random string |
   | `PAYFAST_ENCRYPTION_SECRET` | A 32+ char random string |
   | `PAYFAST_NOTIFY_URL` | `https://<your-service>.onrender.com/api/payments/payfast/itn` |
   | `RESEND_API_KEY` | Your `re_xxx` key |
   | `EMAIL_FROM` | `Out There ZA <onboarding@resend.dev>` (or a verified domain) |
   | `WEB_ORIGIN` | `https://<your-service>.onrender.com` |
   | `PRIVATE_DOCUMENTS_DIR` | `/var/data/private-documents` (requires a disk, see note) |

   Render injects `PORT` automatically; the server reads `process.env.PORT` and binds to `0.0.0.0`.

   > **Disk note:** persistent organiser verification documents need a Render **disk** mounted at `/var/data`, which requires a paid instance. On the free plan the service still runs, but uploaded documents are lost on restart.

4. Click **Create Web Service**. Render runs the build, applies the schema, and boots the server.

### 4.4 (Optional) Apply Database Schema Manually

The start command already applies the schema, so this is only needed if you prefer to run it yourself (e.g. from the Render **Shell** tab):

```bash
pnpm --filter @workspace/db run push-force
```

Or run it locally against the Render database's **External Database URL** (if enabled):

```bash
$env:DATABASE_URL = "postgresql://user:pass@dpg-xxx.render.com/dbname"
pnpm --filter @workspace/db run push-force
```

### 4.5 Create the First Admin

After the service is live:

```bash
curl -X POST https://<your-service>.onrender.com/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_ADMIN_BOOTSTRAP_TOKEN",
    "name": "Platform Admin",
    "email": "admin@yourdomain.co.za",
    "password": "A_SECURE_PASSWORD_MIN_12_CHARS"
  }'
```

### 4.6 Verify Deployment

1. Check `https://<your-service>.onrender.com/api/healthz` — should return `{"status":"ok","checks":{...}}`.
2. Open `https://<your-service>.onrender.com` — should show the marketplace.
3. Sign in as admin — should redirect to `/admin`.

---

## 5. Production Checklist

### Security

- [ ] `SESSION_SECRET` is a long random string (32+ chars), not the default.
- [ ] `ADMIN_BOOTSTRAP_TOKEN` is a long random string, not the default.
- [ ] `PAYFAST_ENCRYPTION_SECRET` is a long random string, not the default.
- [ ] `.env` is in `.gitignore` and never committed.
- [ ] `NODE_ENV=production` is set on the API server.
- [ ] CORS is restricted to `WEB_ORIGIN` (automatic in production).
- [ ] Helmet security headers are enabled (automatic).
- [ ] API rate limiting is active: 100 requests/minute (automatic).
- [ ] Database connection uses SSL (Render provides this automatically).

### Email

- [ ] `RESEND_API_KEY` is set and valid.
- [ ] `EMAIL_FROM` uses a verified domain (or `onboarding@resend.dev` for testing).
- [ ] Test welcome email: register a new account and check inbox.
- [ ] Test ticket delivery: complete a purchase and check inbox.
- [ ] Test password reset: request a reset and check inbox.
- [ ] Check `/admin/emails` for the email outbox.

### Payments

- [ ] `PAYFAST_NOTIFY_URL` is a public HTTPS URL (not localhost).
- [ ] `PAYFAST_ENCRYPTION_SECRET` matches the value used when organiser credentials were encrypted.
- [ ] Test organiser can save PayFast settings at `/organiser/payments`.
- [ ] Test checkout flow with PayFast sandbox credentials.

### Database

- [ ] All tables exist (run `drizzle-kit push` or verify with `\dt`).
- [ ] `ticketing_password_resets` table exists.
- [ ] `ticketing_email_outbox` table exists.
- [ ] Database has persistent storage (Render disk or managed Postgres).

### General

- [ ] Health check at `/api/healthz` returns `"status":"ok"`.
- [ ] Frontend loads at the root URL.
- [ ] API reachable at `/api/*` from the frontend.
- [ ] Admin can log in and see the dashboard.
- [ ] Organiser can apply, get approved, and create events.
- [ ] Customer can browse, buy tickets, and receive email.
- [ ] Password reset flow works end-to-end.

---

## 6. Troubleshooting

### "Administrator access required" error

- The API server may have lost its database connection. Check `/api/healthz`.
- Restart the API server.
- Verify `DATABASE_URL` is correct and the database is running.

### Emails not arriving

- Check `/admin/emails` — if status is `provider_not_configured`, `RESEND_API_KEY` is missing.
- If status is `failed`, check the error message — it may be a Resend API error (invalid key, quota exceeded).
- Without a verified domain, Resend only sends to your account email. Use your Resend account email for testing.
- Check the [Resend dashboard](https://resend.com/emails) for delivery logs.

### PayFast ITN not received

- `PAYFAST_NOTIFY_URL` must be a public HTTPS URL. PayFast cannot reach localhost.
- For local testing, use a tunneling service like ngrok: `ngrok http 8001` and set `PAYFAST_NOTIFY_URL` to the ngrok URL.
- Check the API server logs for ITN requests.

### Database connection lost after restart

- This is common with free-tier Render services that sleep. The first request after wake-up may fail.
- The API server handles this gracefully — subsequent requests succeed.
- For production, use a paid Render instance that doesn't sleep.

### Port already in use

```bash
# Find the process using port 8001
Get-NetTCPConnection -LocalPort 8001 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

---

## 7. Architecture Overview

```
        Single Node web service (one process, one port)
        ┌───────────────────────────────────────────────┐
        │  Express app (artifacts/api-server)            │
        │   /api/*  → API routes (business logic)         │
        │   /*      → static React build + SPA fallback    │
        │             (artifacts/sa-ticketing/dist/public) │
        └───────────────────────┬───────────────────────┘
                                │
                          PostgreSQL
                                │
                    ┌───────────┴───────────┐
                    │                       │
              Resend API               PayFast
              (email)                  (payments)
```

- **Single service**: one Express process serves both the JSON API (`/api/*`) and the built React SPA (static assets with an `index.html` fallback for client-side routes). The frontend is built by Vite into `artifacts/sa-ticketing/dist/public` during `pnpm run build`.
- **Local dev** runs them separately: Vite dev server on `:8000` proxies `/api/*` to the API server on `:8001`.
- **API Server**: Express 5, handles all business logic, talks to PostgreSQL.
- **Database**: PostgreSQL via Drizzle ORM. Schema is in `lib/db/src/schema/ticketing.ts`. Applied with `drizzle-kit push` (automatically on Render start).
- **Email**: Resend API. All emails are also recorded in `ticketing_email_outbox` for admin review.
- **Payments**: PayFast sandbox/live. Organiser credentials are encrypted with AES-256-GCM.