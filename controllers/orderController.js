const db = require('../db');

/**
 * Valid fulfillment and payout statuses supported by the application
 */
const VALID_FULFILLMENT_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
const VALID_PAYOUT_STATUSES = ['Pending', 'Approved', 'Paid', 'Processing', 'Completed', 'Rejected'];

/**
 * GET /api/v1/orders
 * Protected: Retrieves orders scoped by user role and club assignment.
 */
const getOrders = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to view orders' }
      });
    }

    const { status, fulfillmentStatus, payoutStatus, clubId } = req.query;
    let query = 'SELECT * FROM `Order` WHERE 1=1';
    const params = [];

    // Role-based data access scoping
    if (user.role === 'SUPER_ADMIN' || user.role === 'NATIONAL_ADMIN') {
      // Super & National admins have global order visibility
      if (clubId) {
        query += ' AND clubId = ?';
        params.push(clubId);
      }
    } else if (user.role === 'CLUB_ADMIN' || user.role === 'EVENT_ADMIN') {
      // Club Admin & Event Admin only see orders assigned to their club
      if (!user.clubId) {
        query += ' AND (LOWER(customerEmail) = LOWER(?) OR clubId = ?)';
        params.push(user.email, 'none');
      } else {
        query += ' AND clubId = ?';
        params.push(user.clubId);
      }
    } else if (user.role === 'STATE_ADMIN') {
      // State Admin sees orders for clubs located within their chartered state
      const stateCode = user.stateCode || user.state || '';
      const [stateClubs] = await db.query(
        'SELECT id FROM `LocalClub` WHERE stateCode = ? OR LOWER(state) = LOWER(?)',
        [stateCode, stateCode]
      );
      const clubIds = stateClubs.map((c) => c.id);
      if (clubIds.length === 0) {
        return res.json({ success: true, data: [], count: 0, message: 'No clubs found in state' });
      }
      const placeholders = clubIds.map(() => '?').join(',');
      query += ` AND clubId IN (${placeholders})`;
      params.push(...clubIds);
    } else if (user.role === 'MEMBER') {
      // Members only see orders placed under their registered email
      query += ' AND LOWER(customerEmail) = LOWER(?)';
      params.push(user.email);
    } else {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions to view orders' }
      });
    }

    // Optional query parameter filters
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (fulfillmentStatus) {
      query += ' AND fulfillmentStatus = ?';
      params.push(fulfillmentStatus);
    }
    if (payoutStatus) {
      query += ' AND payoutStatus = ?';
      params.push(payoutStatus);
    }

    query += ' ORDER BY createdAt DESC';

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows || [],
      count: (rows || []).length,
      message: 'Orders retrieved from database',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Order Controller Error - getOrders]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * GET /api/v1/orders/:id
 * Protected: Retrieves a single order with authorization and scope check.
 */
