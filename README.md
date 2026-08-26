# Usage Metering & Billing Engine

A backend service that answers the three questions every SaaS needs:
**How much has this customer used? What does it cost? Have they hit their limit?**

## Architecture

Client → POST /generate
└─► QuotaService.check() → 429/402 if exceeded
└─► MeterService.record() → idempotent usage event (UNIQUE key)

GET /usage/:tenantId → rollup { used, limit, cost }

Stripe Checkout → subscription created
Stripe Webhook → verify signature → deduplicate → update tenant plan


## Stack
- Node.js + Express
- PostgreSQL (Docker)
- Stripe test mode
- Jest

## Setup

1. Clone and install: `git clone https://github.com/kushagrad-dev/flyrank-capstone-metering-billing && npm install`
2. Copy env file: `cp .env.example .env` and add your Stripe test keys
3. Start Postgres: `docker compose up -d`
4. Run migrations: `npm run migrate`
5. Start server: `npm run dev`

## Seed Data

```bash
docker exec -it metering_db psql -U postgres -d metering_billing -c \
  "INSERT INTO tenants (name, plan_id) VALUES ('Test Corp', 1);"
```

## Run Tests

```bash
npm test
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /generate | Billable endpoint (requires Idempotency-Key header) |
| GET | /usage/:tenantId | Monthly usage rollup with cost |
| POST | /checkout | Create Stripe Checkout session |
| POST | /webhooks/stripe | Stripe webhook handler |

## Limitations
- Stripe test mode only — no real money moves
- No invoicing, proration, or overage billing
- No frontend



