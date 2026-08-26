require('dotenv').config();
const CostService = require('../services/CostService');

describe('CostService - Pinned Pricing Tests', () => {

  test('API call cost: 100 calls', () => {
    const cost = CostService.calculateApiCallCost(100);
    expect(cost).toBe(100); // 100 * 0.01 cents * 100 = 100 microcents
  });

  test('Token cost: input only', () => {
    const cost = CostService.calculateTokenCost({ input: 1000 });
    expect(cost).toBe(1500); // 1000/1000 * 1500 = 1500 microcents
  });

  test('Token cost: cached input is cheaper than regular input', () => {
    const regular = CostService.calculateTokenCost({ input: 1000 });
    const cached = CostService.calculateTokenCost({ cachedInput: 1000 });
    expect(cached).toBeLessThan(regular);
    expect(cached).toBe(375); // 75% cheaper
  });

  test('Token cost: reasoning tokens billed as output tokens', () => {
    const outputOnly = CostService.calculateTokenCost({ output: 1000 });
    const reasoningOnly = CostService.calculateTokenCost({ reasoning: 1000 });
    expect(reasoningOnly).toBe(outputOnly); // same price
    expect(reasoningOnly).toBe(6000); // 1000/1000 * 6000 = 6000 microcents
  });

  test('Token cost: categories cannot be added together naively', () => {
    // 1000 cached input + 1000 output ≠ 2000 * output_rate
    const mixed = CostService.calculateTokenCost({
      cachedInput: 1000,
      output: 1000,
    });
    const naiveSum = CostService.calculateTokenCost({ output: 2000 });
    expect(mixed).not.toBe(naiveSum); // they price differently
    expect(mixed).toBe(375 + 6000); // 6375 microcents
  });

  test('Token cost: full breakdown with all categories', () => {
    const cost = CostService.calculateTokenCost({
      input: 1000,
      cachedInput: 1000,
      output: 1000,
      reasoning: 1000,
    });
    // input: 1500 + cached: 375 + output: 6000 + reasoning(as output): 6000
    expect(cost).toBe(1500 + 375 + 6000 + 6000); // 13875
  });

  test('Monthly cost rollup returns correct structure', () => {
    const result = CostService.calculateMonthlyCost(100, 10000);
    expect(result).toHaveProperty('apiCallCost');
    expect(result).toHaveProperty('tokenCost');
    expect(result).toHaveProperty('totalMicrocents');
    expect(result).toHaveProperty('totalCents');
    expect(result).toHaveProperty('totalDollars');
    expect(typeof result.totalDollars).toBe('string');
  });

});