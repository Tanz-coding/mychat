const redis = require('../redis');
const { loadConfig } = require('../config');
const asyncHandler = require('./asyncHandler');

const cfg = loadConfig();
const rateCfg = cfg.news && cfg.news.rateLimit ? cfg.news.rateLimit : { windowSeconds: 60, maxRequests: 120 };

module.exports = asyncHandler(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
  const key = `rate:${ip}`;
  const ttl = rateCfg.windowSeconds;
  const limit = rateCfg.maxRequests;
  const count = await redis.multi().incr(key).expire(key, ttl).exec();
  const current = Array.isArray(count) && count[0] ? count[0][1] : 0;
  if (current > limit) {
    return res.status(429).json({ message: 'Too many requests, slow down.' });
  }
  return next();
});
