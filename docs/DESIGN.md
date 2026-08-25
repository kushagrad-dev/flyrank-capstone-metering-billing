# Design Doc — Usage Metering & Billing Engine

## Problem
Every SaaS needs to answer: how much has this tenant used, what does it cost,
and have they hit their plan limit? This service answers all three.

## Scope
- 2 plans: Free (1,000 API calls / 100k tokens/month) and Pro (higher limits)
- 2 usage types: api_call, ai_tokens
- 1 dummy billable endpoint: POST /generate

## Data Model
plans            → plan definitions with quota limits
tenants          → customer organizations, each on a plan
subscriptions    → mirrors Stripe subscription state per tenant
usage_events     → one row per billable action (idempotency_key UNIQUE)

## API Surface
POST /generate           → record usage + enforce quota
GET  /usage/:tenantId    → rollup { used, limit, cost }
POST /checkout           → create Stripe Checkout session
POST /webhooks/stripe    → handle Stripe events

## Idempotency Strategy
Client sends Idempotency-Key header (UUID) with every billable request.
Server attempts INSERT into usage_events with that key.
UNIQUE constraint on idempotency_key → duplicate = return original result, no new row.
Double-counting is impossible at the DB level.

## Non-Goals
No invoicing, proration, or overage billing.
Stripe test mode only — no real money moves.
No frontend.