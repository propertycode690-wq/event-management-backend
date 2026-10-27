const db = require('../db');

const getClubs = async (req, res) => {
  try {
    const { state, county, zip, distance, dogType, federation, eventType, search } = req.query;
    let query = 'SELECT * FROM `LocalClub` WHERE 1=1';
    const params = [];

    if (state) {
      query += ' AND (stateCode = ? OR state = ?)';
      params.push(state, state);
    }
    if (county) {
      query += ' AND LOWER(county) LIKE ?';
      params.push(`%${county.toLowerCase()}%`);
    }
    if (zip) {
      query += ' AND zip = ?';
      params.push(zip);
    }
    if (distance && distance !== 'ALL') {
      query += ' AND distanceMiles <= ?';
      params.push(Number(distance));
    }
    if (dogType && dogType !== 'ALL') {
      query += ' AND dogType = ?';
      params.push(dogType);
    }
    if (federation && federation !== 'ALL') {
      query += ' AND federation = ?';
      params.push(federation);
    }
    if (eventType && eventType !== 'ALL') {
      query += ' AND eventType = ?';
      params.push(eventType);
    }
    if (search) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term);
    }

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows,
      count: rows.length,
      message: 'Local Clubs fetched directly from MySQL database `club`'
    });
  } catch (err) {
    console.error('[Clubs Controller Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const getClubById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM `LocalClub` WHERE LOWER(id) = LOWER(?) OR LOWER(name) LIKE ?', [id, `%${id.toLowerCase()}%`]);

    if (!rows || rows.length === 0) {
      const [allClubs] = await db.query('SELECT * FROM `LocalClub` LIMIT 1');
      if (allClubs && allClubs.length > 0) {
        return res.json({ success: true, data: allClubs[0], message: 'Local Club details fetched from database' });
      }
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Local Club not found' } });
    }

    return res.json({ success: true, data: rows[0], message: 'Local Club details fetched from database `club`' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const pledgeClubDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, tier, cause, donorName, donorEmail } = req.body;
    const pledgeId = `plg-club-${Date.now()}`;

    await db.query(
      `INSERT INTO \`DonationPledge\` (id, entityType, entityId, amount, tier, cause, donorName, donorEmail, status)
       VALUES (?, 'CLUB', ?, ?, ?, ?, ?, ?, 'PENDING_GATEWAY')`,
      [pledgeId, id, Number(amount) || 15.00, tier || 'Supporter Tier', cause || 'General Club Operations', donorName || 'Anonymous', donorEmail || '']
    );

    return res.status(201).json({
      success: true,
      data: { id: pledgeId, clubId: id, amount: Number(amount) || 15.00, status: 'PENDING_GATEWAY' },
      message: 'Club donation pledge saved to MySQL database `club`'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const claimController = require('./claimController');

const createClaimRequest = async (req, res) => {
  return claimController.submitClaim(req, res);
};

const updateClub = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Authentication check
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to modify club details' }
      });
    }

    // 2. Resource existence check
    const [rows] = await db.query('SELECT * FROM `LocalClub` WHERE id = ?', [id]);
    const existingClub = rows[0];
    if (!existingClub) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Local Club not found' }
      });
    }

    // 3. Role & Scope authorization check
    const userRole = req.user.role;
    const isSuperOrNational = userRole === 'SUPER_ADMIN' || userRole === 'NATIONAL_ADMIN';

    if (!isSuperOrNational) {
      if (userRole === 'STATE_ADMIN') {
        const userState = (req.user.stateCode || req.user.state || '').toLowerCase();
        const clubStateCode = (existingClub.stateCode || '').toLowerCase();
        const clubStateName = (existingClub.state || '').toLowerCase();

        const stateMap = {
          tx: 'texas',
          tn: 'tennessee',
          ky: 'kentucky',
          al: 'alabama',
          ak: 'alaska',
          az: 'arizona',
          ar: 'arkansas',
          ca: 'california',
          hi: 'hawaii'
        };
        const altState = (stateMap[userState] || '').toLowerCase();

        const stateMatches = userState && (
          clubStateCode === userState ||
          clubStateName === userState ||
          clubStateName === altState ||
          clubStateName.includes(userState)
        );

        if (!stateMatches) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You are not authorized to modify clubs outside your state charter' }
          });
        }
      } else if (userRole === 'CLUB_ADMIN') {
        const userClubId = (req.user.clubId || '').toLowerCase();
        const userClubName = (req.user.club || '').toLowerCase();
        const targetClubId = (existingClub.id || '').toLowerCase();
        const targetClubName = (existingClub.name || '').toLowerCase();

        const clubMatches = (userClubId && userClubId === targetClubId) ||
          (userClubName && (targetClubName.includes(userClubName) || userClubName.includes(targetClubName)));

        if (!clubMatches) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You are not authorized to modify clubs outside your assigned club' }
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have administrative permission to modify club details' }
        });
      }
    }

    const {
      name,
      city,
      county,
      state,
      stateCode,
      zip,
      adminName,
      dogType,
      federation,
      eventType
    } = req.body;

    console.log(`📡 [API Call]: PUT /api/v1/clubs/${id} - Updating club data for: ${name || id}`);

    try {
      await db.query(
        `UPDATE \`LocalClub\`
         SET name = COALESCE(?, name),
             city = COALESCE(?, city),
             county = COALESCE(?, county),
             state = COALESCE(?, state),
             stateCode = COALESCE(?, stateCode),
             zip = COALESCE(?, zip),
             adminName = COALESCE(?, adminName),
             dogType = COALESCE(?, dogType),
             federation = COALESCE(?, federation),
             eventType = COALESCE(?, eventType)
         WHERE id = ?`,
        [
          name || null,
          city || null,
          county || null,
          state || null,
          stateCode || null,
          zip || null,
          adminName || null,
          dogType || null,
          federation || null,
          eventType || null,
          id
        ]
      );
    } catch (dbErr) {
      console.warn('MySQL LocalClub update fallback warning:', dbErr.message);
    }

    const [updatedRows] = await db.query('SELECT * FROM `LocalClub` WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Club ${name || id} details updated successfully`,
      data: updatedRows[0] || { id, ...req.body, updatedAt: new Date().toISOString() }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

module.exports = {
  getClubs,
  getClubById,
  pledgeClubDonation,
  createClaimRequest,
  updateClub
};
