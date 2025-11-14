const crypto = require('crypto');
const jwt = require('../jwt');
const { query } = require('../mysql');
const asyncHandler = require('./asyncHandler');

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

async function ensurePersistentUser(profile) {
  if (!profile || !profile.name) {
    throw Object.assign(new Error('Invalid user profile'), { status: 401 });
  }
  const username = profile.name;
  const rows = await query('SELECT id, username, role, avatar_url FROM users WHERE username = ?', [username]);
  if (rows.length > 0) {
    return rows[0];
  }
  const passwordHash = crypto.createHash('sha256').update(`temp-${username}`).digest('hex');
  const avatar = profile.avatarUrl || '/static/img/avatar/default.png';
  const role = username === 'root' ? 'admin' : 'user';
  await query(
    'INSERT INTO users (username, password_hash, role, avatar_url, email) VALUES (?,?,?,?,?)',
    [username, passwordHash, role, avatar, null]
  );
  const inserted = await query('SELECT id, username, role, avatar_url FROM users WHERE username = ?', [username]);
  return inserted[0];
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
    const persistentUser = await ensurePersistentUser(decoded.data);
    req.user = persistentUser;
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
    const persistentUser = await ensurePersistentUser(decoded.data);
    req.user = persistentUser;
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