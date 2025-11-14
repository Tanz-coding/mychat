const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { query, getConnection } = require('../mysql');
const redis = require('../redis');
const { loadConfig } = require('../config');

const config = loadConfig();
const newsConfig = config.news || {};
const BACKUP_DIR = path.resolve(__dirname, '../backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'news-backup.json');

const SEED_DEFAULTS = {
  users: 24,
  categories: 6,
  news: 36,
  commentsPerNews: 3
};

const SEED_CATEGORY_NAMES = [
  '科技创新',
  '行业观察',
  '市场热点',
  '深度专栏',
  '政策速递',
  '社区故事',
  '产品快讯',
  '案例分析'
];

const SEED_TITLE_PREFIX = ['聚焦', '观察', '解读', '盘点', '速览', '前瞻'];
const SEED_TITLE_TOPICS = ['人工智能', '数据安全', '云原生', '前沿科技', '产业升级', '团队协作', '安全运营', '用户增长'];
const SEED_SUMMARY_SNIPPETS = [
  '本文整理了近期行业重点趋势，适合团队快速了解背景。',
  '结合最近的客户反馈，梳理出值得跟进的方向与机会。',
  '从产品、技术、市场三大维度，总结了可执行的优化建议。',
  '这篇文章提炼了专家访谈的核心观点，可作为下一步规划参考。',
  '围绕用户真实场景，分析了落地过程中遇到的典型问题与解法。'
];
const SEED_BODY_PARAGRAPHS = [
  '随着业务规模增长，团队在数据治理和安全合规方面的需求愈发突出，选择合适的工具组合能够显著降低试错成本。',
  '多位一线负责人分享了在迭代过程中如何快速试点、验证和量化收益，为后续扩展提供了可复用的路径。',
  '围绕“人、流程、技术”三个层面梳理关键动作，可以帮助团队定位瓶颈、衡量投入产出比。',
  '结合近半年行业案例，我们总结了四类值得关注的风险点，并给出对应的监控指标。',
  '从企业文化与协作流程角度切入，强调跨团队共建对项目成功率的影响。',
  '展望未来几个季度，生态伙伴的角色会更加突出，提前布局合作机制能够形成差异化优势。'
];
const SEED_COMMENT_TEMPLATES = [
  '内容很扎实，已经分享给团队学习。',
  '案例部分启发很大，期待后续更新。',
  '正在落地相关方案，这些建议非常及时。',
  '对趋势判断很认同，感谢整理。',
  '细节全面，收藏了。'
];

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (err) {
    if (err && err.code !== 'EEXIST') {
      throw err;
    }
  }
}

async function removeBackupFile() {
  try {
    await fs.unlink(BACKUP_FILE);
    return true;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}

function randomFrom(list) {
  if (!Array.isArray(list) || !list.length) {
    return '';
  }
  return list[Math.floor(Math.random() * list.length)];
}

function hashPassword(plain) {
  return crypto.createHash('sha256').update(String(plain || '')).digest('hex');
}

function buildSeedTitle(index = 0) {
  const prefix = SEED_TITLE_PREFIX[index % SEED_TITLE_PREFIX.length] || randomFrom(SEED_TITLE_PREFIX);
  const topic = randomFrom(SEED_TITLE_TOPICS);
  return `${prefix}${topic}`;
}

function buildSeedSummary() {
  return randomFrom(SEED_SUMMARY_SNIPPETS);
}

function buildSeedContent() {
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(`<p>${randomFrom(SEED_BODY_PARAGRAPHS)}</p>`);
  }
  return segments.join('');
}

function buildSeedComment() {
  return randomFrom(SEED_COMMENT_TEMPLATES);
}

async function clearNewsCaches() {
  try {
    const keys = await redis.keys('news:*');
    if (Array.isArray(keys) && keys.length) {
      await redis.del(...keys);
    }
    await redis.del('recent:list');
    await redis.del('hot:zset');
    await redis.del('metrics:views');
  } catch (err) {
    console.warn('Failed to clear news cache state', err.message);
  }
}

