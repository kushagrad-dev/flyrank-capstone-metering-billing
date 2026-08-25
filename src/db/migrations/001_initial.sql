-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  api_call_limit INTEGER NOT NULL,
  token_limit INTEGER NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage events table
CREATE TABLE IF NOT EXISTS usage_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('api_call', 'ai_tokens')),
  quantity INTEGER NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast rollup queries
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_id ON usage_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(type);

-- Seed the two plans
INSERT INTO plans (name, api_call_limit, token_limit, price_cents)
VALUES
  ('free', 1000, 100000, 0),
  ('pro', 10000, 1000000, 2999)
ON CONFLICT (name) DO NOTHING;