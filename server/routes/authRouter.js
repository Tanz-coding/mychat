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

router.put('/password', requireAuth, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '请输入旧密码和新密码' });
  }
  if (newPassword.length < 3) {
    return res.status(400).json({ message: '新密码至少3位' });
  }
  await authService.changePassword(req.user.id, oldPassword, newPassword);
  res.json({ message: '密码修改成功' });
}));

router.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  const { name, avatarUrl, email } = req.body || {};
  await authService.updateProfile(req.user.id, { name, avatarUrl, email });
  const user = await authService.getUserById(req.user.id);
  res.json({ user: authService.safeUser(user) });
}));

module.exports = router;
