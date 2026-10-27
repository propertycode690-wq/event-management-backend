const jwt = require('jsonwebtoken');

/**
 * Retrieves the configured JWT_SECRET from environment.
 * Fails fast with a clear, safe error if missing or empty, preventing silent insecure default fallback.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty. Application startup blocked.');
  }
  return secret.trim();
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authorization token missing' }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.message && err.message.includes('FATAL CONFIGURATION ERROR')) {
      console.error('[JWT Configuration Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Authentication service configuration error' }
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' }
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission for this resource' }
      });
    }
    next();
  };
};

// Fail fast at startup in non-test mode if JWT_SECRET is not configured
if (process.env.NODE_ENV !== 'test') {
  try {
    getJwtSecret();
  } catch (startupErr) {
    console.error(startupErr.message);
    throw startupErr;
  }
}

module.exports = {
  verifyToken,
  requireRole,
  getJwtSecret,
  get JWT_SECRET() {
    return getJwtSecret();
  }
};

