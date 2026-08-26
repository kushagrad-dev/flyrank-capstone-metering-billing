// Pricing constants — pinned so tests can verify exact values
// All prices in microcents (1/1,000,000 of a dollar) to avoid float math
// Based on Gemini-style AI token pricing rules from capstone spec

const PRICING = {
  // Per 1,000 tokens
  api_call: {
    per_call_cents: 0.01, // $0.0001 per API call (stored as cents * 100)
  },
  ai_tokens: {
    input_per_1k_microcents: 1500,          // $0.000015 per token
    cached_input_per_1k_microcents: 375,    // $0.00000375 per token (75% cheaper)
    output_per_1k_microcents: 6000,         // $0.00006 per token
    // reasoning tokens = output tokens (same price, different category)
  },
};

module.exports = PRICING;