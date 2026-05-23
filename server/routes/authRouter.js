const express = require('express');
const jwt = require('../jwt');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/authService');

const router = express.Router();

function issue(user) {
  return {
    user,
    token: jwt.token({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl
    })
  };
}

router.post('/login', asyncHandler(async (req, res) => {
  const user = await authService.login(req.body.username || req.body.account || req.body.name, req.body.password);
  res.json(issue(user));
}));

router.post('/register', asyncHandler(async (req, res) => {
  const user = await authService.register(req.body || {});
  res.status(201).json(issue(user));
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: authService.safeUser(req.user) });
}));

module.exports = router;