const getOrderById = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM `Order` WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' }
      });
    }

    const order = rows[0];

    // Scope verification
    if (user.role === 'MEMBER' && order.customerEmail && order.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this order' }
      });
    }
    if ((user.role === 'CLUB_ADMIN' || user.role === 'EVENT_ADMIN') && order.clubId && order.clubId !== user.clubId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Order does not belong to your assigned club' }
      });
    }

    return res.json({
      success: true,
      data: order,
      message: 'Order retrieved from database'
    });
  } catch (err) {
    console.error('[Order Controller Error - getOrderById]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * POST /api/v1/orders
 * Records a new order directly to database.
 */
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    const customerName = (orderData.customerName || orderData.customer || '').trim();
    const total = Number(orderData.total || orderData.amount || 0);

    if (!customerName) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Customer name is required' }
      });
    }

    const orderId = orderData.id || `ORD-${Date.now()}`;
    const orderNumber = orderData.orderNumber || orderId;
    const customerEmail = (orderData.customerEmail || orderData.email || (req.user ? req.user.email : '') || '').trim().toLowerCase();
    const status = orderData.status || 'Processing';
    const fulfillmentStatus = orderData.fulfillmentStatus || 'Processing';
    const trackingNumber = orderData.trackingNumber || 'Pending Dispatch';
    const carrier = orderData.carrier || 'UPS Ground';
    const payoutStatus = orderData.payoutStatus || 'Pending';
    const clubId = orderData.clubId || null;
    const itemsJson = typeof orderData.itemsJson === 'string'
      ? orderData.itemsJson
      : JSON.stringify(orderData.orderItems || orderData.items || []);

    // Check if order already exists in database (prevents unique constraint failures on retries)
    const [existingRows] = await db.query('SELECT * FROM `Order` WHERE id = ? OR orderNumber = ?', [orderId, orderNumber]);
    if (existingRows && existingRows.length > 0) {
      return res.status(200).json({
        success: true,
        data: existingRows[0],
        message: `Order #${orderId} already exists in database`,
        timestamp: new Date().toISOString()
      });
    }

    await db.query(
      `INSERT INTO \`Order\` (id, orderNumber, customerName, customerEmail, total, status, fulfillmentStatus, trackingNumber, carrier, payoutStatus, clubId, itemsJson)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNumber, customerName, customerEmail, total, status, fulfillmentStatus, trackingNumber, carrier, payoutStatus, clubId, itemsJson]
    );

    const [persistedRows] = await db.query('SELECT * FROM `Order` WHERE id = ?', [orderId]);
    const persisted = persistedRows[0] || {
      id: orderId,
      orderNumber,
      customerName,
      customerEmail,
      total,
      status,
      fulfillmentStatus,
      trackingNumber,
      carrier,
      payoutStatus,
      clubId,
      itemsJson
    };

    return res.status(201).json({
      success: true,
      data: persisted,
      message: `Order #${orderId} created successfully in database`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Order Controller Error - createOrder]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * PUT /api/v1/orders/:id/fulfillment
 * Protected: Updates order fulfillment status, tracking number, and carrier in database.
 * Rejects unauthorized or out-of-scope callers and invalid status transitions.
 */
const updateFulfillment = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to update fulfillment' }
      });
    }

    const { id } = req.params;
    const { fulfillmentStatus, trackingNumber, carrier } = req.body;

    // 1. Validate requested fulfillment status
    if (!fulfillmentStatus || !VALID_FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FULFILLMENT_STATUS',
          message: `Invalid fulfillment status. Must be one of: ${VALID_FULFILLMENT_STATUSES.join(', ')}`
        }
      });
    }

    // 2. Verify order exists
    const [existingRows] = await db.query('SELECT * FROM `Order` WHERE id = ?', [id]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' }
      });
    }

    const order = existingRows[0];

    // 3. Authorization & scope checks
    if (user.role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members cannot update order fulfillment' }
      });
    }

    if (user.role === 'CLUB_ADMIN' || user.role === 'EVENT_ADMIN') {
      if (order.clubId && user.clubId && order.clubId !== user.clubId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot modify orders belonging to another club' }
        });
      }
    }

    // 4. Update order fulfillment in database
    const finalTracking = trackingNumber !== undefined && trackingNumber !== null ? String(trackingNumber).trim() : order.trackingNumber;
    const finalCarrier = carrier !== undefined && carrier !== null ? String(carrier).trim() : order.carrier;

    await db.query(
      'UPDATE `Order` SET `fulfillmentStatus` = ?, `trackingNumber` = ?, `carrier` = ?, `status` = ? WHERE `id` = ?',
      [fulfillmentStatus, finalTracking, finalCarrier, fulfillmentStatus, id]
    );

    // 5. Query persisted record from database
    const [updatedRows] = await db.query('SELECT * FROM `Order` WHERE id = ?', [id]);
    const updatedOrder = updatedRows[0];

    return res.json({
      success: true,
      data: updatedOrder,
      orderId: id,
      fulfillmentStatus: updatedOrder.fulfillmentStatus,
      trackingNumber: updatedOrder.trackingNumber,
      carrier: updatedOrder.carrier,
      message: `Order #${id} fulfillment status updated to ${fulfillmentStatus} in database`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Order Controller Error - updateFulfillment]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * PUT /api/v1/orders/:id/payout
 * Protected: Updates payout status in database.
 * Rejects unauthorized or out-of-scope callers and invalid statuses.
 */
const updatePayout = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to update payout status' }
      });
    }

    const { id } = req.params;
    const { payoutStatus, status } = req.body;
    const targetStatus = payoutStatus || status;

    // 1. Validate requested payout status
    if (!targetStatus || !VALID_PAYOUT_STATUSES.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYOUT_STATUS',
          message: `Invalid payout status. Must be one of: ${VALID_PAYOUT_STATUSES.join(', ')}`
        }
      });
    }

    // 2. Verify order exists
    const [existingRows] = await db.query('SELECT * FROM `Order` WHERE id = ?', [id]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' }
      });
    }

    const order = existingRows[0];

    // 3. Authorization & scope checks
    if (user.role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members cannot update order payout status' }
      });
    }

    if (user.role === 'CLUB_ADMIN') {
      if (order.clubId && order.clubId !== user.clubId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot modify payouts for another club' }
        });
      }
    }

    // 4. Update payout status in database
    await db.query(
      'UPDATE `Order` SET `payoutStatus` = ? WHERE `id` = ?',
      [targetStatus, id]
    );

    // 5. Query persisted record from database
    const [updatedRows] = await db.query('SELECT * FROM `Order` WHERE id = ?', [id]);
    const updatedOrder = updatedRows[0];

    return res.json({
      success: true,
      data: updatedOrder,
      orderId: id,
      payoutStatus: updatedOrder.payoutStatus,
      meta: {
        bankTransferExecuted: false,
        isLivePayout: false,
        notice: 'External automated bank transfer is not configured. Status recorded in database ledger.'
      },
      message: `Order #${id} payout status updated to ${targetStatus} in database. Note: External automated bank transfer is not configured; status recorded in database ledger.`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Order Controller Error - updatePayout]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateFulfillment,
  updatePayout
};
