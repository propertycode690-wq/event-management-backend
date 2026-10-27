const db = require('../db');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

// In-memory idempotency cache for processed webhook event IDs
const processedWebhookEvents = new Set();

/**
 * Determines whether live or sandbox Clover API credentials are truly configured.
 * Rejects empty strings, default placeholders, or dummy token values.
 */
const isCloverConfigured = () => {
  const apiKey = (process.env.CLOVER_API_KEY || '').trim();
  const merchantId = (process.env.CLOVER_MERCHANT_ID || '').trim();

  if (!apiKey || !merchantId) return false;
  const lowerKey = apiKey.toLowerCase();
  if (
    lowerKey === 'your_clover_api_key_here' ||
    lowerKey.includes('placeholder') ||
    lowerKey.includes('dummy') ||
    lowerKey.startsWith('your_') ||
    apiKey === 'clover_live_526695041883_token'
  ) {
    return false;
  }
  const lowerMerchant = merchantId.toLowerCase();
  if (
    lowerMerchant === 'your_clover_merchant_id_here' ||
    lowerMerchant.includes('placeholder') ||
    lowerMerchant.startsWith('your_')
  ) {
    return false;
  }
  return true;
};

/**
 * Executes an HTTPS REST request to the Clover Ecommerce API.
 * Enforces strict environment separation so sandbox mode never silently falls back to production,
 * and production endpoints can never be contacted accidentally during test/dev.
 */
