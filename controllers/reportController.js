const db = require('../db');

/**
 * Validates and extracts date range parameters from the request.
 */
function parseAndValidateDateRange(req) {
  const { period, startDate, endDate } = req.query;

  let start = null;
  let end = null;

  if (startDate) {
    if (isNaN(Date.parse(startDate))) {
      return { error: { code: 'INVALID_DATE_FORMAT', message: 'Invalid startDate parameter' } };
    }
    start = new Date(startDate);
  }

  if (endDate) {
    if (isNaN(Date.parse(endDate))) {
      return { error: { code: 'INVALID_DATE_FORMAT', message: 'Invalid endDate parameter' } };
    }
    end = new Date(endDate);
  }

  if (start && end && start.getTime() > end.getTime()) {
    return { error: { code: 'INVALID_DATE_RANGE', message: 'startDate cannot be after endDate' } };
  }

  const p = period ? String(period).toLowerCase().trim() : 'monthly';
  if (!start && !end && p !== 'all' && p !== 'all time') {
    const now = new Date();
    if (p === 'daily') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (p === 'weekly') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
    } else if (p === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = now;
    } else if (p === 'yearly' || p === 'annual') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = now;
    }
  }

  const formatSqlDate = (d, isEnd = false) => {
    if (!d) return null;
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const time = isEnd ? '23:59:59' : '00:00:00';
    return `${year}-${month}-${day} ${time}`;
  };

  const startIso = start ? (startDate && !startDate.includes(':') ? formatSqlDate(start, false) : start.toISOString().replace('T', ' ').slice(0, 19)) : null;
  const endIso = end ? (endDate && !endDate.includes(':') ? formatSqlDate(end, true) : end.toISOString().replace('T', ' ').slice(0, 19)) : null;

  return { startIso, endIso, period: p };
}

