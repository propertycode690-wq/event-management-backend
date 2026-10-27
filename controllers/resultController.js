const db = require('../db');

/**
 * GET /api/v1/results
 * Retrieve sanctioned hunt results from MySQL / isolated SQLite database.
 */
const getResults = async (req, res) => {
  try {
    const { eventId, club, state, search } = req.query;

    // Ensure CompetitionResult table exists in the active database engine
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS \`CompetitionResult\` (
          \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
          \`eventId\` VARCHAR(191) DEFAULT NULL,
          \`eventName\` VARCHAR(191) NOT NULL,
          \`club\` VARCHAR(191) DEFAULT NULL,
          \`state\` VARCHAR(191) DEFAULT NULL,
          \`stateCode\` VARCHAR(10) DEFAULT NULL,
          \`placement\` VARCHAR(50) DEFAULT NULL,
          \`place\` INT DEFAULT 1,
          \`winnerDog\` VARCHAR(191) NOT NULL,
          \`winnerDogReg\` VARCHAR(191) DEFAULT NULL,
          \`breed\` VARCHAR(191) DEFAULT 'Coonhound',
          \`owner\` VARCHAR(191) DEFAULT NULL,
          \`participant\` VARCHAR(191) NOT NULL,
          \`score\` VARCHAR(50) DEFAULT '0 Pts',
          \`date\` VARCHAR(50) DEFAULT NULL,
          \`status\` VARCHAR(50) DEFAULT 'Published',
          \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (_) {}

    let query = 'SELECT * FROM `CompetitionResult` WHERE 1=1';
    const params = [];

    if (eventId) {
      query += ' AND eventId = ?';
      params.push(eventId);
    }
    if (club) {
      query += ' AND LOWER(club) LIKE ?';
      params.push(`%${club.toLowerCase()}%`);
    }
    if (state) {
      query += ' AND (LOWER(state) = ? OR LOWER(stateCode) = ?)';
      params.push(state.toLowerCase(), state.toLowerCase());
    }
    if (search) {
      query += ' AND (LOWER(eventName) LIKE ? OR LOWER(winnerDog) LIKE ? OR LOWER(participant) LIKE ? OR LOWER(owner) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY createdAt DESC';

    const [rows] = await db.query(query, params);

    return res.json({
      success: true,
      data: rows || [],
      count: (rows || []).length,
      message: 'Competition results fetched from database'
    });
  } catch (err) {
    console.error('[Get Results Error]:', err.message);
    return res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Competition results fallback: ' + err.message
    });
  }
};

/**
 * POST /api/v1/results
 * Publish and persist official trial placement and score to database.
 */
const createResult = async (req, res) => {
  try {
    // 1. Authentication check
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to publish competition results' }
      });
    }

    const { role } = req.user;
    const ALLOWED_ADMINS = ['SUPER_ADMIN', 'NATIONAL_ADMIN', 'STATE_ADMIN', 'CLUB_ADMIN', 'EVENT_ADMIN'];
    if (!ALLOWED_ADMINS.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Ordinary members cannot publish competition results' }
      });
    }

    // 2. Validate inputs
    const {
      eventId,
      eventName,
      place,
      placement,
      participant,
      owner,
      dog,
      winnerDog,
      winnerDogReg,
      breed,
      score,
      date,
      status
    } = req.body;

    const effectiveEventName = eventName || '';
    const effectivePlacement = placement || (place ? `#${place} Place` : '');
    const effectivePlace = place ? Number(place) : (parseInt(String(placement || '').replace(/\D/g, ''), 10) || 1);
    const effectiveParticipant = participant || owner || '';
    const effectiveDog = winnerDog || dog || '';
    const effectiveScore = score || '0 Pts';

    if (!effectiveEventName && !eventId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Event ID or Event Name is required' }
      });
    }
    if (!effectiveParticipant) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Participant or owner name is required' }
      });
    }
    if (!effectiveDog) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Dog name is required' }
      });
    }

    // 3. Resolve parent event if eventId provided
    let clubName = req.body.club || '';
    let stateName = req.body.state || '';
    let stateCode = req.body.stateCode || '';
    let finalEventName = effectiveEventName;

    if (eventId) {
      const [events] = await db.query('SELECT * FROM `Event` WHERE id = ?', [eventId]);
      const eventRecord = events[0];
      if (!eventRecord) {
        return res.status(404).json({
          success: false,
          error: { code: 'EVENT_NOT_FOUND', message: `Event #${eventId} not found` }
        });
      }

      // Role & Scope Check
      if (role === 'STATE_ADMIN') {
        const userState = (req.user.stateCode || req.user.state || '').toLowerCase();
        const evState = (eventRecord.stateCode || eventRecord.state || '').toLowerCase();
        if (!userState || (!evState.includes(userState) && !userState.includes(evState))) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You are not authorized to publish results for events outside your state' }
          });
        }
      } else if (role === 'CLUB_ADMIN' || role === 'EVENT_ADMIN') {
        const userClub = (req.user.club || req.user.clubId || '').toLowerCase();
        const evClub = (eventRecord.club || eventRecord.clubId || '').toLowerCase();
        if (!userClub || (!evClub.includes(userClub) && !userClub.includes(evClub))) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You are not authorized to publish results for events outside your assigned club' }
          });
        }
      }

      finalEventName = eventRecord.name || finalEventName;
      clubName = clubName || eventRecord.club || '';
      stateName = stateName || eventRecord.state || '';
      stateCode = stateCode || eventRecord.stateCode || '';
    } else {
      // If no eventId, check user role scope against submitted club/state
      if (role === 'CLUB_ADMIN') {
        clubName = clubName || req.user.club || req.user.clubId || '';
      }
      if (role === 'STATE_ADMIN') {
        stateCode = stateCode || req.user.stateCode || req.user.state || '';
      }
    }

    // 4. Duplicate Check: Prevent duplicate placement entry for same event
    if (eventId) {
      const [duplicates] = await db.query(
        `SELECT id FROM \`CompetitionResult\`
         WHERE eventId = ? AND (place = ? OR placement = ?) AND (LOWER(winnerDog) = ? OR LOWER(participant) = ?)`,
        [eventId, effectivePlace, effectivePlacement, effectiveDog.toLowerCase(), effectiveParticipant.toLowerCase()]
      );
      if (duplicates && duplicates.length > 0) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_RESULT', message: 'A result for this placement and participant already exists for this event' }
        });
      }
    }

    // 5. Insert into Database
    const resultId = req.body.id || `res-${Date.now()}`;
    const resultDate = date || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const resultStatus = status || 'Published';

    await db.query(
      `INSERT INTO \`CompetitionResult\`
        (id, eventId, eventName, club, state, stateCode, placement, place, winnerDog, winnerDogReg, breed, owner, participant, score, date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resultId,
        eventId || null,
        finalEventName,
        clubName,
        stateName,
        stateCode,
        effectivePlacement,
        effectivePlace,
        effectiveDog,
        winnerDogReg || '',
        breed || 'Coonhound',
        effectiveParticipant,
        effectiveParticipant,
        effectiveScore,
        resultDate,
        resultStatus
      ]
    );

    const [createdRows] = await db.query('SELECT * FROM `CompetitionResult` WHERE id = ?', [resultId]);
    const created = createdRows[0];

    return res.status(201).json({
      success: true,
      data: created,
      message: 'Competition result published and saved to database successfully'
    });
  } catch (err) {
    console.error('[Create Result Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

module.exports = {
  getResults,
  createResult
};
