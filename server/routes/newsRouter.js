const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const rateLimit = require('../middleware/rateLimit');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');
const newsService = require('../services/newsService');

const router = express.Router();

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const data = await newsService.listNews({
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || undefined,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
    keyword: req.query.keyword || undefined,
    status: req.query.status || undefined,
    startDate: req.query.startDate || undefined,
    endDate: req.query.endDate || undefined,
    sort: req.query.sort || 'newest'
  });
  res.json(data);
}));

router.get('/hot', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const data = await newsService.getHotNews(limit);
  res.json(data);
}));

router.get('/recent', asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const data = await newsService.getRecentNews(limit);
  res.json(data);
}));

router.get('/stats', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await newsService.getStats();
  res.json(data);
}));

router.get('/audit/logs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 200;
  const data = await newsService.getAuditLogs(limit);
  res.json(data);
}));

router.get('/categories', asyncHandler(async (req, res) => {
  const data = await newsService.listCategories();
  res.json(data);
}));

router.post('/categories', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = await newsService.createCategory(req.body);
  await newsService.recordAudit(req.user.id, 'create_category', 'category', id, req.body);
  res.status(201).json({ id });
}));

router.put('/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await newsService.updateCategory(id, req.body);
  await newsService.recordAudit(req.user.id, 'update_category', 'category', id, req.body);
  res.json({ id });
}));

router.delete('/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await newsService.deleteCategory(id);
  await newsService.recordAudit(req.user.id, 'delete_category', 'category', id, null);
  res.status(204).end();
}));

router.get('/admin/backup', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const info = await newsService.getBackupInfo();
  res.json(info);
}));

router.post('/admin/backup', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const meta = await newsService.createBackup(req.user);
  await newsService.recordAudit(req.user.id, 'backup_news', 'backup', null, meta);
  res.json(meta);
}));

router.post('/admin/restore', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const result = await newsService.restoreBackup(req.user);
  await newsService.recordAudit(req.user.id, 'restore_news', 'backup', null, result);
  res.json(result);
}));

router.post('/admin/reset', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (req.user.username !== 'root') {
    return res.status(403).json({ message: '仅 root 用户可以执行该操作' });
  }
  const result = await newsService.resetNewsData(req.user);
  await newsService.recordAudit(req.user.id, 'reset_news', 'maintenance', null, result);
  res.json(result);
}));

router.post('/admin/seed', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  if (req.user.username !== 'root') {
    return res.status(403).json({ message: '仅 root 用户可以生成测试数据' });
  }
  const result = await newsService.seedNewsData(req.user, req.body || {});
  await newsService.recordAudit(req.user.id, 'seed_news', 'maintenance', null, result);
  res.json(result);
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { id, username, role, avatar_url: avatarUrl } = req.user;
  res.json({ id, username, role, avatarUrl });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const data = await newsService.getNewsById(id);
  if (!data) {
    return res.status(404).json({ message: 'News not found' });
  }
  res.json(data);
}));

router.post('/', requireAuth, rateLimit, asyncHandler(async (req, res) => {
  const payload = req.body;
  if (!payload.title || !payload.content || !payload.categoryId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  payload.slug = payload.slug || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const id = await newsService.createNews(payload, req.user);
    if (req.user.role === 'admin') {
      await newsService.recordAudit(req.user.id, 'create_news', 'news', id, payload);
    }
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '新闻标识已存在，请稍后重试' });
    }
    throw err;
  }
}));

router.put('/:id', requireAuth, rateLimit, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  try {
    await newsService.updateNews(id, req.body, req.user);
    if (req.user.role === 'admin') {
      await newsService.recordAudit(req.user.id, 'update_news', 'news', id, req.body);
    }
    res.json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '新闻标识已存在，请更换后重试' });
    }
    throw err;
  }
}));

router.delete('/:id', requireAuth, rateLimit, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await newsService.deleteNews(id, req.user);
  if (req.user.role === 'admin') {
    await newsService.recordAudit(req.user.id, 'delete_news', 'news', id, null);
  }
  res.status(204).end();
}));

router.post('/:id/views', rateLimit, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await newsService.incrementView(id);
  res.status(204).end();
}));

router.get('/:id/comments', optionalAuth, asyncHandler(async (req, res) => {
  const newsId = Number(req.params.id);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const data = await newsService.listComments(newsId, page, pageSize);
  res.json(data);
}));

router.post('/:id/comments', requireAuth, rateLimit, asyncHandler(async (req, res) => {
  const newsId = Number(req.params.id);
  if (!req.body.content) {
    return res.status(400).json({ message: 'Comment content required' });
  }
  await newsService.createComment(newsId, req.user, req.body.content);
  res.status(201).end();
}));

router.delete('/:id/comments/:commentId', requireAuth, rateLimit, asyncHandler(async (req, res) => {
  const newsId = Number(req.params.id);
  const commentId = Number(req.params.commentId);
  await newsService.deleteComment(newsId, commentId, req.user);
  if (req.user.role === 'admin') {
    await newsService.recordAudit(req.user.id, 'delete_comment', 'comment', commentId, null);
  }
  res.status(204).end();
}));

module.exports = router;