const makeCloverApiRequest = (endpoint, method, payload) => {
  return new Promise((resolve, reject) => {
    const rawEnv = (process.env.CLOVER_ENVIRONMENT || '').trim().toLowerCase();

    // 1. Strict environment configuration validation
    if (!rawEnv) {
      return reject({
        statusCode: 500,
        error: { code: 'CONFIGURATION_ERROR', message: 'CLOVER_ENVIRONMENT is not set. Must be explicitly set to "sandbox" or "production".' }
      });
    }
    if (rawEnv !== 'sandbox' && rawEnv !== 'production') {
      return reject({
        statusCode: 500,
        error: { code: 'INVALID_ENVIRONMENT', message: `Invalid CLOVER_ENVIRONMENT: "${rawEnv}". Must be explicitly set to "sandbox" or "production".` }
      });
    }

    const isSandbox = rawEnv === 'sandbox';

    // 2. Production safety guard: Prevent accidental production charges in test/dev
    if (!isSandbox && process.env.NODE_ENV !== 'production' && !process.env.ALLOW_LIVE_CHARGES) {
      return reject({
        statusCode: 403,
        error: { code: 'SAFETY_BLOCK', message: 'SAFETY BLOCK: Live production Clover API execution is blocked in non-production environments to prevent accidental live charges.' }
      });
    }

    // 3. Credentials presence and validity check
    if (!isCloverConfigured()) {
      return reject({
        statusCode: 503,
        error: { code: 'CREDENTIALS_REQUIRED', message: 'Valid Clover API credentials are not configured or placeholder token is in use.' }
      });
    }

    const hostname = isSandbox ? 'scl-sandbox.dev.clover.com' : 'scl.clover.com';
    const apiKey = (process.env.CLOVER_API_KEY || '').trim();

    const dataString = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname,
      port: 443,
      path: endpoint,
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            reject({
              statusCode: res.statusCode,
              error: parsed.error || parsed.message || parsed || 'Clover API Request Failed'
            });
          }
        } catch (parseErr) {
          reject({ statusCode: res.statusCode, error: body || parseErr.message });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ statusCode: 408, error: 'Gateway timeout contacting Clover servers' });
    });

    req.on('error', (err) => {
      reject({ statusCode: 502, error: err.message || 'Network error contacting Clover gateway' });
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

/**
 * Applies verified payment settlement to database records.
 * Only called when trusted gateway verification exists.
 * Strictly verifies entity existence and amount matching before updating.
 */
const applyVerifiedPaymentSettlement = async ({
  entityType,
  entityId,
  amount,
  currency = 'USD',
  transactionId,
  category = 'GENERAL',
  stateId = 'TN',
  clubId = 'club-1',
  description,
  gatewayRef
}) => {
  const cleanCurrency = String(currency || 'USD').trim().toUpperCase();
  if (cleanCurrency !== 'USD') {
    const err = new Error(`Invalid payment currency: ${cleanCurrency}. Only USD is accepted.`);
    err.statusCode = 400;
    err.code = 'INVALID_CURRENCY';
    throw err;
  }

  const pmtAmount = Number(amount) || 0;
  if (pmtAmount <= 0) {
    const err = new Error('Settlement amount must be greater than zero');
    err.statusCode = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const updates = {
    updatedEntity: null,
    entityType,
    entityId,
    transactionId,
    amount: pmtAmount
  };

  // 1. Strict entity verification and amount matching
  if (entityId) {
    if (entityType === 'EVENT_ENTRY' || entityType === 'ENTRY') {
      const [entryRows] = await db.query(
        'SELECT id, fee, paymentStatus FROM `EventEntry` WHERE id = ?',
        [entityId]
      );
      if (!entryRows || entryRows.length === 0) {
        const err = new Error(`Event entry #${entityId} does not exist`);
        err.statusCode = 404;
        err.code = 'ENTRY_NOT_FOUND';
        throw err;
      }
      const entry = entryRows[0];
      const expectedFee = Number(entry.fee) || 0;
      if (Math.abs(expectedFee - pmtAmount) > 0.01) {
        const err = new Error(`Payment amount $${pmtAmount.toFixed(2)} does not match entry fee $${expectedFee.toFixed(2)}`);
        err.statusCode = 400;
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }
      await db.query(
        "UPDATE `EventEntry` SET `paymentStatus` = 'Paid' WHERE `id` = ?",
        [entityId]
      );
      updates.updatedEntity = { type: 'EventEntry', id: entityId, paymentStatus: 'Paid', amount: pmtAmount };
    } else if (entityType === 'MEMBER' || entityType === 'MEMBERSHIP') {
      const [memberRows] = await db.query(
        'SELECT id, duesAmount, status FROM `Member` WHERE id = ? OR LOWER(email) = LOWER(?)',
        [entityId, entityId]
      );
      if (!memberRows || memberRows.length === 0) {
        const err = new Error(`Member ${entityId} does not exist`);
        err.statusCode = 404;
        err.code = 'MEMBER_NOT_FOUND';
        throw err;
      }
      const member = memberRows[0];
      const expectedDues = Number(member.duesAmount) || 35.0;
      if (Math.abs(expectedDues - pmtAmount) > 0.01) {
        const err = new Error(`Payment amount $${pmtAmount.toFixed(2)} does not match membership dues $${expectedDues.toFixed(2)}`);
        err.statusCode = 400;
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }
      await db.query(
        "UPDATE `Member` SET `status` = 'Active' WHERE id = ?",
        [member.id]
      );
      updates.updatedEntity = { type: 'Member', id: member.id, status: 'Active', amount: pmtAmount };
    } else if (entityType === 'ORDER') {
      const [orderRows] = await db.query(
        'SELECT id, total, status FROM `Order` WHERE id = ? OR orderNumber = ?',
        [entityId, entityId]
      );
      if (!orderRows || orderRows.length === 0) {
        const err = new Error(`Order ${entityId} does not exist`);
        err.statusCode = 404;
        err.code = 'ORDER_NOT_FOUND';
        throw err;
      }
      const order = orderRows[0];
      const expectedTotal = Number(order.total) || 0;
      if (Math.abs(expectedTotal - pmtAmount) > 0.01) {
        const err = new Error(`Payment amount $${pmtAmount.toFixed(2)} does not match order total $${expectedTotal.toFixed(2)}`);
        err.statusCode = 400;
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }
      await db.query(
        "UPDATE `Order` SET `status` = 'Processing' WHERE id = ?",
        [order.id]
      );
      updates.updatedEntity = { type: 'Order', id: order.id, status: 'Processing', amount: pmtAmount };
    } else if (entityType === 'DONATION' || entityType === 'PLEDGE') {
      const [pledgeRows] = await db.query(
        'SELECT id, amount, status FROM `DonationPledge` WHERE id = ?',
        [entityId]
      );
      if (!pledgeRows || pledgeRows.length === 0) {
        const err = new Error(`Donation pledge #${entityId} does not exist`);
        err.statusCode = 404;
        err.code = 'PLEDGE_NOT_FOUND';
        throw err;
      }
      const pledge = pledgeRows[0];
      const expectedPledge = Number(pledge.amount) || 0;
      if (Math.abs(expectedPledge - pmtAmount) > 0.01) {
        const err = new Error(`Payment amount $${pmtAmount.toFixed(2)} does not match pledge amount $${expectedPledge.toFixed(2)}`);
        err.statusCode = 400;
        err.code = 'AMOUNT_MISMATCH';
        throw err;
      }
      await db.query(
        "UPDATE `DonationPledge` SET `status` = 'Paid' WHERE id = ?",
        [pledge.id]
      );
      updates.updatedEntity = { type: 'DonationPledge', id: pledge.id, status: 'Paid', amount: pmtAmount };
    }
  }

  // 2. Record verified transaction in FinancialTransaction ledger
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const ledgerDescription = description || `Clover verified payment Ref: ${gatewayRef || transactionId} [VERIFIED_GATEWAY]`;

  try {
    await db.query(
      `INSERT INTO \`FinancialTransaction\` (\`id\`, \`type\`, \`category\`, \`amount\`, \`period\`, \`stateId\`, \`clubId\`, \`description\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        'PAYMENT_IN',
        category,
        pmtAmount,
        currentPeriod,
        stateId,
        clubId,
        ledgerDescription
      ]
    );
  } catch (dbErr) {
    console.warn('[FinancialTransaction Insert Warning]:', dbErr.message);
  }

  return updates;
};

// GET /api/v1/payments/config - Retrieve current gateway status and configuration
const getPaymentConfig = (req, res) => {
  const merchantId = process.env.CLOVER_MERCHANT_ID || '526695041883';
  const configured = isCloverConfigured();
  const environment = process.env.CLOVER_ENVIRONMENT || 'sandbox';
  const webhookConfigured = Boolean(process.env.CLOVER_WEBHOOK_SECRET);

  const missingPrerequisites = [];
  if (!process.env.CLOVER_MERCHANT_ID || process.env.CLOVER_MERCHANT_ID === 'your_clover_merchant_id_here') {
    missingPrerequisites.push('CLOVER_MERCHANT_ID');
  }
  if (!configured) {
    missingPrerequisites.push('CLOVER_API_KEY');
  }
  if (!webhookConfigured) {
    missingPrerequisites.push('CLOVER_WEBHOOK_SECRET');
  }

  return res.json({
    success: true,
    gateway: 'Clover',
    merchantId,
    environment,
    currency: 'USD',
    isConfigured: configured,
    isLiveGateway: configured && environment.toLowerCase() === 'production',
    webhookConfigured,
    missingPrerequisites: configured && webhookConfigured ? [] : missingPrerequisites,
    status: configured ? 'ONLINE_READY' : 'SANDBOX_PENDING_GATEWAY',
    supportedMethods: configured
      ? ['Credit Card (Tokenized)', 'Debit Card (Tokenized)', 'Clover Hosted Checkout']
      : ['Credit Card (Sandbox Simulation)', 'Debit Card (Sandbox Simulation)'],
    message: configured
      ? `Clover Payment Gateway configured and active in ${environment} mode.`
      : 'Clover Payment Gateway is in sandbox/testing mode. Real Clover sandbox/production credentials are not connected.'
  });
};

// POST /api/v1/payments/charge - Process card/digital payment through Clover Gateway
const processCharge = async (req, res) => {
  try {
    const {
      amount,
      currency = 'USD',
      customerName,
      email,
      source,
      cardToken,
      orderId,
      entryId,
      memberId,
      pledgeId,
      category = 'ORDER',
      description,
      stateId = 'TN',
      clubId = 'club-1',
      cardLast4 = '4242'
    } = req.body;

    // Currency check
    const cleanCurrency = String(currency || 'USD').trim().toUpperCase();
    if (cleanCurrency !== 'USD') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CURRENCY', message: `Currency ${currency} not supported. Only USD is accepted.` }
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than 0' }
      });
    }

    const numAmount = Number(amount);

    // Entity existence and amount mismatch check upfront
    if (entryId) {
      const [entryRows] = await db.query('SELECT fee FROM `EventEntry` WHERE id = ?', [entryId]);
      if (!entryRows || entryRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ENTRY_NOT_FOUND', message: `Event entry #${entryId} does not exist` }
        });
      }
      const expected = Number(entryRows[0].fee) || 0;
      if (Math.abs(expected - numAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: `Charge amount $${numAmount.toFixed(2)} does not match entry fee $${expected.toFixed(2)}`
          }
        });
      }
    } else if (memberId) {
      const [memberRows] = await db.query('SELECT duesAmount FROM `Member` WHERE id = ? OR LOWER(email) = LOWER(?)', [memberId, memberId]);
      if (!memberRows || memberRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'MEMBER_NOT_FOUND', message: `Member ${memberId} does not exist` }
        });
      }
      const expected = Number(memberRows[0].duesAmount) || 35.0;
      if (Math.abs(expected - numAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: `Charge amount $${numAmount.toFixed(2)} does not match membership dues $${expected.toFixed(2)}`
          }
        });
      }
    } else if (orderId) {
      const [orderRows] = await db.query('SELECT total FROM `Order` WHERE id = ? OR orderNumber = ?', [orderId, orderId]);
      if (!orderRows || orderRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: `Order ${orderId} does not exist` }
        });
      }
      const expected = Number(orderRows[0].total) || 0;
      if (Math.abs(expected - numAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: `Charge amount $${numAmount.toFixed(2)} does not match order total $${expected.toFixed(2)}`
          }
        });
      }
    } else if (pledgeId) {
      const [pledgeRows] = await db.query('SELECT amount FROM `DonationPledge` WHERE id = ?', [pledgeId]);
      if (!pledgeRows || pledgeRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLEDGE_NOT_FOUND', message: `Donation pledge #${pledgeId} does not exist` }
        });
      }
      const expected = Number(pledgeRows[0].amount) || 0;
      if (Math.abs(expected - numAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: `Charge amount $${numAmount.toFixed(2)} does not match pledge amount $${expected.toFixed(2)}`
          }
        });
      }
    }

    const merchantId = process.env.CLOVER_MERCHANT_ID || '526695041883';
    const configured = isCloverConfigured();

    // Sanitize card last 4 (only allow trailing 4 digits, never store raw card numbers)
    const sanitizedLast4 = String(cardLast4 || '4242').replace(/\D/g, '').slice(-4) || '4242';

    // 1. LIVE / CONFIGURED CLOVER GATEWAY EXECUTION
    if (configured) {
      const token = source || cardToken;
      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOKEN_REQUIRED',
            message: 'A valid Clover card token is required for live payment processing'
          }
        });
      }

      try {
        const cloverPayload = {
          amount: Math.round(numAmount * 100),
          currency: 'usd',
          source: token,
          description: description || `Payment for ${customerName || email || 'Customer'}`
        };

        const cloverResponse = await makeCloverApiRequest('/v1/charges', 'POST', cloverPayload);
        const chargeData = cloverResponse.data;

        if (chargeData && (chargeData.paid || chargeData.status === 'succeeded')) {
          const txnId = chargeData.id || `TXN-CLV-${Date.now().toString().slice(-8)}`;

          let entityType = null;
          let targetId = null;
          if (entryId) {
            entityType = 'EVENT_ENTRY';
            targetId = entryId;
          } else if (memberId) {
            entityType = 'MEMBER';
            targetId = memberId;
          } else if (orderId) {
            entityType = 'ORDER';
            targetId = orderId;
          } else if (pledgeId) {
            entityType = 'DONATION';
            targetId = pledgeId;
          }

          const settlement = await applyVerifiedPaymentSettlement({
            entityType,
            entityId: targetId,
            amount: numAmount,
            currency: 'USD',
            transactionId: txnId,
            category,
            stateId,
            clubId,
            gatewayRef: chargeData.id,
            description: `Clover verified payment Ref: ${chargeData.id} [VERIFIED_GATEWAY]`
          });

          return res.json({
            success: true,
            verified: true,
            transactionId: txnId,
            gateway: 'Clover',
            merchantId,
            amount: numAmount,
            currency: 'USD',
            status: 'PAID',
            paymentStatus: 'Paid',
            isLiveCharge: process.env.CLOVER_ENVIRONMENT === 'production',
            settlement,
            cardSummary: `•••• ${sanitizedLast4}`,
            customerName: customerName || 'Valued Member',
            email: email || '',
            orderId: orderId || null,
            entryId: entryId || null,
            timestamp: new Date().toISOString(),
            message: `Payment of $${numAmount.toFixed(2)} successfully settled through Clover Payment Gateway.`
          });
        } else {
          return res.status(402).json({
            success: false,
            verified: false,
            error: {
              code: 'CHARGE_DECLINED',
              message: chargeData?.failure_message || 'Payment declined by Clover gateway'
            }
          });
        }
      } catch (cloverErr) {
        console.error('[Clover Live Gateway Charge Error]:', cloverErr);
        return res.status(cloverErr.statusCode || 502).json({
          success: false,
          verified: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: cloverErr.error?.message || cloverErr.error || 'Clover gateway charge failed'
          }
        });
      }
    }

    // 2. UNCONFIGURED / SANDBOX SIMULATION MODE
    // Honest recording: simulated test charge marked with [SIMULATED] tag
    // CRITICAL: Unverified simulated charges NEVER mark EventEntry, Member, or Order as Paid
    const txnId = `TXN-SIM-${Date.now().toString().slice(-8)}`;
    const authCode = `SIM-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      await db.query(
        `INSERT INTO \`FinancialTransaction\` (\`id\`, \`type\`, \`category\`, \`amount\`, \`period\`, \`stateId\`, \`clubId\`, \`description\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txnId,
          'PAYMENT_IN',
          category,
          numAmount,
          new Date().toISOString().slice(0, 7),
          stateId || 'TN',
          clubId || 'club-1',
          description || `[SIMULATED] Payment for ${customerName || 'Customer'} | Ref: ${txnId} | Live Clover Not Integrated`
        ]
      );
    } catch (dbErr) {
      console.warn('[DB FinancialTransaction Log Warning]:', dbErr.message);
    }

    return res.json({
      success: true,
      verified: false,
      transactionId: txnId,
      authCode,
      gateway: 'Clover (Sandbox Simulation)',
      merchantId,
      amount: numAmount,
      currency: 'USD',
      status: 'SIMULATED_TEST',
      paymentStatus: 'Pending Verification',
      isLiveCharge: false,
      cardSummary: `•••• ${sanitizedLast4}`,
      customerName: customerName || 'Valued Member',
      email: email || '',
      orderId: orderId || null,
      entryId: entryId || null,
      timestamp: new Date().toISOString(),
      message: `Simulated transaction of $${numAmount.toFixed(2)} recorded for testing. Live Clover payment integration pending.`
    });
  } catch (err) {
    console.error('[Payment Controller Error]:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: err.message || 'Payment processing failed' }
    });
  }
};

/**
 * Validates Clover webhook signature using HMAC SHA-256.
 * Webhooks cannot be authenticated without a configured secret.
 */
const verifyWebhookSignature = (req) => {
  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  const signatureHeader = req.headers['x-clover-signature'] || req.headers['x-clover-webhook-signature'];
  if (!signatureHeader) return false;

  try {
    const rawPayload = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawPayload);
    const expectedSig = hmac.digest('hex');

    const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim().toLowerCase();
    const cleanExpected = expectedSig.trim().toLowerCase();

    const headerBuffer = Buffer.from(cleanHeader, 'hex');
    const expectedBuffer = Buffer.from(cleanExpected, 'hex');

    if (headerBuffer.length !== expectedBuffer.length || headerBuffer.length === 0) {
      return false;
    }
    return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
  } catch (err) {
    console.error('[Webhook Signature Verification Error]:', err.message);
    return false;
  }
};

/**
 * POST /api/v1/payments/webhook
 * Handles Clover webhook notifications, verification challenges, and idempotent processing.
 */
const handleWebhook = async (req, res) => {
  try {
    // 1. Clover Webhook Verification Challenge Handshake
    const verificationCode = req.body?.verificationCode || req.query?.verificationCode;
    if (verificationCode) {
      return res.status(200).json({ verificationCode });
    }

    // 2. Validate authenticity / signature
    const isValidSignature = verifyWebhookSignature(req);
    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature validation failed or secret unconfigured' }
      });
    }

    // 3. Extract event ID for idempotency check
    const payload = req.body || {};
    const eventId =
      payload.eventId ||
      payload.id ||
      payload.objectId ||
      (payload.paymentId ? `pmt-${payload.paymentId}` : null) ||
      `evt-${Date.now()}`;

    // 4. Idempotency enforcement
    if (processedWebhookEvents.has(eventId)) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} already processed idempotently.`
      });
    }

    // Check database to prevent duplicate transactions on server restarts
    const [existingTxn] = await db.query(
      "SELECT id FROM `FinancialTransaction` WHERE description LIKE ? LIMIT 1",
      [`%${eventId}%`]
    );
    if (existingTxn && existingTxn.length > 0) {
      processedWebhookEvents.add(eventId);
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} already recorded in database ledger.`
      });
    }

    // 5. Payment status check: non-paid (declined, pending, failed, refunded) MUST NOT settle entity
    const rawStatus = String(payload.status || payload.paymentStatus || 'PAID').toUpperCase();
    const NON_SETTLED_STATUSES = ['DECLINED', 'FAILED', 'PENDING', 'CANCELLED', 'REFUNDED'];
    if (NON_SETTLED_STATUSES.includes(rawStatus)) {
      processedWebhookEvents.add(eventId);
      return res.status(200).json({
        success: true,
        processed: true,
        eventId,
        status: rawStatus,
        settlement: null,
        message: `Gateway notification received with status ${rawStatus}. No records updated to Paid.`
      });
    }

    // 6. Process Payment Settlement
    let paymentId = payload.paymentId || payload.objectId || `CLV-WEBHOOK-${Date.now()}`;
    let amount = Number(payload.amount || payload.total || 0);
    let targetEntity = payload.targetEntity || {};

    // Standard Clover merchants payload inspection: { merchants: { [mId]: [ { objectId, type } ] } }
    if (payload.merchants && typeof payload.merchants === 'object') {
      const merchantKeys = Object.keys(payload.merchants);
      if (merchantKeys.length > 0) {
        const eventsList = payload.merchants[merchantKeys[0]];
        if (Array.isArray(eventsList) && eventsList.length > 0) {
          const firstEvt = eventsList[0];
          if (firstEvt.objectId) {
            paymentId = firstEvt.objectId;
          }
        }
      }
    }

    // Apply entity updates if payload indicates target
    let settlementResult = null;
    if (targetEntity.id && targetEntity.type) {
      try {
        settlementResult = await applyVerifiedPaymentSettlement({
          entityType: targetEntity.type,
          entityId: targetEntity.id,
          amount,
          currency: payload.currency || 'USD',
          transactionId: `TXN-GATEWAY-${Date.now().toString().slice(-8)}`,
          category: targetEntity.type === 'EVENT_ENTRY' ? 'EVENT_ENTRY' : (targetEntity.type === 'MEMBER' ? 'MEMBERSHIP' : 'ORDER'),
          gatewayRef: paymentId,
          description: `Clover verified payment Ref: ${paymentId} Event: ${eventId} [VERIFIED_GATEWAY]`
        });
      } catch (settleErr) {
        return res.status(settleErr.statusCode || 400).json({
          success: false,
          error: {
            code: settleErr.code || 'SETTLEMENT_REJECTED',
            message: settleErr.message
          }
        });
      }
    }

    // Mark event as processed in idempotency set only after successful handling
    processedWebhookEvents.add(eventId);

    return res.status(200).json({
      success: true,
      processed: true,
      eventId,
      paymentId,
      settlement: settlementResult,
      message: 'Clover webhook processed successfully'
    });
  } catch (err) {
    console.error('[Clover Webhook Handler Error]:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'WEBHOOK_PROCESSING_ERROR', message: err.message }
    });
  }
};

/**
 * GET /api/v1/payments/verify/:transactionId
 * Protected: Verifies transaction status and settlement evidence from database ledger.
 * Enforces role-based authorization to prevent unauthorized transaction data access.
 */
const verifyPaymentStatus = async (req, res) => {
  try {
    // 1. Authentication check
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to verify payment status' }
      });
    }

    const { transactionId } = req.params;
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Transaction ID is required' }
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM `FinancialTransaction` WHERE `id` = ? OR `description` LIKE ? LIMIT 1",
      [transactionId, `%${transactionId}%`]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Transaction #${transactionId} not found in database ledger` }
      });
    }

    const txn = rows[0];

    // 2. Authorization check: Members can only view their own transactions
    const ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];
    if (!ADMIN_ROLES.includes(req.user.role)) {
      const userEmail = (req.user.email || '').toLowerCase();
      const userName = (req.user.name || '').toLowerCase();
      const desc = (txn.description || '').toLowerCase();

      if (!userEmail || (!desc.includes(userEmail) && !desc.includes(userName))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to view details for this payment transaction' }
        });
      }
    }

    const isSimulated = (txn.description || '').includes('[SIMULATED]');
    const isVerifiedGateway = (txn.description || '').includes('[VERIFIED_GATEWAY]');

    return res.json({
      success: true,
      transactionId: txn.id,
      amount: txn.amount,
      category: txn.category,
      type: txn.type,
      period: txn.period,
      status: isVerifiedGateway ? 'PAID_VERIFIED' : (isSimulated ? 'SIMULATED_TEST' : 'RECORDED'),
      verified: isVerifiedGateway,
      isSimulated,
      createdAt: txn.createdAt,
      evidence: {
        ledgerId: txn.id,
        isVerifiedExternalSettlement: isVerifiedGateway,
        gateway: isVerifiedGateway ? 'Clover' : (isSimulated ? 'Clover (Sandbox Simulation)' : 'Internal')
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * GET /api/v1/payments/transactions
 * Protected: Retrieves recent transactions from database ledger.
 */
const getTransactions = async (req, res) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to view transaction ledger' }
      });
    }

    const ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];
    let query = 'SELECT id, type, category, amount, period, stateId, clubId, createdAt FROM `FinancialTransaction`';
    const params = [];

    if (!ADMIN_ROLES.includes(req.user.role)) {
      // Member only sees their own transactions
      query += ' WHERE description LIKE ?';
      params.push(`%${req.user.email}%`);
    }

    query += ' ORDER BY `createdAt` DESC LIMIT 50';

    const [rows] = await db.query(query, params);
    return res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

module.exports = {
  getPaymentConfig,
  processCharge,
  handleWebhook,
  verifyPaymentStatus,
  getTransactions,
  applyVerifiedPaymentSettlement,
  isCloverConfigured,
  makeCloverApiRequest
};
