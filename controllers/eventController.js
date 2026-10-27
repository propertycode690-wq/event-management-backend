const db = require('../db');

const getEvents = async (req, res) => {
  try {
    const { state, clubId, federation, type } = req.query;
    let query = 'SELECT * FROM `Event` WHERE 1=1';
    const params = [];

    if (state) {
      query += ' AND (stateCode = ? OR state = ?)';
      params.push(state, state);
    }
    if (clubId) {
      query += ' AND (clubId = ? OR LOWER(club) LIKE ?)';
      params.push(clubId, `%${clubId.toLowerCase()}%`);
    }
    if (federation) {
      query += ' AND federation = ?';
      params.push(federation);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
      message: 'Events fetched directly from MySQL database `club`'
    });
  } catch (err) {
    console.error('[Events Controller Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM `Event` WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }

    return res.json({ success: true, data: rows[0], message: 'Event details fetched from database `club`' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const getEntries = async (req, res) => {
  try {
    const { eventId } = req.query;
    let query = 'SELECT * FROM `EventEntry` WHERE 1=1';
    const params = [];

    if (eventId) {
      query += ' AND eventId = ?';
      params.push(eventId);
    }

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
      message: 'Event Entries fetched directly from MySQL database `club`'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const preSignUpEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { dogId, participant, handlerPhone, entryFee } = req.body;
    const entryId = `ent-${Date.now()}`;
    const confirmationCode = `UHC-${Date.now().toString().slice(-6)}`;

    await db.query(
      `INSERT INTO \`EventEntry\` (id, eventId, dogId, participant, handlerPhone, fee, paymentStatus, confirmationCode, checkInStatus)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending Payment', ?, 'Not Arrived')`,
      [entryId, id, dogId || null, participant || 'Handler', handlerPhone || '', Number(entryFee) || 30.00, confirmationCode]
    );

    await db.query('UPDATE `Event` SET entriesCount = entriesCount + 1 WHERE id = ?', [id]);

    return res.status(201).json({
      success: true,
      data: { id: entryId, eventId: id, confirmationCode, status: 'CONFIRMED', paymentStatus: 'Pending Payment', checkInStatus: 'Not Arrived' },
      message: 'Pre-signup entry saved directly to MySQL database `club`'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const createEvent = async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || `evt-${Date.now()}`;
    const name = data.name || 'Sanctioned Hunt Event';
    const federation = data.federation || 'UKC (United Kennel Club)';
    const sport = data.sport || 'Coonhounds';
    const type = data.type || 'Nite Hunt';
    const club = data.club || 'Oak Ridge Hunting Club';
    const clubId = data.clubId || 'club-1';
    const state = data.state || 'Tennessee';
    const stateCode = data.stateCode || (state === 'Tennessee' ? 'TN' : 'TN');
    const city = data.city || 'Knoxville';
    const date = data.date || 'October 15, 2026';
    const fee = Number(data.fee) || 30.0;
    const entriesCount = Number(data.entriesCount !== undefined ? data.entriesCount : (data.entries || 0));
    const maxCapacity = Number(data.maxCapacity) || 50;
    const status = data.status || 'Registration Open';
    const deadline = data.deadline || 'Oct 14, 2026';
    const address = data.address || '1420 Hunting Ridge Rd, Knoxville, TN 37901';
    const description = data.description || 'Sanctioned hunt event.';
    const startTime = data.startTime || '7:00 PM';

    await db.query(
      `INSERT INTO \`Event\` (id, name, federation, sport, type, club, clubId, state, stateCode, city, date, fee, entriesCount, maxCapacity, status, deadline, address, description, startTime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, federation, sport, type, club, clubId, state, stateCode, city, date, fee, entriesCount, maxCapacity, status, deadline, address, description, startTime]
    );

    const newEvt = {
      id,
      name,
      federation,
      sport,
      type,
      club,
      clubId,
      state,
      stateCode,
      city,
      date,
      fee,
      entriesCount,
      entries: entriesCount,
      maxCapacity,
      status,
      deadline,
      address,
      description,
      startTime
    };

    return res.status(201).json({
      success: true,
      data: newEvt,
      message: `Event "${name}" created directly in MySQL database \`club\``
    });
  } catch (err) {
    console.error('[Create Event Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [existing] = await db.query('SELECT * FROM `Event` WHERE id = ?', [id]);
    const eventItem = existing[0];
    if (!eventItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' }
      });
    }

    // Scope check: Club Admin can only update events belonging to their assigned club
    if (req.user && req.user.role === 'CLUB_ADMIN') {
      const userClub = (req.user.club || req.user.clubId || '').toLowerCase();
      const eventClub = (eventItem.club || eventItem.clubId || '').toLowerCase();
      if (!userClub || (!eventClub.includes(userClub) && !userClub.includes(eventClub))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to modify events outside your assigned club' }
        });
      }
    }

    const fields = [];
    const params = [];

    const allowed = [
      'name',
      'federation',
      'sport',
      'type',
      'club',
      'clubId',
      'state',
      'stateCode',
      'city',
      'date',
      'fee',
      'entriesCount',
      'maxCapacity',
      'status',
      'deadline',
      'address',
      'description',
      'startTime'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length > 0) {
      params.push(id);
      await db.query(`UPDATE \`Event\` SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    const [rows] = await db.query('SELECT * FROM `Event` WHERE id = ?', [id]);

    return res.json({
      success: true,
      data: rows[0] || { id, ...data },
      message: `Event "${data.name || id}" updated in MySQL database \`club\``
    });
  } catch (err) {
    console.error('[Update Event Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query('SELECT * FROM `Event` WHERE id = ?', [id]);
    const eventItem = existing[0];
    if (!eventItem) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' }
      });
    }

    // Scope check: Club Admin can only delete events belonging to their assigned club
    if (req.user && req.user.role === 'CLUB_ADMIN') {
      const userClub = (req.user.club || req.user.clubId || '').toLowerCase();
      const eventClub = (eventItem.club || eventItem.clubId || '').toLowerCase();
      if (!userClub || (!eventClub.includes(userClub) && !userClub.includes(eventClub))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to delete events outside your assigned club' }
        });
      }
    }

    await db.query('DELETE FROM `EventEntry` WHERE eventId = ?', [id]);
    await db.query('DELETE FROM `Event` WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Event "${id}" removed from MySQL database \`club\``
    });
  } catch (err) {
    console.error('[Delete Event Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const checkInEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInStatus } = req.body;

    // 1. Authentication check
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required for check-in operations' }
      });
    }

    // 2. Validate input
    const allowedStatuses = ['Checked In', 'Not Arrived', 'Scratched', 'Late'];
    if (!checkInStatus || !allowedStatuses.includes(checkInStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Check-in status must be one of: ${allowedStatuses.join(', ')}`
        }
      });
    }

    // 3. Find target entry and join with parent event to check scope
    const [entryRows] = await db.query(
      `SELECT ee.*, ev.id AS evId, ev.name AS evName, ev.club AS evClub, ev.clubId AS evClubId, ev.state AS evState, ev.stateCode AS evStateCode
       FROM \`EventEntry\` ee
       LEFT JOIN \`Event\` ev ON ee.eventId = ev.id
       WHERE ee.id = ?`,
      [id]
    );

    const entry = entryRows[0];
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENTRY_NOT_FOUND', message: `Event entry #${id} not found` }
      });
    }

    // 4. Role & Scope Enforcement
    const role = req.user.role;
    if (role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members are not permitted to manage event check-ins' }
      });
    }

    if (role === 'STATE_ADMIN') {
      const userState = (req.user.stateCode || req.user.state || '').toLowerCase();
      const eventState = (entry.evStateCode || entry.evState || '').toLowerCase();
      if (!userState || (!eventState.includes(userState) && !userState.includes(eventState))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to check in entries for events outside your state charter' }
        });
      }
    } else if (role === 'CLUB_ADMIN' || role === 'EVENT_ADMIN') {
      const userClub = (req.user.club || req.user.clubId || '').toLowerCase();
      const eventClub = (entry.evClub || entry.evClubId || '').toLowerCase();
      if (!userClub || (!eventClub.includes(userClub) && !userClub.includes(eventClub))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to check in entries for events outside your assigned club' }
        });
      }
    }

    // 5. Update DB
    const checkedInAt = checkInStatus === 'Checked In' ? new Date().toISOString() : null;
    await db.query(
      'UPDATE `EventEntry` SET `checkInStatus` = ?, `checkedInAt` = ? WHERE `id` = ?',
      [checkInStatus, checkedInAt, id]
    );

    const [updatedRows] = await db.query('SELECT * FROM `EventEntry` WHERE `id` = ?', [id]);
    const updated = updatedRows[0] || { ...entry, checkInStatus, checkedInAt };

    return res.json({
      success: true,
      data: updated,
      message: `Entry #${id} check-in status updated to ${checkInStatus} in database`
    });
  } catch (err) {
    console.error('[Check-In Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

const updateEntryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    // 1. Authentication check
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to update entry payment status' }
      });
    }

    // 2. Validate input
    const allowedStatuses = ['Pending Payment', 'Paid', 'Refunded', 'Unpaid', 'Comped'];
    if (!paymentStatus || !allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Payment status must be one of: ${allowedStatuses.join(', ')}`
        }
      });
    }

    // 3. Find target entry and join with parent event to check scope
    const [entryRows] = await db.query(
      `SELECT ee.*, ev.id AS evId, ev.name AS evName, ev.club AS evClub, ev.clubId AS evClubId, ev.state AS evState, ev.stateCode AS evStateCode
       FROM \`EventEntry\` ee
       LEFT JOIN \`Event\` ev ON ee.eventId = ev.id
       WHERE ee.id = ?`,
      [id]
    );

    const entry = entryRows[0];
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENTRY_NOT_FOUND', message: `Event entry #${id} not found` }
      });
    }

    // 4. Role & Scope Enforcement: Only authorized administrators may change payment status
    const role = req.user.role;
    if (role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Ordinary members cannot alter entry payment status' }
      });
    }

    if (role === 'STATE_ADMIN') {
      const userState = (req.user.stateCode || req.user.state || '').toLowerCase();
      const eventState = (entry.evStateCode || entry.evState || '').toLowerCase();
      if (!userState || (!eventState.includes(userState) && !userState.includes(eventState))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to update entry payments for events outside your state charter' }
        });
      }
    } else if (role === 'CLUB_ADMIN' || role === 'EVENT_ADMIN') {
      const userClub = (req.user.club || req.user.clubId || '').toLowerCase();
      const eventClub = (entry.evClub || entry.evClubId || '').toLowerCase();
      if (!userClub || (!eventClub.includes(userClub) && !userClub.includes(eventClub))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to update entry payments for events outside your assigned club' }
        });
      }
    }

    // 5. Verification Integrity Check:
    // Administrative authorization alone cannot falsely represent an unverified payment as received.
    // In the absence of an integrated payment processor or verified settlement record,
    // entries cannot be marked as 'Paid' by administrative fiat.
    if (paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_VERIFICATION_REQUIRED',
          message: 'Administrative authorization alone cannot mark an entry as Paid without verified payment settlement. Automated payment confirmation remains blocked until live payment processor integration is active.'
        }
      });
    }

    // 6. Update DB with permitted administrative status change (e.g. 'Unpaid', 'Pending Payment', 'Refunded', 'Comped')
    await db.query(
      'UPDATE `EventEntry` SET `paymentStatus` = ? WHERE `id` = ?',
      [paymentStatus, id]
    );

    const [updatedRows] = await db.query('SELECT * FROM `EventEntry` WHERE `id` = ?', [id]);
    const updated = updatedRows[0] || { ...entry, paymentStatus };

    return res.json({
      success: true,
      data: updated,
      message: `Entry #${id} payment status updated to ${paymentStatus} in database`
    });
  } catch (err) {
    console.error('[Update Entry Payment Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

module.exports = {
  getEvents,
  getEventById,
  getEntries,
  preSignUpEntry,
  createEvent,
  updateEvent,
  deleteEvent,
  checkInEntry,
  updateEntryPayment
};