// 1. General Financial Overview Report Controller
const getFinancialOverview = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    if (user.role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members do not have access to financial reports' }
      });
    }

    let targetClubId = null;
    let targetStateCode = null;

    if (user.role === 'CLUB_ADMIN' || user.role === 'EVENT_ADMIN') {
      if (!user.clubId) {
        targetClubId = 'club-1';
      } else {
        if (req.query.clubId && req.query.clubId !== user.clubId) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Cannot access financial reports for another club' }
          });
        }
        targetClubId = user.clubId;
      }
    } else if (user.role === 'STATE_ADMIN') {
      const userState = user.stateCode || user.state;
      if (!userState) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'No state charter assigned to state administrator' }
        });
      }
      if (req.query.state && req.query.state.toUpperCase() !== userState.toUpperCase()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access financial reports for another state' }
        });
      }
      targetStateCode = userState;
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'NATIONAL_ADMIN') {
      if (req.query.clubId) targetClubId = req.query.clubId;
      if (req.query.state) targetStateCode = req.query.state;
    }

    const dateRange = parseAndValidateDateRange(req);
    if (dateRange.error) {
      return res.status(400).json({ success: false, error: dateRange.error });
    }

    // Helper to resolve state codes and full state names
    const STATE_NAME_MAP = {
      AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
      CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
      HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
      KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
      MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
      MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
      NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
      OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
      SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
      VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
    };
    const REVERSE_STATE_NAME_MAP = Object.fromEntries(
      Object.entries(STATE_NAME_MAP).map(([code, name]) => [name.toLowerCase(), code])
    );

    const resolvedStateCode = targetStateCode ? (REVERSE_STATE_NAME_MAP[targetStateCode.toLowerCase()] || targetStateCode.toUpperCase()) : null;
    const resolvedStateName = targetStateCode ? (STATE_NAME_MAP[targetStateCode.toUpperCase()] || targetStateCode) : null;

    // Resolve club IDs if state scope is active
    let stateClubIds = null;
    if (targetStateCode && !targetClubId) {
      const [clubRows] = await db.query(
        'SELECT id FROM `LocalClub` WHERE UPPER(stateCode) = UPPER(?) OR UPPER(stateCode) = UPPER(?) OR LOWER(state) = LOWER(?) OR LOWER(state) = LOWER(?)',
        [resolvedStateCode, resolvedStateName, resolvedStateCode, resolvedStateName]
      );
      stateClubIds = clubRows.map((c) => c.id);
    }

    // 1. Merchandise Revenue (from Order table)
    let merchQuery = "SELECT COALESCE(SUM(total), 0) as total FROM `Order` WHERE status NOT IN ('Cancelled', 'Refunded') AND fulfillmentStatus NOT IN ('Cancelled', 'Refunded')";
    const merchParams = [];

    if (targetClubId) {
      merchQuery += ' AND clubId = ?';
      merchParams.push(targetClubId);
    } else if (stateClubIds !== null) {
      if (stateClubIds.length === 0) {
        merchQuery += ' AND 1=0';
      } else {
        const ph = stateClubIds.map(() => '?').join(',');
        merchQuery += ` AND clubId IN (${ph})`;
        merchParams.push(...stateClubIds);
      }
    }

    if (dateRange.startIso) {
      merchQuery += ' AND createdAt >= ?';
      merchParams.push(dateRange.startIso);
    }
    if (dateRange.endIso) {
      merchQuery += ' AND createdAt <= ?';
      merchParams.push(dateRange.endIso);
    }

    const [merchRows] = await db.query(merchQuery, merchParams);
    const merchandiseRevenue = Number(Number(merchRows[0]?.total || 0).toFixed(2));

    // 2. Events Revenue (from EventEntry joined with Event)
    let eventsQuery = "SELECT COALESCE(SUM(ee.fee), 0) as total FROM `EventEntry` ee JOIN `Event` e ON ee.eventId = e.id WHERE ee.paymentStatus = 'Paid'";
    const eventsParams = [];

    if (targetClubId) {
      eventsQuery += ' AND e.clubId = ?';
      eventsParams.push(targetClubId);
    } else if (targetStateCode) {
      eventsQuery += ' AND (UPPER(e.stateCode) = UPPER(?) OR UPPER(e.stateCode) = UPPER(?) OR LOWER(e.state) = LOWER(?) OR LOWER(e.state) = LOWER(?))';
      eventsParams.push(resolvedStateCode, resolvedStateName, resolvedStateCode, resolvedStateName);
    }

    if (dateRange.startIso) {
      eventsQuery += ' AND ee.createdAt >= ?';
      eventsParams.push(dateRange.startIso);
    }
    if (dateRange.endIso) {
      eventsQuery += ' AND ee.createdAt <= ?';
      eventsParams.push(dateRange.endIso);
    }

    const [eventsRows] = await db.query(eventsQuery, eventsParams);
    const eventsRevenue = Number(Number(eventsRows[0]?.total || 0).toFixed(2));

    // 3. Membership Revenue (from Member table)
    let memberQuery = "SELECT COALESCE(SUM(duesAmount), 0) as total FROM `Member` WHERE status = 'Active'";
    const memberParams = [];

    if (targetClubId) {
      const [clubNameRows] = await db.query('SELECT name FROM `LocalClub` WHERE id = ?', [targetClubId]);
      const clubName = clubNameRows[0]?.name || targetClubId;
      memberQuery += ' AND (club = ? OR club = ?)';
      memberParams.push(clubName, targetClubId);
    } else if (targetStateCode) {
      memberQuery += ' AND (UPPER(state) = UPPER(?) OR UPPER(state) = UPPER(?) OR LOWER(state) = LOWER(?) OR LOWER(state) = LOWER(?))';
      memberParams.push(resolvedStateCode, resolvedStateName, resolvedStateCode, resolvedStateName);
    }

    if (dateRange.startIso) {
      memberQuery += ' AND createdAt >= ?';
      memberParams.push(dateRange.startIso);
    }
    if (dateRange.endIso) {
      memberQuery += ' AND createdAt <= ?';
      memberParams.push(dateRange.endIso);
    }

    const [memberRows] = await db.query(memberQuery, memberParams);
    const membershipRevenue = Number(Number(memberRows[0]?.total || 0).toFixed(2));

    // 4. Fundraising Revenue (from FinancialTransaction table, excluding test simulations)
    let fundQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM `FinancialTransaction` WHERE (LOWER(category) LIKE '%fundrais%' OR LOWER(type) LIKE '%fundrais%') AND (description IS NULL OR description NOT LIKE '%[SIMULATED]%')";
    const fundParams = [];

    if (targetClubId) {
      fundQuery += ' AND clubId = ?';
      fundParams.push(targetClubId);
    } else if (targetStateCode) {
      fundQuery += ' AND (UPPER(stateId) = UPPER(?) OR UPPER(stateId) = UPPER(?))';
      fundParams.push(resolvedStateCode, resolvedStateName);
    }

    if (dateRange.startIso) {
      fundQuery += ' AND createdAt >= ?';
      fundParams.push(dateRange.startIso);
    }
    if (dateRange.endIso) {
      fundQuery += ' AND createdAt <= ?';
      fundParams.push(dateRange.endIso);
    }

    const [fundRows] = await db.query(fundQuery, fundParams);
    const fundraisingRevenue = Number(Number(fundRows[0]?.total || 0).toFixed(2));

    // 5. Donations Revenue (from confirmed DonationPledge + FinancialTransaction, excluding test simulations)
    let donPledgeQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM `DonationPledge` WHERE status IN ('Paid', 'Confirmed', 'Completed')";
    const donPledgeParams = [];

    if (targetClubId) {
      donPledgeQuery += ' AND entityId = ?';
      donPledgeParams.push(targetClubId);
    }
    if (dateRange.startIso) {
      donPledgeQuery += ' AND createdAt >= ?';
      donPledgeParams.push(dateRange.startIso);
    }
    if (dateRange.endIso) {
      donPledgeQuery += ' AND createdAt <= ?';
      donPledgeParams.push(dateRange.endIso);
    }

    const [donPledgeRows] = await db.query(donPledgeQuery, donPledgeParams);

    let donTxnQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM `FinancialTransaction` WHERE (LOWER(category) LIKE '%donation%' OR LOWER(type) LIKE '%donation%') AND (description IS NULL OR description NOT LIKE '%[SIMULATED]%')";
    const donTxnParams = [];

    if (targetClubId) {
      donTxnQuery += ' AND clubId = ?';
      donTxnParams.push(targetClubId);
    } else if (targetStateCode) {
      donTxnQuery += ' AND UPPER(stateId) = UPPER(?)';
      donTxnParams.push(targetStateCode);
    }
    if (dateRange.startIso) {
      donTxnQuery += ' AND createdAt >= ?';
      donTxnParams.push(dateRange.startIso);
    }
    if (dateRange.endIso) {
      donTxnQuery += ' AND createdAt <= ?';
      donTxnParams.push(dateRange.endIso);
    }

    const [donTxnRows] = await db.query(donTxnQuery, donTxnParams);
    const donationsRevenue = Number((Number(donPledgeRows[0]?.total || 0) + Number(donTxnRows[0]?.total || 0)).toFixed(2));

    // 6. Total Revenue
    const totalRevenue = Number(
      (membershipRevenue + eventsRevenue + merchandiseRevenue + fundraisingRevenue + donationsRevenue).toFixed(2)
    );

    return res.json({
      success: true,
      data: {
        period: dateRange.period,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        currency: 'USD',
        summary: {
          membershipRevenue,
          eventsRevenue,
          merchandiseRevenue,
          fundraisingRevenue,
          donationsRevenue,
          totalRevenue
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          backendEndpoint: 'GET /api/v1/reports/financial-overview',
          scope: targetClubId ? `Club:${targetClubId}` : (targetStateCode ? `State:${targetStateCode}` : 'National/Global'),
          membershipAccrualBasis: 'Active Membership Roster Dues',
          bankTransferVerified: false,
          disbursementType: 'Internal Ledger'
        }
      },
      message: 'Financial Overview report calculated from database'
    });
  } catch (err) {
    console.error('[Financial Overview Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

// 2. Dedicated State Performance Analytics Report (/state-admin/reports)
const getStatePerformanceReport = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    if (user.role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members do not have access to state performance reports' }
      });
    }

    let targetState = req.query.state || (user && (user.stateCode || user.state)) || 'TN';

    if (user.role === 'STATE_ADMIN') {
      const userState = user.stateCode || user.state || '';
      if (req.query.state && req.query.state.toUpperCase() !== userState.toUpperCase()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access performance report for another state' }
        });
      }
      targetState = userState;
    }

    const [states] = await db.query(
      'SELECT * FROM `StateAssociation` WHERE UPPER(code) = UPPER(?) OR LOWER(name) LIKE ?',
      [targetState.toUpperCase(), `%${targetState.toLowerCase()}%`]
    );

    if (!states || states.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `State Association not found for state '${targetState}'` }
      });
    }

    const state = states[0];
    const stateCode = state.code || targetState.toUpperCase();
    const cleanStateName = (state.name || targetState).replace(/\s+State\s+Association/i, '').trim();

    // Query live aggregated counts from database
    const [clubCountRows] = await db.query(
      'SELECT COUNT(*) as count FROM `LocalClub` WHERE UPPER(stateCode) = UPPER(?) OR UPPER(stateCode) = UPPER(?) OR LOWER(state) = LOWER(?) OR LOWER(state) = LOWER(?)',
      [stateCode, cleanStateName, stateCode, cleanStateName]
    );
    const clubsCount = clubCountRows[0]?.count ?? state.clubsCount ?? 0;

    const [memberCountRows] = await db.query(
      "SELECT COUNT(*) as count FROM `Member` WHERE (UPPER(state) = UPPER(?) OR UPPER(state) = UPPER(?) OR LOWER(state) = LOWER(?) OR LOWER(state) = LOWER(?)) AND status = 'Active'",
      [stateCode, cleanStateName, stateCode, cleanStateName]
    );
    const activeMembers = memberCountRows[0]?.count ?? state.membersCount ?? 0;

    const totalStateRevenue = Number(state.revenue || 0);

    return res.json({
      success: true,
      reportType: 'State Performance & Analytics Report',
      data: {
        stateName: state.name,
        stateCode: stateCode,
        clubsCount: Number(clubsCount),
        activeMembers: Number(activeMembers),
        totalStateRevenue: totalStateRevenue,
        generatedAt: new Date().toISOString()
      },
      message: 'State Performance Analytics Report fetched from database'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

// 3. Dedicated Revenue & 7% Commission Split Report (/state-admin/revenue)
const getRevenueCommissionsReport = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    if (user.role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members do not have access to revenue commission reports' }
      });
    }

    let targetState = req.query.state || (user && (user.stateCode || user.state)) || 'TN';

    if (user.role === 'STATE_ADMIN') {
      const userState = user.stateCode || user.state || '';
      if (req.query.state && req.query.state.toUpperCase() !== userState.toUpperCase()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot access commission report for another state' }
        });
      }
      targetState = userState;
    }

    const [states] = await db.query(
      'SELECT * FROM `StateAssociation` WHERE UPPER(code) = UPPER(?) OR LOWER(name) LIKE ?',
      [targetState.toUpperCase(), `%${targetState.toLowerCase()}%`]
    );

    if (!states || states.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `State Association not found for state '${targetState}'` }
      });
    }

    const state = states[0];
    const stateCode = state.code || targetState.toUpperCase();
    const cleanStateName = (state.name || targetState).replace(/\s+State\s+Association/i, '').trim();

    // 1. Get clubs in this state
    const [stateClubs] = await db.query(
      'SELECT id FROM `LocalClub` WHERE UPPER(stateCode) = UPPER(?) OR UPPER(stateCode) = UPPER(?) OR LOWER(state) = LOWER(?) OR LOWER(state) = LOWER(?)',
      [stateCode, cleanStateName, stateCode, cleanStateName]
    );

    const clubIds = stateClubs.map((c) => c.id);

    // 2. Parse date filters if any
    const dateRange = parseAndValidateDateRange(req);
    if (dateRange.error) {
      return res.status(400).json({ success: false, error: dateRange.error });
    }

    let totalMerchSales = 0;
    let pendingPayouts = 0;
    let completedPayouts = 0;
    let ledgerEntriesCount = 0;
    let anyPending = false;
    let allSettled = true;

    if (clubIds.length > 0) {
      const placeholders = clubIds.map(() => '?').join(',');
      let ordersQuery = `SELECT id, total, payoutStatus, createdAt FROM \`Order\` WHERE clubId IN (${placeholders}) AND status NOT IN ('Cancelled', 'Refunded') AND fulfillmentStatus NOT IN ('Cancelled', 'Refunded')`;
      const params = [...clubIds];

      if (dateRange.startIso) {
        ordersQuery += ' AND createdAt >= ?';
        params.push(dateRange.startIso);
      }
      if (dateRange.endIso) {
        ordersQuery += ' AND createdAt <= ?';
        params.push(dateRange.endIso);
      }

      const [orders] = await db.query(ordersQuery, params);
      ledgerEntriesCount = orders.length;

      for (const ord of orders) {
        const orderTotal = Number(ord.total) || 0;
        totalMerchSales += orderTotal;
        const comm7 = Number((orderTotal * 0.07).toFixed(2));
        if (ord.payoutStatus === 'Pending') {
          pendingPayouts += comm7;
          anyPending = true;
          allSettled = false;
        } else if (ord.payoutStatus === 'Paid' || ord.payoutStatus === 'Completed') {
          completedPayouts += comm7;
        } else if (ord.payoutStatus !== 'Approved') {
          allSettled = false;
        }
      }
    }

    totalMerchSales = Number(totalMerchSales.toFixed(2));
    const stateCommissionEarned = Number((totalMerchSales * 0.07).toFixed(2));
    pendingPayouts = Number(pendingPayouts.toFixed(2));
    completedPayouts = Number(completedPayouts.toFixed(2));

    const payoutStatus = ledgerEntriesCount === 0
      ? 'No Activity'
      : anyPending
        ? 'Pending'
        : allSettled
          ? 'Completed'
          : 'Processing';

    return res.json({
      success: true,
      reportType: 'State Charter 7% Commission & Revenue Ledger Report',
      data: {
        stateCharter: state.name,
        stateCode: stateCode,
        commissionRate: '7.00%',
        totalMerchSales: totalMerchSales,
        stateCommissionEarned: stateCommissionEarned,
        pendingPayouts: pendingPayouts,
        completedPayouts: completedPayouts,
        payoutStatus: payoutStatus,
        ledgerEntriesCount: ledgerEntriesCount,
        disbursementType: 'Internal Ledger',
        bankTransferVerified: false,
        generatedAt: new Date().toISOString()
      },
      message: 'Revenue & Commission Split Ledger Report calculated from database'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

module.exports = {
  getFinancialOverview,
  getStatePerformanceReport,
  getRevenueCommissionsReport
};
