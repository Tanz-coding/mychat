const express = require('express');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const mysqlManager = require('../mysql');
const redisClient = require('../redis');
const { query } = require('../mysql');

const router = express.Router();

router.get('/about', asyncHandler(async (req, res) => {
  let pkg = {};
  try {
    pkg = require(path.resolve(__dirname, '../../package.json'));
  } catch (error) {
    pkg = {};
  }
  const counts = {
    users: 0,
    news: 0,
    comments: 0,
    friendships: 0
  };
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM news) AS news,
        (SELECT COUNT(*) FROM comments) AS comments,
        (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') AS friendships
    `);
    Object.assign(counts, rows[0] || {});
  } catch (error) {
    // Keep about page available even when optional tables are not ready.
  }
  res.json({
    name: pkg.name || 'mychat',
    version: pkg.version || '1.0.0',
    build: process.env.BUILD_VERSION || 'local-dev',
    time: Date.now(),
    counts,
    mysql: typeof mysqlManager.getStatus === 'function' ? mysqlManager.getStatus() : { ready: true },
    redis: redisClient && typeof redisClient.getStatus === 'function' ? redisClient.getStatus() : { ready: true }
  });
}));

module.exports = router;
