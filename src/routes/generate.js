const express = require('express');
const router = express.Router();
const MeterService = require('../services/MeterService');
const QuotaService = require('../services/QuotaService');

/**
 * POST /generate
 * Dummy billable endpoint. Simulates an AI generation request.
 *
 * Headers:
 *   Idempotency-Key: <uuid>  (required)
 *
 * Body:
 *   tenantId: number         (required)
 *   tokens: number           (optional, defaults to 100)
 */
router.post('/', async (req, res) => {
  try {
    const { tenantId, tokens = 100 } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    // 1. Validate inputs
    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing required field: tenantId',
      });
    }

    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing required header: Idempotency-Key',
      });
    }

    if (typeof tokens !== 'number' || tokens <= 0) {
      return res.status(400).json({
        error: 'tokens must be a positive number',
      });
    }

    // 2. Check API call quota (1 call per request)
    const apiQuota = await QuotaService.check(tenantId, 'api_call', 1);
    if (!apiQuota.allowed) {
      return res.status(429).json({
        error: 'API call quota exceeded',
        reason: apiQuota.reason,
        used: apiQuota.used,
        limit: apiQuota.limit,
      });
    }

    // 3. Check token quota
    const tokenQuota = await QuotaService.check(tenantId, 'ai_tokens', tokens);
    if (!tokenQuota.allowed) {
      return res.status(402).json({
        error: 'Token quota exceeded',
        reason: tokenQuota.reason,
        used: tokenQuota.used,
        limit: tokenQuota.limit,
      });
    }

    // 4. Record API call usage (idempotent)
    const apiEvent = await MeterService.record(
      tenantId,
      'api_call',
      1,
      `${idempotencyKey}:api_call`
    );

    // 5. Record token usage (idempotent)
    const tokenEvent = await MeterService.record(
      tenantId,
      'ai_tokens',
      tokens,
      `${idempotencyKey}:ai_tokens`
    );

    // 6. Return result
    // 6. Return result
    return res.status(apiEvent.duplicate ? 200 : 201).json({
        success: true,
        duplicate: apiEvent.duplicate,
        message: apiEvent.duplicate ? 'Duplicate request — no new usage recorded' : 'Generation complete',
        usage: {
            api_calls: {
                used: apiEvent.duplicate ? apiQuota.used : apiQuota.used + 1,
                limit: apiQuota.limit,
            },
            ai_tokens: {
                used: tokenEvent.duplicate ? tokenQuota.used : tokenQuota.used + tokens,
                limit: tokenQuota.limit,
            },
        },
    });

  } catch (err) {
    console.error('POST /generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;