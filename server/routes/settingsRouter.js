const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const settingsService = require('../services/settingsService');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.user.id);
  res.json({ settings });
}));

router.put('/', requireAuth, asyncHandler(async (req, res) => {
  const settings = await settingsService.saveSettings(req.user.id, req.body || {});
  res.json({ settings });
}));

module.exports = router;
