const pool = require('../db');

class MeterService {
  /**
   * Record a usage event for a tenant.
   * Idempotent: same idempotency_key = return original result, no new row.
   *
   * @param {number} tenantId
   * @param {'api_call'|'ai_tokens'} type
   * @param {number} quantity
   * @param {string} idempotencyKey - UUID sent by the client
   * @returns {{ event: object, duplicate: boolean }}
   */
  async record(tenantId, type, quantity, idempotencyKey) {
    try {
      const result = await pool.query(
        `INSERT INTO usage_events (tenant_id, type, quantity, idempotency_key)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, type, quantity, idempotencyKey]
      );

      return { event: result.rows[0], duplicate: false };

    } catch (err) {
      // Postgres unique violation code = 23505
      // This means the idempotency key already exists → duplicate request
      if (err.code === '23505') {
        const existing = await pool.query(
          `SELECT * FROM usage_events WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        return { event: existing.rows[0], duplicate: true };
      }

      throw err;
    }
  }

  /**
   * Get total usage for a tenant in the current calendar month.
   *
   * @param {number} tenantId
   * @param {'api_call'|'ai_tokens'} type
   * @returns {number} total quantity used
   */
  async getMonthlyUsage(tenantId, type) {
    const result = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total
       FROM usage_events
       WHERE tenant_id = $1
         AND type = $2
         AND created_at >= DATE_TRUNC('month', NOW())`,
      [tenantId, type]
    );

    return parseInt(result.rows[0].total, 10);
  }
}

module.exports = new MeterService();