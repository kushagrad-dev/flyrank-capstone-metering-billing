require('dotenv').config();
const pool = require('../db');
const MeterService = require('../services/MeterService');

// Clean up usage_events before each test so tests don't affect each other
beforeEach(async () => {
  await pool.query('DELETE FROM usage_events');
});

// Close the DB pool after all tests finish
afterAll(async () => {
  await pool.end();
});

describe('MeterService - Idempotency', () => {

  test('records a new usage event on first call', async () => {
    const result = await MeterService.record(1, 'api_call', 1, 'unique-key-001');

    expect(result.duplicate).toBe(false);
    expect(result.event.tenant_id).toBe(1);
    expect(result.event.type).toBe('api_call');
    expect(result.event.quantity).toBe(1);
    expect(result.event.idempotency_key).toBe('unique-key-001');
  });

  test('returns original event on duplicate key — no new row created', async () => {
    const first = await MeterService.record(1, 'api_call', 1, 'duplicate-key-001');
    expect(first.duplicate).toBe(false);

    const second = await MeterService.record(1, 'api_call', 1, 'duplicate-key-001');
    expect(second.duplicate).toBe(true);

    expect(second.event.id).toBe(first.event.id);
    expect(second.event.created_at).toEqual(first.event.created_at);

    const rows = await pool.query('SELECT * FROM usage_events');
    expect(rows.rowCount).toBe(1);
  });

  test('different keys create different events', async () => {
    await MeterService.record(1, 'api_call', 1, 'key-A');
    await MeterService.record(1, 'api_call', 1, 'key-B');

    const rows = await pool.query('SELECT * FROM usage_events');
    expect(rows.rowCount).toBe(2);
  });

  test('getMonthlyUsage sums correctly', async () => {
    await MeterService.record(1, 'api_call', 5, 'sum-key-001');
    await MeterService.record(1, 'api_call', 3, 'sum-key-002');

    const total = await MeterService.getMonthlyUsage(1, 'api_call');
    expect(total).toBe(8);
  });

  test('getMonthlyUsage does not double count on retry', async () => {
    await MeterService.record(1, 'api_call', 10, 'no-double-key');
    await MeterService.record(1, 'api_call', 10, 'no-double-key');

    const total = await MeterService.getMonthlyUsage(1, 'api_call');
    expect(total).toBe(10);
  });

}); // ← MeterService describe closes here

describe('QuotaService - Enforcement', () => {
  const QuotaService = require('../services/QuotaService');

  beforeEach(async () => {
    await pool.query('DELETE FROM usage_events');
  });

  test('allows request when under limit', async () => {
    const result = await QuotaService.check(1, 'api_call', 1);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(1000);
  });

  test('allows request at exactly the limit boundary', async () => {
    for (let i = 0; i < 999; i++) {
      await MeterService.record(1, 'api_call', 1, `boundary-key-${i}`);
    }

    const result = await QuotaService.check(1, 'api_call', 1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  test('rejects request that would exceed limit', async () => {
    for (let i = 0; i < 1000; i++) {
      await MeterService.record(1, 'api_call', 1, `over-key-${i}`);
    }

    const result = await QuotaService.check(1, 'api_call', 1);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBeDefined();
  });

  test('rejected response includes a clear reason message', async () => {
    for (let i = 0; i < 1000; i++) {
      await MeterService.record(1, 'api_call', 1, `msg-key-${i}`);
    }

    const result = await QuotaService.check(1, 'api_call', 1);
    expect(result.allowed).toBe(false);
    expect(typeof result.reason).toBe('string');
    expect(result.reason.length).toBeGreaterThan(10);
  });

}); // ← QuotaService describe closes here