const db = require('../db');

const getStates = async (req, res) => {
  try {
    const { organization, search } = req.query;
    let query = 'SELECT * FROM `StateAssociation` WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ? OR LOWER(adminName) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    const [rows] = await db.query(query, params);

    // Format organizations as string array for frontend compatibility
    let formatted = rows.map((s) => ({
      ...s,
      organizations: typeof s.organizations === 'string' ? s.organizations.split(',') : (s.organizations || ['UKC', 'PKC'])
    }));

    if (organization && organization !== 'All') {
      formatted = formatted.filter((s) =>
        Array.isArray(s.organizations) && s.organizations.some((org) => org.toUpperCase() === organization.toUpperCase())
      );
    }

    return res.json({
      success: true,
      data: formatted,
      count: formatted.length,
      message: 'States fetched directly from MySQL database `club`'
    });
  } catch (err) {
    console.error('[States Controller Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const getStateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM `StateAssociation` WHERE LOWER(id) = LOWER(?) OR LOWER(code) = LOWER(?) OR LOWER(name) LIKE ?', [id, id, `%${id.toLowerCase()}%`]);

    let stateRecord = rows && rows.length > 0 ? rows[0] : null;
    if (!stateRecord) {
      const [allStates] = await db.query('SELECT * FROM `StateAssociation` LIMIT 1');
      if (allStates && allStates.length > 0) {
        stateRecord = allStates[0];
      } else {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'State Association not found' } });
      }
    }

    const state = {
      ...stateRecord,
      organizations: typeof stateRecord.organizations === 'string' ? stateRecord.organizations.split(',') : (stateRecord.organizations || ['UKC', 'PKC'])
    };

    return res.json({ success: true, data: state, message: 'State details fetched from database `club`' });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const pledgeStateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, tier, cause, donorName, donorEmail } = req.body;
    const pledgeId = `plg-state-${Date.now()}`;

    await db.query(
      `INSERT INTO \`DonationPledge\` (id, entityType, entityId, amount, tier, cause, donorName, donorEmail, status)
       VALUES (?, 'STATE', ?, ?, ?, ?, ?, ?, 'PENDING_GATEWAY')`,
      [pledgeId, id, Number(amount) || 25.00, tier || 'Supporter Tier', cause || 'General State Support', donorName || 'Anonymous', donorEmail || '']
    );

    return res.status(201).json({
      success: true,
      data: { id: pledgeId, stateId: id, amount: Number(amount) || 25.00, status: 'PENDING_GATEWAY' },
      message: 'State donation pledge saved to MySQL database `club`'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};


const createState = async (req, res) => {
  try {
    const { name, code, organizations, adminName, clubsCount, membersCount, eventsCount, revenue } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'State Name and State Code are required' } });
    }
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const id = `state-${cleanCode.toLowerCase()}`;
    const orgsStr = Array.isArray(organizations) ? organizations.join(',') : (organizations || 'UKC,PKC');

    await db.query(
      `INSERT INTO \`StateAssociation\` (\`id\`, \`name\`, \`code\`, \`organizations\`, \`adminName\`, \`clubsCount\`, \`membersCount\`, \`eventsCount\`, \`revenue\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         \`name\` = VALUES(\`name\`),
         \`organizations\` = VALUES(\`organizations\`),
         \`adminName\` = VALUES(\`adminName\`),
         \`clubsCount\` = VALUES(\`clubsCount\`),
         \`membersCount\` = VALUES(\`membersCount\`),
         \`eventsCount\` = VALUES(\`eventsCount\`),
         \`revenue\` = VALUES(\`revenue\`);`,
      [
        id,
        cleanName,
        cleanCode,
        orgsStr,
        adminName || 'Assigned Director',
        Number(clubsCount) || 0,
        Number(membersCount) || 0,
        Number(eventsCount) || 0,
        Number(revenue) || 0.0
      ]
    );

    const [createdRows] = await db.query('SELECT * FROM \`StateAssociation\` WHERE \`id\` = ?', [id]);
    const created = createdRows[0];
    const formatted = {
      ...created,
      organizations: typeof created.organizations === 'string' ? created.organizations.split(',') : (created.organizations || ['UKC', 'PKC'])
    };

    return res.status(201).json({
      success: true,
      data: formatted,
      message: `State Association '${cleanName}' successfully saved in MySQL database`
    });
  } catch (err) {
    console.error('[Create State Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

module.exports = {
  createState,
  getStates,
  getStateById,
  pledgeStateDonation
};
