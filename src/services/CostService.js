const PRICING = require('../config/pricing');

class CostService {
  /**
   * Calculate cost for API calls.
   * @param {number} apiCallCount
   * @returns {number} cost in microcents
   */
  calculateApiCallCost(apiCallCount) {
    return Math.round(apiCallCount * PRICING.api_call.per_call_cents * 100);
  }

  /**
   * Calculate cost for AI token usage.
   * Rules:
   * - input tokens: standard input price
   * - cached input tokens: cheaper input price (not addable with regular input)
   * - output tokens: standard output price
   * - reasoning tokens: billed as output tokens (same price)
   *
   * @param {object} tokenUsage
   * @param {number} tokenUsage.input - regular input tokens
   * @param {number} tokenUsage.cachedInput - cached input tokens (cheaper)
   * @param {number} tokenUsage.output - output tokens
   * @param {number} tokenUsage.reasoning - reasoning tokens (billed as output)
   * @returns {number} total cost in microcents
   */
  calculateTokenCost({ input = 0, cachedInput = 0, output = 0, reasoning = 0 }) {
    const inputCost = Math.round(
      (input / 1000) * PRICING.ai_tokens.input_per_1k_microcents
    );

    const cachedInputCost = Math.round(
      (cachedInput / 1000) * PRICING.ai_tokens.cached_input_per_1k_microcents
    );

    // reasoning tokens count as output tokens
    const outputCost = Math.round(
      ((output + reasoning) / 1000) * PRICING.ai_tokens.output_per_1k_microcents
    );

    return inputCost + cachedInputCost + outputCost;
  }

  /**
   * Calculate total monthly cost for a tenant.
   * @param {number} apiCallCount
   * @param {number} tokenCount - total tokens (simplified: all treated as output)
   * @returns {{ apiCallCost: number, tokenCost: number, totalMicrocents: number, totalCents: number }}
   */
  calculateMonthlyCost(apiCallCount, tokenCount) {
    const apiCallCost = this.calculateApiCallCost(apiCallCount);

    // For simple monthly rollup, treat all recorded tokens as output tokens
    const tokenCost = this.calculateTokenCost({ output: tokenCount });

    const totalMicrocents = apiCallCost + tokenCost;
    const totalCents = Math.round(totalMicrocents / 10000); // convert to cents

    return {
      apiCallCost,
      tokenCost,
      totalMicrocents,
      totalCents,
      totalDollars: (totalCents / 100).toFixed(4),
    };
  }
}

module.exports = new CostService();