async function collectBackupPayload(admin) {
  const [categoriesRaw, newsRaw, attachmentsRaw, commentsRaw, metricsRaw] = await Promise.all([
    query('SELECT * FROM news_categories ORDER BY id ASC'),
    query('SELECT * FROM news ORDER BY id ASC'),
    query('SELECT * FROM news_attachments ORDER BY id ASC'),
    query('SELECT * FROM comments ORDER BY id ASC'),
    query('SELECT * FROM news_metrics ORDER BY news_id ASC')
  ]);

  const payload = {
    meta: {
      createdAt: new Date().toISOString(),
      adminId: admin.id,
      adminName: admin.username || 'admin'
    },
    categories: JSON.parse(JSON.stringify(categoriesRaw || [])),
    news: JSON.parse(JSON.stringify(newsRaw || [])),
    attachments: JSON.parse(JSON.stringify(attachmentsRaw || [])),
    comments: JSON.parse(JSON.stringify(commentsRaw || [])),
    metrics: JSON.parse(JSON.stringify(metricsRaw || []))
  };

  return payload;
}

async function ensureRootAccount(conn) {
  const [rows] = await conn.query('SELECT id FROM users WHERE username = ?', ['root']);
  if (rows.length > 0) {
    return rows[0].id;
  }
  const [result] = await conn.query(
    'INSERT INTO users (username, password_hash, role, avatar_url, email) VALUES (?,?,?,?,?)',
    ['root', hashPassword('root@123'), 'admin', '/static/img/avatar/admin.png', 'root@example.com']
  );
  return result.insertId;
}

async function getBackupInfo() {
  try {
    const raw = await fs.readFile(BACKUP_FILE, 'utf8');
    const stat = await fs.stat(BACKUP_FILE);
    const payload = JSON.parse(raw);
    const meta = payload.meta || {};
    return {
      exists: true,
      createdAt: meta.createdAt || stat.mtime.toISOString(),
      adminId: meta.adminId || null,
      adminName: meta.adminName || null,
      size: stat.size,
      lastRestoreAt: meta.lastRestoreAt || null,
      lastRestoreAdminId: meta.lastRestoreAdminId || null,
      lastRestoreAdminName: meta.lastRestoreAdminName || null
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { exists: false };
    }
    throw err;
  }
}

