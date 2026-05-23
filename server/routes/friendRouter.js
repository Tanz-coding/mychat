const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const friendService = require('../services/friendService');

const router = express.Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const friends = await friendService.listForUser(req.user.id);
  res.json({ friends });
}));

router.post('/request', requireAuth, asyncHandler(async (req, res) => {
  const targetId = req.body.targetId || req.body.id;
  const result = await friendService.requestFriend(req.user.id, targetId);
  res.json(result);
}));

router.post('/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const result = await friendService.acceptFriend(req.user.id, req.params.id);
  res.json(result);
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await friendService.deleteFriend(req.user.id, req.params.id);
  res.json(result);
}));

module.exports = router;
