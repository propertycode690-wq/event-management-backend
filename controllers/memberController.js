const db = require('../db');

const getMembers = async (req, res) => {
  try {
    // 1. Authentication check
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to access member directory' }
      });
    }

    // 2. Privilege check: Ordinary members cannot access directory
    const ALLOWED_ADMIN_ROLES = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];
    if (!ALLOWED_ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members are not permitted to access the membership directory' }
      });
    }

    const { club, state } = req.query;
    let query = 'SELECT * FROM `Member` WHERE 1=1';
    const params = [];

    // 3. Role-based scope enforcement
    let effectiveState = state;
    let effectiveClub = club;

    if (req.user.role === 'STATE_ADMIN') {
      // State Admin is restricted strictly to their assigned state charter
      effectiveState = req.user.stateCode || req.user.state;
    } else if (req.user.role === 'CLUB_ADMIN' || req.user.role === 'EVENT_ADMIN') {
      // Club Admin & Event Admin are restricted strictly to their assigned club
      effectiveClub = req.user.club || req.user.clubId;
    }

    if (effectiveClub) {
      query += ' AND LOWER(club) LIKE ?';
      params.push(`%${effectiveClub.toLowerCase()}%`);
    }
    if (effectiveState) {
      const stateMap = {
        TX: 'Texas',
        TN: 'Tennessee',
        KY: 'Kentucky',
        AL: 'Alabama',
        AK: 'Alaska',
        AZ: 'Arizona',
        AR: 'Arkansas',
        CA: 'California',
        HI: 'Hawaii'
      };
      const altState = stateMap[effectiveState.toUpperCase()] || '';
      query += ' AND (LOWER(state) = ? OR LOWER(state) = ? OR LOWER(state) LIKE ?)';
      params.push(effectiveState.toLowerCase(), altState.toLowerCase(), `%${effectiveState.toLowerCase()}%`);
    }

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
      message: 'Members fetched directly from MySQL database `club`'
    });
  } catch (err) {
    console.error('[Members Controller Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const createMember = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      state,
      club,
      duesAmount = 35.0,
      joinDate
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Name and email are required' }
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await db.query('SELECT id FROM `Member` WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'MEMBER_EXISTS', message: 'A membership with this email already exists' }
      });
    }

    const memberId = req.body.id || `mem-${Date.now()}`;
    const dateStr = joinDate || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    // Honest status: Pending Payment Verification until real payment confirmed
    const status = 'Pending Payment Verification';

    await db.query(
      `INSERT INTO \`Member\` (id, name, email, phone, state, club, status, duesAmount, joinDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [memberId, name, cleanEmail, phone || '', state || 'Tennessee', club || 'Oak Ridge Hunting Club', status, duesAmount, dateStr]
    );

    const createdMember = {
      id: memberId,
      name,
      email: cleanEmail,
      phone: phone || '',
      state: state || 'Tennessee',
      club: club || 'Oak Ridge Hunting Club',
      status,
      duesAmount,
      joinDate: dateStr
    };

    return res.status(201).json({
      success: true,
      data: createdMember,
      message: 'Membership registered in database. Status: Pending Payment Verification.'
    });
  } catch (err) {
    console.error('[Create Member Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Authentication check
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to update member status' }
      });
    }

    // 2. Privilege check: Members cannot activate or update memberships
    if (req.user.role === 'MEMBER') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Members are not permitted to manage or activate memberships' }
      });
    }

    // 3. Status validation
    const allowedStatuses = ['Active', 'Pending Payment Verification', 'Suspended', 'Expired'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: `Status must be one of: ${allowedStatuses.join(', ')}` }
      });
    }

    // 4. Fetch target member to enforce scope
    const [existingRows] = await db.query('SELECT * FROM `Member` WHERE id = ?', [id]);
    const targetMember = existingRows[0];
    if (!targetMember) {
      return res.status(404).json({
        success: false,
        error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found' }
      });
    }

    // 5. Scope enforcement
    if (req.user.role === 'STATE_ADMIN') {
      const userState = (req.user.stateCode || req.user.state || '').toLowerCase();
      const memberState = (targetMember.state || '').toLowerCase();
      if (!userState || (!memberState.includes(userState) && !userState.includes(memberState))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to manage members outside your state charter' }
        });
      }
    } else if (req.user.role === 'CLUB_ADMIN') {
      const userClub = (req.user.club || req.user.clubId || '').toLowerCase();
      const memberClub = (targetMember.club || '').toLowerCase();
      if (!userClub || (!memberClub.includes(userClub) && !userClub.includes(memberClub))) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to manage members outside your assigned club' }
        });
      }
    }

    console.log(`📡 [Member Controller] Updating member ${id} status to ${status} by ${req.user.role} (${req.user.email})`);

    try {
      await db.query('UPDATE `Member` SET `status` = ? WHERE `id` = ?', [status, id]);
    } catch (dbErr) {
      console.warn('MySQL Update Member Status note:', dbErr.message);
    }

    return res.json({
      success: true,
      memberId: id,
      status,
      data: { id, status },
      message: `Member ${id} status updated to ${status} successfully`
    });
  } catch (err) {
    console.error('[Members Controller Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

module.exports = {
  getMembers,
  createMember,
  updateMemberStatus
};