async function createBackup(admin) {
  await ensureBackupDir();
  const payload = await collectBackupPayload(admin);
  await fs.writeFile(BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');
  const stat = await fs.stat(BACKUP_FILE);
  return {
    exists: true,
    createdAt: payload.meta.createdAt,
    adminId: payload.meta.adminId,
    adminName: payload.meta.adminName,
    size: stat.size,
    lastRestoreAt: payload.meta.lastRestoreAt || null,
    lastRestoreAdminId: payload.meta.lastRestoreAdminId || null,
    lastRestoreAdminName: payload.meta.lastRestoreAdminName || null
  };
}

async function restoreBackup(admin) {
  await ensureBackupDir();
  let raw;
  try {
    raw = await fs.readFile(BACKUP_FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw Object.assign(new Error('尚未生成备份，请先执行备份操作'), { status: 404 });
    }
    throw err;
  }

  const payload = JSON.parse(raw);
  const categories = payload.categories || [];
  const news = payload.news || [];
  const attachments = payload.attachments || [];
  const comments = payload.comments || [];
  const metrics = payload.metrics || [];

  const conn = await getConnection();
  let foreignKeyDisabled = false;
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    foreignKeyDisabled = true;
    await conn.query('DELETE FROM news_attachments');
    await conn.query('DELETE FROM comments');
    await conn.query('DELETE FROM news_metrics');
    await conn.query('DELETE FROM news');
    await conn.query('DELETE FROM news_categories');

    if (categories.length) {
      const values = categories.map(item => [
        item.id,
        item.name,
        item.description || null,
        item.created_at || null,
        item.updated_at || null
      ]);
      await conn.query(
        'INSERT INTO news_categories (id, name, description, created_at, updated_at) VALUES ?',
        [values]
      );
    }

    if (news.length) {
      const values = news.map(item => [
        item.id,
        item.title,
        item.slug,
        item.summary || null,
        item.content,
        item.author_id,
        item.category_id,
        item.status,
        item.cover_image || null,
        item.published_at || null,
        item.created_at || null,
        item.updated_at || null
      ]);
      await conn.query(
        `INSERT INTO news (id, title, slug, summary, content, author_id, category_id, status, cover_image, published_at, created_at, updated_at)
         VALUES ?`,
        [values]
      );
    }

    if (attachments.length) {
      const values = attachments.map(item => [
        item.id,
        item.news_id,
        item.filename,
        item.file_path,
        item.file_type,
        item.file_size,
        item.uploaded_at || null
      ]);
      await conn.query(
        'INSERT INTO news_attachments (id, news_id, filename, file_path, file_type, file_size, uploaded_at) VALUES ?',
        [values]
      );
    }

    if (comments.length) {
      const values = comments.map(item => [
        item.id,
        item.news_id,
        item.user_id,
        item.content,
        item.is_deleted,
        item.created_at || null,
        item.updated_at || null
      ]);
      await conn.query(
        'INSERT INTO comments (id, news_id, user_id, content, is_deleted, created_at, updated_at) VALUES ?',
        [values]
      );
    }

    if (metrics.length) {
      const values = metrics.map(item => [
        item.news_id,
        item.view_count || 0,
        item.comment_count || 0,
        item.like_count || 0,
        item.score || 0,
        item.updated_at || null
      ]);
      await conn.query(
        'INSERT INTO news_metrics (news_id, view_count, comment_count, like_count, score, updated_at) VALUES ?',
        [values]
      );
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    foreignKeyDisabled = false;
    await conn.commit();
  } catch (err) {
    if (foreignKeyDisabled) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkErr) {
        console.warn('Failed to restore foreign key checks', fkErr.message);
      }
      foreignKeyDisabled = false;
    }
    await conn.rollback();
    throw err;
  } finally {
    if (foreignKeyDisabled) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkErr) {
        console.warn('Failed to reset foreign key checks in finally', fkErr.message);
      }
    }
    conn.release();
  }

  await clearNewsCaches();

  const restoredAt = new Date().toISOString();
  const meta = payload.meta || {};
  meta.lastRestoreAt = restoredAt;
  meta.lastRestoreAdminId = admin.id;
  meta.lastRestoreAdminName = admin.username || 'admin';
  payload.meta = meta;
  await fs.writeFile(BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');

  return {
    restoredAt,
    adminId: admin.id,
    adminName: admin.username || 'admin',
    counts: {
      categories: categories.length,
      news: news.length,
      attachments: attachments.length,
      comments: comments.length,
      metrics: metrics.length
    }
  };
}

async function resetNewsData(admin) {
  const conn = await getConnection();
  let foreignKeyDisabled = false;
  const snapshotTime = new Date().toISOString();
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    foreignKeyDisabled = true;

    const [categoryRows] = await conn.query('SELECT COUNT(1) AS total FROM news_categories');
    const [newsRows] = await conn.query('SELECT COUNT(1) AS total FROM news');
    const [attachmentRows] = await conn.query('SELECT COUNT(1) AS total FROM news_attachments');
    const [commentRows] = await conn.query('SELECT COUNT(1) AS total FROM comments');
    const [metricRows] = await conn.query('SELECT COUNT(1) AS total FROM news_metrics');

    await conn.query('DELETE FROM news_attachments');
    await conn.query('DELETE FROM comments');
    await conn.query('DELETE FROM news_metrics');
    await conn.query('DELETE FROM news');
    await conn.query('DELETE FROM news_categories');

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    foreignKeyDisabled = false;
    await conn.commit();

    await clearNewsCaches();
    const backupRemoved = await removeBackupFile();

    return {
      resetAt: snapshotTime,
      adminId: admin.id,
      adminName: admin.username || 'admin',
      counts: {
        categories: categoryRows[0] ? Number(categoryRows[0].total) : 0,
        news: newsRows[0] ? Number(newsRows[0].total) : 0,
        attachments: attachmentRows[0] ? Number(attachmentRows[0].total) : 0,
        comments: commentRows[0] ? Number(commentRows[0].total) : 0,
        metrics: metricRows[0] ? Number(metricRows[0].total) : 0
      },
      backupRemoved
    };
  } catch (err) {
    if (foreignKeyDisabled) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkErr) {
        console.warn('Failed to restore foreign key checks during reset rollback', fkErr.message);
      }
      foreignKeyDisabled = false;
    }
    await conn.rollback();
    throw err;
  } finally {
    if (foreignKeyDisabled) {
      try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkErr) {
        console.warn('Failed to reset foreign key checks in reset finally', fkErr.message);
      }
    }
    conn.release();
  }
}

