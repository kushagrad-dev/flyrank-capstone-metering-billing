const PLANS = {
  free: {
    name: 'free',
    api_call_limit: 1000,
    token_limit: 100000,
    price_cents: 0,
  },
  pro: {
    name: 'pro',
    api_call_limit: 10000,
    token_limit: 1000000,
    price_cents: 2999,
  },
};

module.exports = PLANS;