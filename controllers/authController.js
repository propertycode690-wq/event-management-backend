const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { getJwtSecret } = require('../middlewares/authMiddleware');

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, stateCode, clubId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Name, email, and password are required' }
      });
    }

    const [existing] = await db.query('SELECT * FROM `User` WHERE LOWER(email) = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email address is already registered' }
      });
    }

    // Security: Self-registration strictly creates MEMBER accounts. Privilege escalation prohibited.
    const assignedRole = 'MEMBER';
    const assignedState = stateCode || 'TX';
    const assignedClub = clubId || 'club-1';

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}`;

    await db.query(
      `INSERT INTO \`User\` (id, email, passwordHash, name, role, phone, stateCode, clubId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, passwordHash, name, assignedRole, phone || '', assignedState, assignedClub]
    );

    const secret = getJwtSecret();
    const token = jwt.sign(
      { id: userId, name, email, role: assignedRole, stateCode: assignedState, clubId: assignedClub },
      secret,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      data: {
        user: { id: userId, name, email, role: assignedRole, stateCode: assignedState, clubId: assignedClub },
        token
      },
      message: 'Account created successfully in MySQL database `club`'
    });
  } catch (err) {
    console.error('[Register Auth Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Email and password are required' }
      });
    }

    const [rows] = await db.query('SELECT * FROM `User` WHERE LOWER(email) = ?', [email.toLowerCase()]);
    const user = rows[0];

    // Real DB check: Non-existent users are rejected
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Real Bcrypt comparison: Master password bypasses removed
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const secret = getJwtSecret();
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        stateCode: user.stateCode,
        clubId: user.clubId
      },
      secret,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          stateCode: user.stateCode,
          clubId: user.clubId
        },
        token
      },
      message: 'Login successful via MySQL database `club`'
    });
  } catch (err) {
    console.error('[Login Auth Error]:', err.message);
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const userEmail = req.user.email;
    const [rows] = await db.query('SELECT id, email, name, role, phone, stateCode, clubId, createdAt FROM `User` WHERE LOWER(email) = ?', [userEmail.toLowerCase()]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found in database' }
      });
    }

    return res.json({
      success: true,
      data: rows[0],
      message: 'Member profile fetched from MySQL database `club`'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: err.message } });
  }
};

module.exports = {
  register,
  login,
  getProfile
};

