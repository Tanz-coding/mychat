const express = require('express');
const { guid, getNetworkIPv4 } = require('../utils');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const jwt = require('../jwt');

const router = express.Router();

// In-memory QR session store
const sessions = new Map();
const SESSION_TTL = 120_000; // 120 seconds

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, 30_000);

// GET /api/auth/qr/generate — desktop requests a QR session (public: user not logged in yet)
router.get('/generate', asyncHandler(async (req, res) => {
  const sessionId = guid();
  const host = `http://${getNetworkIPv4().address}:${process.env.PORT || 3000}`;

  sessions.set(sessionId, {
    status: 'pending',
    createdAt: Date.now()
  });

  res.json({ sessionId, host });
}));

// POST /api/auth/qr/confirm — mobile confirms the scan (requires auth)
router.post('/confirm', requireAuth, asyncHandler(async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ message: '缺少 sessionId' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ message: '二维码已过期，请刷新后重试' });
  }

  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(sessionId);
    return res.status(404).json({ message: '二维码已过期，请刷新后重试' });
  }

  session.status = 'confirmed';
  session.confirmedAt = Date.now();
  session.userId = req.user.id;
  session.username = req.user.username;
  session.role = req.user.role;
  session.avatarUrl = req.user.avatarUrl || req.user.avatar_url;

  // Issue a token for the desktop
  const desktopToken = jwt.token({
    id: req.user.id,
    username: req.user.username,
    name: req.user.name || req.user.username,
    role: req.user.role,
    avatarUrl: req.user.avatarUrl || req.user.avatar_url
  });

  res.json({
    status: 'confirmed',
    user: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name || req.user.username,
      role: req.user.role,
      avatarUrl: req.user.avatarUrl || req.user.avatar_url
    }
  });
}));

// GET /api/auth/qr/status/:id — desktop polls for confirmation (public)
router.get('/status/:id', asyncHandler(async (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.json({ status: 'expired' });
  }

  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(req.params.id);
    return res.json({ status: 'expired' });
  }

  if (session.status === 'confirmed') {
    const desktopToken = jwt.token({
      id: session.userId,
      username: session.username,
      name: session.username,
      role: session.role || 'user',
      avatarUrl: session.avatarUrl || ''
    });

    const result = {
      status: 'confirmed',
      token: desktopToken,
      user: {
        id: session.userId,
        username: session.username,
        role: session.role || 'user',
        avatarUrl: session.avatarUrl || ''
      }
    };

    sessions.delete(req.params.id);
    return res.json(result);
  }

  res.json({ status: session.status });
}));

module.exports = router;
