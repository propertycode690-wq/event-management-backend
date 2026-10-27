const db = require('../db');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../middlewares/authMiddleware');

/**
 * GET /api/v1/club-claims
 * Protected: Super Admin only
 * Fetches all club claims from the database ordered by creation date descending.
 */
const getClaims = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM `ClubClaim` ORDER BY `createdAt` DESC');
    return res.json({
      success: true,
      data: rows || [],
      count: (rows || []).length,
      message: 'Club claim verification requests fetched from database',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Claim Controller Error - getClaims]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * POST /api/v1/club-claims (and POST /api/v1/clubs/claims)
 * Public or Authenticated claim submission.
 * Validates required inputs, checks for duplicate active claims, persists to DB in 'Pending' status.
 * Never grants administrative roles upon submission.
 */
const submitClaim = async (req, res) => {
  try {
    const club = (req.body.club || req.body.clubName || '').trim();
    const applicant = (req.body.applicant || req.body.applicantName || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const state = (req.body.state || req.body.stateCode || 'TX').trim();
    const phone = (req.body.phone || '').trim();
    const message = (req.body.message || '').trim() || 'Official State/Club administration claim request.';

    // 1. Validate required fields
    if (!club || !applicant || !email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Club name, applicant name, and email are required'
        }
      });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'A valid email address is required'
        }
      });
    }

    // 3. Optional token verification if authorization header is provided
    let authenticatedUser = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const secret = getJwtSecret();
        authenticatedUser = jwt.verify(token, secret);
      } catch (tokenErr) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' }
        });
      }
    }

    // 4. Check for duplicate ID if custom ID was sent
    const claimId = req.body.id ? String(req.body.id).trim() : `CLM-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    if (req.body.id) {
      const [existingIdRows] = await db.query('SELECT id FROM `ClubClaim` WHERE id = ?', [claimId]);
      if (existingIdRows && existingIdRows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_CLAIM',
            message: `Claim with ID "${claimId}" already exists`
          }
        });
      }
    }

    // 5. Prevent duplicate active ('Pending') claims for the same club / organization
    const [existingActiveRows] = await db.query(
      'SELECT id, club, applicant, email FROM `ClubClaim` WHERE LOWER(club) = LOWER(?) AND claimStatus = ?',
      [club, 'Pending']
    );
    if (existingActiveRows && existingActiveRows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ACTIVE_CLAIM',
          message: `An active claim for "${club}" is already pending review`
        }
      });
    }

    // 6. Persist to database in 'Pending' status
    const submittedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const claimStatus = 'Pending';
    const verificationStatus = 'Pending Review';

    await db.query(
      `INSERT INTO \`ClubClaim\` (id, club, state, applicant, email, phone, submittedDate, claimStatus, verificationStatus, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [claimId, club, state, applicant, email, phone, submittedDate, claimStatus, verificationStatus, message]
    );

    const [persistedRows] = await db.query('SELECT * FROM `ClubClaim` WHERE id = ?', [claimId]);
    const persistedClaim = persistedRows[0] || {
      id: claimId,
      club,
      state,
      applicant,
      email,
      phone,
      submittedDate,
      claimStatus,
      verificationStatus,
      message
    };

    return res.status(201).json({
      success: true,
      data: persistedClaim,
      message: 'Claim submitted successfully to database'
    });
  } catch (err) {
    console.error('[Claim Controller Error - submitClaim]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

/**
 * PUT /api/v1/club-claims/:id
 * Protected: Super Admin only
 * Updates claim status ('Pending', 'Approved', 'Rejected').
 * Prevents claimant self-approval and persists status changes to database.
 */
const updateClaimStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { claimStatus, status } = req.body;
    const nextStatus = claimStatus || status;

    const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!nextStatus || !allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Claim status must be Pending, Approved, or Rejected' }
      });
    }

    // 1. Verify existence of claim
    const [existingRows] = await db.query('SELECT * FROM `ClubClaim` WHERE id = ?', [id]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Club claim not found' }
      });
    }

    const claim = existingRows[0];

    // 2. Prevent claimant self-approval (Privilege Escalation Guard)
    if (req.user && claim.email && req.user.email) {
      if (claim.email.toLowerCase() === req.user.email.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SELF_APPROVAL_FORBIDDEN',
            message: 'Claimants cannot approve their own claim or assign themselves administrative privileges'
          }
        });
      }
    }

    // 3. Update status in database
    const verStatus = nextStatus === 'Approved' ? 'Verified Official' : (nextStatus === 'Rejected' ? 'Rejected' : 'Pending Review');

    await db.query(
      'UPDATE `ClubClaim` SET `claimStatus` = ?, `verificationStatus` = ? WHERE `id` = ?',
      [nextStatus, verStatus, id]
    );

    const [updatedRows] = await db.query('SELECT * FROM `ClubClaim` WHERE id = ?', [id]);
    const updatedClaim = updatedRows[0] || { id, claimStatus: nextStatus, verificationStatus: verStatus };

    return res.json({
      success: true,
      data: updatedClaim,
      message: `Claim status updated to ${nextStatus} in database`
    });
  } catch (err) {
    console.error('[Claim Controller Error - updateClaimStatus]:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    });
  }
};

module.exports = {
  getClaims,
  submitClaim,
  updateClaimStatus
};
