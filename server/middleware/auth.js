const jwt = require('../jwt');
const asyncHandler = require('./asyncHandler');
const authService = require('../services/authService');

function extractToken(req) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  if (req.headers['token']) {
    return req.headers['token'];
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.data) {
    req.user = null;
    return next();
  }
  try {
    req.user = await authService.getUserFromTokenData(decoded.data);
  } catch (err) {
    console.error('Auth optional check failed', err.message);
    req.user = null;
  }
  return next();
});

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  const decoded = jwt.decode(token);
  if (!decoded || !decoded.data) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  try {
    req.user = await authService.getUserFromTokenData(decoded.data);
    if (!req.user) {
      return res.status(401).json({ message: 'Invalid token user' });
    }
  } catch (err) {
    console.error('Auth failed', err.message);
    return res.status(err.status || 500).json({ message: 'Authentication failed' });
  }
  return next();
});

const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator permission required' });
  }
  return next();
});

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin
};
