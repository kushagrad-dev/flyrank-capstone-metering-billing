# Evidence — Definition of Done

## Metering
**Idempotency test passes — double-counting impossible:**
Test: "getMonthlyUsage does not double count on retry" — PASS
Same idempotency key sent twice → usage = 10, not 20.

**Duplicate request returns original event:**
Test: "returns original event on duplicate key — no new row created" — PASS
Second call returns duplicate: true, same event ID, DB has exactly 1 row.

## Quotas
**Quota boundary enforced:**
Test: "rejects request that would exceed limit" — PASS
At 1000/1000 API calls → allowed: false, remaining: 0, reason message present.

**Correct status codes:**
POST /generate with exceeded quota → 429 with clear reason message.

## Cost Calculation
**Pinned pricing tests:**
- cached input tokens cheaper than regular: PASS (375 vs 1500 microcents per 1k)
- reasoning tokens = output tokens: PASS (6000 microcents per 1k)
- categories cannot be naively added: PASS (mixed cost ≠ naive sum)
- full breakdown 1k each: PASS (13875 microcents)

**GET /usage includes cost:**
curl http://localhost:3000/usage/1 → returns cost.total_dollars field.

## Stripe Integration
**Checkout flips tenant Free → Pro:**
POST /checkout → Stripe session created → webhook fired →
tenant plan_id updated to Pro → GET /usage shows limit: 10000.

**Forged webhook rejected:**
curl with fake stripe-signature → 400 status code.

**Duplicate webhook ignored:**
stripe events resend <evt_id> twice → server logs "Duplicate event ignored"
second time, DB processed_webhook_events table prevents reprocessing.

## Data Model
4 tables created: plans, tenants, subscriptions, usage_events.
Plus processed_webhook_events for webhook deduplication.
Tenant data isolated by tenant_id foreign key on all tables.

## Tests
npm test → 16/16 passing.
Covers: idempotency, quota boundaries, cost math, duplicate prevention.

## Documentation
README.md — setup instructions present.
Architecture described in docs/DESIGN.md.
