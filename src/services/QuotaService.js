const pool = require('../db');
const PLANS = require('../config/plans');
const MeterService = require('./MeterService');

class QuotaService {
  /**
   * Check if a tenant is allowed to use the requested quantity.
   * 
   * @param {number} tenantId
   * @param {'api_call'|'ai_tokens'} type
   * @param {number} requested - how much they want to use
   * @returns {{ allowed: boolean, used: number, limit: number, remaining: number, reason?: string }}
   */
  async check(tenantId, type, requested) {
    // 1. Get tenant's current plan
    const tenantResult = await pool.query(
      `SELECT t.*, p.name as plan_name, p.api_call_limit, p.token_limit
       FROM tenants t
       JOIN plans p ON t.plan_id = p.id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantResult.rowCount === 0) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const tenant = tenantResult.rows[0];

    // 2. Get the limit for this usage type
    const limit = type === 'api_call'
      ? tenant.api_call_limit
      : tenant.token_limit;

    // 3. Get current monthly usage
    const used = await MeterService.getMonthlyUsage(tenantId, type);

    // 4. Check if adding requested would exceed limit
    const remaining = limit - used;
    const allowed = (used + requested) <= limit;

    if (!allowed) {
      return {
        allowed: false,
        used,
        limit,
        remaining,
        reason: remaining === 0
          ? `You have reached your monthly ${type} limit of ${limit}. Please upgrade to Pro.`
          : `This request requires ${requested} ${type}s but you only have ${remaining} remaining.`,
      };
    }

    return { allowed: true, used, limit, remaining };
  }
}

module.exports = new QuotaService();