const express = require('express');
const router = express.Router();
const pool = require('../db');
const MeterService = require('../services/MeterService');
const CostService = require('../services/CostService');

router.get('/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);

    if (isNaN(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenantId' });
    }

    const tenantResult = await pool.query(
      `SELECT t.*, p.name as plan_name, p.api_call_limit, p.token_limit
       FROM tenants t
       JOIN plans p ON t.plan_id = p.id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantResult.rowCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = tenantResult.rows[0];

    const apiCallsUsed = await MeterService.getMonthlyUsage(tenantId, 'api_call');
    const tokensUsed = await MeterService.getMonthlyUsage(tenantId, 'ai_tokens');

    const cost = CostService.calculateMonthlyCost(apiCallsUsed, tokensUsed);

    return res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan_name,
      },
      usage: {
        api_calls: {
          used: apiCallsUsed,
          limit: tenant.api_call_limit,
          remaining: tenant.api_call_limit - apiCallsUsed,
        },
        ai_tokens: {
          used: tokensUsed,
          limit: tenant.token_limit,
          remaining: tenant.token_limit - tokensUsed,
        },
      },
      cost: {
        api_calls_microcents: cost.apiCallCost,
        tokens_microcents: cost.tokenCost,
        total_microcents: cost.totalMicrocents,
        total_cents: cost.totalCents,
        total_dollars: cost.totalDollars,
      },
    });

  } catch (err) {
    console.error('GET /usage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
