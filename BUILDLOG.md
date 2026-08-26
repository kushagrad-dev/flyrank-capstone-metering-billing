# Build Log — AI Usage

## Where AI helped
- Generated boilerplate for Express route handlers
- Suggested using error code 23505 for Postgres UNIQUE violation detection
- Helped structure the CostService with microcents approach
- Explained DATE_TRUNC('month', NOW()) for monthly usage rollup
- Helped debug the nested directory issue with VS Code terminal

## Where AI was wrong / needed correction
- Initially suggested in-memory Set for webhook deduplication —
  changed to DB-backed approach (processed_webhook_events table)
  because in-memory state resets on server restart
- Suggested STRIPE_WEBHOOK_SECRET could come from dashboard —
  corrected: it comes from the Stripe CLI listener at runtime

## What I changed
- Added DB-backed webhook deduplication instead of in-memory Set
- Fixed test isolation by resetting tenant plan in beforeEach
- Added microcents approach for money math to avoid float errors
- Separated idempotency keys per usage type (key:api_call, key:ai_tokens)
  to handle two usage events from one request correctly

## Key decisions I made myself
- UNIQUE constraint on idempotency_key at DB level (not just app level)
- Webhook route registered before express.json() middleware (raw body needed)
- DATE_TRUNC for automatic monthly reset without a cron job