async function seedNewsData(admin, overrides = {}) {
  if (!admin || admin.username !== 'root') {
    throw Object.assign(new Error('仅 root 用户可以生成测试数据'), { status: 403 });
  }

  const options = Object.assign({}, SEED_DEFAULTS, overrides || {});
  const resetSummary = await resetNewsData(admin);

  const conn = await getConnection();
  const summary = {
    users: 0,
    categories: 0,
    news: 0,
    comments: 0
  };
  const seededAt = new Date().toISOString();
  try {
    await conn.beginTransaction();
    await ensureRootAccount(conn);
    await conn.query('DELETE FROM users WHERE username LIKE "tester_%"');

    const testerRows = [];
    for (let i = 0; i < options.users; i++) {
      const username = `tester_${i + 1}`;
      testerRows.push([
        username,
        hashPassword('123456'),
        'user',
        `/static/img/avatar/${(i % 10) + 1}.png`,
        `${username}@example.com`
      ]);
    }
    if (testerRows.length) {
      const [result] = await conn.query(
        'INSERT INTO users (username, password_hash, role, avatar_url, email) VALUES ?',
        [testerRows]
      );
      summary.users = result && result.affectedRows ? result.affectedRows : testerRows.length;
    }

    const [testerUsers] = await conn.query(
      'SELECT id FROM users WHERE username LIKE "tester_%" ORDER BY id ASC'
    );
    const testerIds = testerUsers.map(item => item.id);
    if (!testerIds.length) {
      throw new Error('测试用户创建失败');
    }

    const chosenCategories = [];
    for (let i = 0; i < options.categories; i++) {
      const base = SEED_CATEGORY_NAMES[i % SEED_CATEGORY_NAMES.length] || `专题 ${i + 1}`;
      const label = i < SEED_CATEGORY_NAMES.length ? base : `${base} ${Math.floor(i / SEED_CATEGORY_NAMES.length) + 1}`;
      chosenCategories.push(label);
    }
    const categoryRows = chosenCategories.map(name => [name, `${name} 相关资讯`]);
    if (categoryRows.length) {
      const [categoryResult] = await conn.query(
        'INSERT INTO news_categories (name, description) VALUES ?',
        [categoryRows]
      );
      summary.categories = categoryResult && categoryResult.affectedRows ? categoryResult.affectedRows : categoryRows.length;
    }

    const [categoryRecords] = await conn.query('SELECT id FROM news_categories ORDER BY id ASC');
    const categoryIds = categoryRecords.map(item => item.id);
    if (!categoryIds.length) {
      throw new Error('分类创建失败');
    }

    const newsRows = [];
    const baseTime = Date.now();
    for (let i = 0; i < options.news; i++) {
      const title = buildSeedTitle(i);
      const slug = `seed-${baseTime}-${i}-${Math.random().toString(16).slice(2, 8)}`;
      const summaryText = buildSeedSummary();
      const contentHtml = buildSeedContent();
      const authorId = testerIds[i % testerIds.length];
      const categoryId = categoryIds[i % categoryIds.length];
      const published = new Date(baseTime - (i % 15) * 86400000 - (i % 6) * 3600000);
      newsRows.push([
        title,
        slug,
        summaryText,
        contentHtml,
        authorId,
        categoryId,
        'published',
        null,
        published,
        published
      ]);
    }

    let newsIds = [];
    if (newsRows.length) {
      const [newsResult] = await conn.query(
        'INSERT INTO news (title, slug, summary, content, author_id, category_id, status, cover_image, published_at, created_at) VALUES ?',
        [newsRows]
      );
      summary.news = newsResult && newsResult.affectedRows ? newsResult.affectedRows : newsRows.length;
      const startId = newsResult.insertId;
      newsIds = Array.from({ length: summary.news }, (_, idx) => startId + idx);
    }

    const commentRows = [];
    const commentCounter = new Map();
    if (newsIds.length) {
      newsIds.forEach((newsId, idx) => {
        const target = Math.max(1, Math.min(options.commentsPerNews, testerIds.length));
        for (let i = 0; i < target; i++) {
          const userId = testerIds[(idx + i) % testerIds.length];
          const content = buildSeedComment();
          commentRows.push([newsId, userId, content, 0]);
          commentCounter.set(newsId, (commentCounter.get(newsId) || 0) + 1);
        }
      });
      if (commentRows.length) {
        const [commentResult] = await conn.query(
          'INSERT INTO comments (news_id, user_id, content, is_deleted) VALUES ?',
          [commentRows]
        );
        summary.comments = commentResult && commentResult.affectedRows ? commentResult.affectedRows : commentRows.length;
      }
      const metricRows = newsIds.map((id, idx) => {
        const viewCount = 180 + (idx % 10) * 45;
        const likeCount = 50 + (idx % 5) * 12;
        const commentCount = commentCounter.get(id) || 0;
        const score = viewCount * 0.3 + commentCount * 2 + likeCount * 0.5;
        return [id, viewCount, commentCount, likeCount, Number(score.toFixed(2))];
      });
      if (metricRows.length) {
        await conn.query(
          'INSERT INTO news_metrics (news_id, view_count, comment_count, like_count, score) VALUES ?',
          [metricRows]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await clearNewsCaches();

  return {
    reset: resetSummary,
    seededAt,
    created: summary
  };
}

const LIST_SORT = {
  newest: 'published_at DESC',
  oldest: 'published_at ASC',
  hot: 'score DESC',
  commented: 'comment_count DESC'
};

function buildWhere(filters, params) {
  const where = [];
  if (filters.categoryId) {
    where.push('n.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.keyword) {
    where.push('(n.title LIKE ? OR n.summary LIKE ? OR u.username LIKE ? OR c.name LIKE ?)');
    const like = `%${filters.keyword}%`;
    params.push(like, like, like, like);
  }
  if (filters.status) {
    where.push('n.status = ?');
    params.push(filters.status);
  } else {
    where.push("n.status = 'published'");
  }
  if (filters.startDate) {
    where.push('n.published_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    where.push('n.published_at <= ?');
    params.push(filters.endDate);
  }
  return where.length ? `WHERE ${where.join(' AND ')}` : '';
}

async function listNews(filters = {}) {
  const pageSize = Math.min(filters.pageSize || newsConfig.defaultPageSize || 20, newsConfig.maxPageSize || 50);
  const page = Math.max(filters.page || 1, 1);
  const offset = (page - 1) * pageSize;
  const params = [];
  const whereSql = buildWhere(filters, params);
  const sortKey = LIST_SORT[filters.sort] || LIST_SORT.newest;
  const sql = `
    SELECT n.id, n.title, n.summary, n.cover_image AS coverImage, n.published_at AS publishedAt,
           u.username AS author, u.avatar_url AS authorAvatar,
           c.name AS categoryName, c.id AS categoryId,
           m.view_count AS viewCount, m.comment_count AS commentCount, m.score
    FROM news n
    JOIN users u ON u.id = n.author_id
    JOIN news_categories c ON c.id = n.category_id
    LEFT JOIN news_metrics m ON m.news_id = n.id
    ${whereSql}
    ORDER BY ${sortKey}
    LIMIT ? OFFSET ?
  `;
  params.push(pageSize, offset);
  const rows = await query(sql, params);
  const countSql = `SELECT COUNT(1) as total FROM news n ${whereSql}`;
  const totalRows = await query(countSql, params.slice(0, params.length - 2));
  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total: totalRows[0] ? totalRows[0].total : 0
    }
  };
}

async function getNewsById(id) {
  const cacheKey = `news:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const sql = `
    SELECT n.id, n.title, n.summary, n.content, n.cover_image AS coverImage, n.status,
           n.published_at AS publishedAt, n.created_at AS createdAt, n.updated_at AS updatedAt,
           u.id AS authorId, u.username AS author, u.avatar_url AS authorAvatar,
           c.id AS categoryId, c.name AS categoryName,
           m.view_count AS viewCount, m.comment_count AS commentCount, m.like_count AS likeCount, m.score
    FROM news n
    JOIN users u ON u.id = n.author_id
    JOIN news_categories c ON c.id = n.category_id
    LEFT JOIN news_metrics m ON m.news_id = n.id
    WHERE n.id = ?
  `;
  const rows = await query(sql, [id]);
  if (!rows.length) {
    return null;
  }
  const attachments = await query(
    'SELECT id, filename, file_path AS filePath, file_type AS fileType, file_size AS fileSize, uploaded_at AS uploadedAt FROM news_attachments WHERE news_id = ?',
    [id]
  );
  const result = { ...rows[0], attachments };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return result;
}

async function createNews(payload, user) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const now = new Date();
    const [result] = await conn.query(
      'INSERT INTO news (title, slug, summary, content, author_id, category_id, status, cover_image, published_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [
        payload.title,
        payload.slug,
        payload.summary || null,
        payload.content,
        user.id,
        payload.categoryId,
        payload.status || 'published',
        payload.coverImage || null,
        payload.publishedAt || now,
        now
      ]
    );
    const newsId = result.insertId;
    if (Array.isArray(payload.attachments) && payload.attachments.length) {
      const attachments = payload.attachments.map(item => [
        newsId,
        item.filename,
        item.filePath,
        item.fileType,
        item.fileSize
      ]);
      await conn.query(
        'INSERT INTO news_attachments (news_id, filename, file_path, file_type, file_size) VALUES ?',
        [attachments]
      );
    }
    await conn.query('INSERT INTO news_metrics (news_id) VALUES (?) ON DUPLICATE KEY UPDATE news_id = news_id', [newsId]);
    await conn.commit();
    const pipeline = redis.pipeline();
    pipeline.zadd('hot:zset', 0, newsId);
    pipeline.lpush('recent:list', JSON.stringify({
      id: newsId,
      title: payload.title,
      summary: payload.summary || '',
      coverImage: payload.coverImage || null,
      publishedAt: (payload.publishedAt || now).toISOString()
    }));
    pipeline.ltrim('recent:list', 0, (newsConfig.recentCacheSize || 50) - 1);
    try {
      await pipeline.exec();
    } catch (err) {
      console.warn('Redis cache refresh failed', err.message);
    }
    return newsId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateNews(id, payload, user) {
  const existing = await query('SELECT author_id FROM news WHERE id = ?', [id]);
  if (!existing.length) {
    throw Object.assign(new Error('News not found'), { status: 404 });
  }
  const isOwner = existing[0].author_id === user.id;
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Permission denied'), { status: 403 });
  }
  const fields = [];
  const values = [];
  if (payload.title) {
    fields.push('title = ?');
    values.push(payload.title);
  }
  if (payload.slug) {
    fields.push('slug = ?');
    values.push(payload.slug);
  }
  if (payload.summary !== undefined) {
    fields.push('summary = ?');
    values.push(payload.summary);
  }
  if (payload.content) {
    fields.push('content = ?');
    values.push(payload.content);
  }
  if (payload.categoryId) {
    fields.push('category_id = ?');
    values.push(payload.categoryId);
  }
  if (payload.status) {
    fields.push('status = ?');
    values.push(payload.status);
  }
  if (payload.coverImage !== undefined) {
    fields.push('cover_image = ?');
    values.push(payload.coverImage);
  }
  if (payload.publishedAt) {
    fields.push('published_at = ?');
    values.push(payload.publishedAt);
  }
  if (!fields.length) {
    return { affectedRows: 0 };
  }
  fields.push('updated_at = NOW()');
  values.push(id);
  const sql = `UPDATE news SET ${fields.join(', ')} WHERE id = ?`;
  const result = await query(sql, values);
  if (Array.isArray(payload.attachments)) {
    await query('DELETE FROM news_attachments WHERE news_id = ?', [id]);
    if (payload.attachments.length) {
      const attachments = payload.attachments.map(item => [
        id,
        item.filename,
        item.filePath,
        item.fileType,
        item.fileSize
      ]);
      await query(
        'INSERT INTO news_attachments (news_id, filename, file_path, file_type, file_size) VALUES ?',
        [attachments]
      );
    }
  }
  await redis.del(`news:${id}`);
  await redis.del('recent:list');
  try {
    const metrics = await query('SELECT score FROM news_metrics WHERE news_id = ?', [id]);
    const score = metrics.length ? metrics[0].score || 0 : 0;
    await redis.zadd('hot:zset', score, id);
  } catch (err) {
    console.warn('Redis hot cache update failed', err.message);
  }
  return result;
}

async function deleteNews(id, user) {
  const existing = await query('SELECT author_id FROM news WHERE id = ?', [id]);
  if (!existing.length) {
    throw Object.assign(new Error('News not found'), { status: 404 });
  }
  const isOwner = existing[0].author_id === user.id;
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Permission denied'), { status: 403 });
  }
  await query('DELETE FROM news WHERE id = ?', [id]);
  await redis.del(`news:${id}`);
  await redis.del('recent:list');
  await redis.zrem('hot:zset', id);
  await redis.hdel('metrics:views', id);
}

async function incrementView(id) {
  await query('INSERT INTO news_metrics (news_id, view_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1', [id]);
  await redis.hincrby('metrics:views', id, 1);
  await redis.zincrby('hot:zset', 1, id);
}

async function listComments(newsId, page = 1, pageSize = 20) {
  const limit = Math.min(pageSize, 100);
  const offset = (page - 1) * limit;
  const rows = await query(
    `SELECT c.id, c.content, c.created_at AS createdAt, c.user_id AS userId,
            u.username, u.avatar_url AS avatarUrl
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.news_id = ? AND c.is_deleted = 0
     ORDER BY c.created_at ASC
     LIMIT ? OFFSET ?`,
    [newsId, limit, offset]
  );
  const totalRows = await query('SELECT COUNT(1) AS total FROM comments WHERE news_id = ? AND is_deleted = 0', [newsId]);
  return {
    data: rows,
    pagination: {
      page,
      pageSize: limit,
      total: totalRows[0] ? totalRows[0].total : 0
    }
  };
}

async function createComment(newsId, user, content) {
  await query('INSERT INTO comments (news_id, user_id, content) VALUES (?,?,?)', [newsId, user.id, content]);
  await query('INSERT INTO news_metrics (news_id, comment_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE comment_count = comment_count + 1', [newsId]);
  await redis.zincrby('hot:zset', 5, newsId);
  await redis.del(`news:${newsId}`);
}

async function deleteComment(newsId, commentId, user) {
  const rows = await query('SELECT user_id FROM comments WHERE id = ? AND news_id = ?', [commentId, newsId]);
  if (!rows.length) {
    throw Object.assign(new Error('Comment not found'), { status: 404 });
  }
  const isOwner = rows[0].user_id === user.id;
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Permission denied'), { status: 403 });
  }
  await query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [commentId]);
  await query('INSERT INTO news_metrics (news_id, comment_count) VALUES (?, 0) ON DUPLICATE KEY UPDATE comment_count = GREATEST(comment_count - 1, 0)', [newsId]);
  await redis.del(`news:${newsId}`);
}

async function getHotNews(limit = 10) {
  const ids = await redis.zrevrange('hot:zset', 0, limit - 1);
  if (!ids.length) {
    const rows = await query(
      `SELECT n.id, n.title, n.summary, n.cover_image AS coverImage,
              m.view_count AS viewCount, m.comment_count AS commentCount, m.score
       FROM news n
       JOIN news_metrics m ON m.news_id = n.id
       WHERE n.status = 'published'
       ORDER BY m.score DESC
       LIMIT ?`,
      [limit]
    );
    if (rows.length) {
      const pipeline = redis.pipeline();
      rows.forEach(row => pipeline.zadd('hot:zset', row.score || 0, row.id));
      try {
        await pipeline.exec();
      } catch (err) {
        console.warn('Redis hot cache prime failed', err.message);
      }
    }
    return rows;
  }
  const records = [];
  for (const id of ids) {
    const news = await getNewsById(Number(id));
    if (news) {
      records.push(news);
    }
  }
  return records.slice(0, limit);
}

async function getRecentNews(limit = 10) {
  const cached = await redis.lrange('recent:list', 0, limit - 1);
  if (cached && cached.length) {
    return cached.map(item => JSON.parse(item));
  }
  const rows = await query(
    `SELECT n.id, n.title, n.summary, n.cover_image AS coverImage, n.published_at AS publishedAt
     FROM news n
     WHERE n.status = 'published'
     ORDER BY n.published_at DESC
     LIMIT ?`,
    [limit]
  );
  if (rows.length) {
    const pipeline = redis.pipeline();
    rows.forEach(row => {
      pipeline.lpush('recent:list', JSON.stringify(row));
    });
    pipeline.ltrim('recent:list', 0, limit - 1);
    try {
      await pipeline.exec();
    } catch (err) {
      console.warn('Redis recent cache update failed', err.message);
    }
  }
  return rows;
}

async function getStats() {
  const perCategory = await query(
    `SELECT c.id AS categoryId, c.name AS categoryName, COUNT(n.id) AS newsCount
     FROM news_categories c
      JOIN news n ON n.category_id = c.id AND n.status = 'published'
      GROUP BY c.id, c.name
      HAVING newsCount > 0
      ORDER BY newsCount DESC`
  );
  const perAuthor = await query(
    `SELECT u.id AS userId, u.username, COUNT(n.id) AS newsCount
      FROM users u
      JOIN news n ON n.author_id = u.id AND n.status = 'published'
      GROUP BY u.id, u.username
      HAVING newsCount > 0
      ORDER BY newsCount DESC
     LIMIT 50`
  );
  return {
    perCategory,
    perAuthor
  };
}

async function recordAudit(adminId, action, targetType, targetId, metadata = null) {
  await query(
    'INSERT INTO news_audit_log (admin_id, action, target_type, target_id, metadata) VALUES (?,?,?,?,?)',
    [adminId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null]
  );
}

async function getAuditLogs(limit = 200) {
  const rows = await query(
    `SELECT l.id, l.action, l.target_type AS targetType, l.target_id AS targetId, l.metadata,
            l.created_at AS createdAt, u.username AS admin
     FROM news_audit_log l
     LEFT JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map(item => ({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null
  }));
}

async function listCategories() {
  return query(
    `SELECT id, name, description, created_at AS createdAt, updated_at AS updatedAt
     FROM news_categories
     ORDER BY name ASC`
  );
}

async function createCategory(payload) {
  const result = await query('INSERT INTO news_categories (name, description) VALUES (?,?)', [payload.name, payload.description || null]);
  return result.insertId;
}

async function updateCategory(id, payload) {
  const fields = [];
  const values = [];
  if (payload.name) {
    fields.push('name = ?');
    values.push(payload.name);
  }
  if (payload.description !== undefined) {
    fields.push('description = ?');
    values.push(payload.description);
  }
  if (!fields.length) {
    return { affectedRows: 0 };
  }
  fields.push('updated_at = NOW()');
  values.push(id);
  const sql = `UPDATE news_categories SET ${fields.join(', ')} WHERE id = ?`;
  return query(sql, values);
}

async function deleteCategory(id) {
  const rows = await query('SELECT COUNT(1) AS total FROM news WHERE category_id = ?', [id]);
  if (rows[0] && rows[0].total > 0) {
    throw Object.assign(new Error('Category in use'), { status: 400 });
  }
  await query('DELETE FROM news_categories WHERE id = ?', [id]);
}

module.exports = {
  listNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  incrementView,
  listComments,
  createComment,
  deleteComment,
  getHotNews,
  getRecentNews,
  getStats,
  recordAudit,
  getAuditLogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createBackup,
  restoreBackup,
  getBackupInfo,
  resetNewsData,
  seedNewsData
};
