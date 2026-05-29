const { query } = require('../mysql');
const { ensureCoreSchema, hashPassword } = require('./schemaService');

function normalizeUsername(username) {
  return String(username || '').trim();
}

function safeUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: Number(row.id),
    username: row.username,
    name: row.name || row.username,
    role: row.role || 'user',
    avatarUrl: row.avatarUrl || row.avatar_url || '/static/img/avatar/default.png',
    email: row.email || ''
  };
}

async function getUserById(id) {
  await ensureCoreSchema();
  const rows = await query('SELECT id, username, name, role, avatar_url, email FROM users WHERE id = ? LIMIT 1', [id]);
  return safeUser(rows[0]);
}

async function getUserByUsername(username) {
  await ensureCoreSchema();
  const rows = await query('SELECT id, username, name, role, avatar_url, email FROM users WHERE username = ? LIMIT 1', [normalizeUsername(username)]);
  return safeUser(rows[0]);
}

async function changePassword(userId, oldPassword, newPassword) {
  await ensureCoreSchema();
  const rows = await query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows.length) {
    throw Object.assign(new Error('用户不存在'), { status: 404 });
  }
  if (rows[0].password_hash !== hashPassword(oldPassword)) {
    throw Object.assign(new Error('旧密码不正确'), { status: 401 });
  }
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), userId]);
}

async function updateProfile(userId, fields) {
  await ensureCoreSchema();
  const updates = [];
  const values = [];
  if (fields.name !== undefined) {
    updates.push('name = ?');
    values.push(String(fields.name || '').trim());
  }
  if (fields.avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    values.push(String(fields.avatarUrl || ''));
  }
  if (fields.email !== undefined) {
    updates.push('email = ?');
    values.push(String(fields.email || ''));
  }
  if (updates.length) {
    values.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
  }
}

async function login(username, password) {
  await ensureCoreSchema();
  const account = normalizeUsername(username);
  if (!account || !password) {
    throw Object.assign(new Error('请输入账号和密码'), { status: 400 });
  }
  const rows = await query(
    'SELECT id, username, name, password_hash, role, avatar_url, email FROM users WHERE username = ? LIMIT 1',
    [account]
  );
  if (!rows.length || rows[0].password_hash !== hashPassword(password)) {
    throw Object.assign(new Error('账号或密码错误，未注册账号请先注册'), { status: 401 });
  }
  return safeUser(rows[0]);
}

async function register(payload) {
  await ensureCoreSchema();
  const username = normalizeUsername(payload && (payload.username || payload.account || payload.name));
  const password = payload && payload.password;
  if (!username || !password) {
    throw Object.assign(new Error('请输入账号和密码'), { status: 400 });
  }
  if (username === 'admin') {
    throw Object.assign(new Error('该账号名不可注册'), { status: 409 });
  }
  const existed = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (existed.length) {
    throw Object.assign(new Error('账号已存在，请直接登录'), { status: 409 });
  }
  const avatarUrl = (payload && payload.avatarUrl) || '/static/img/avatar/default.png';
  await query(
    'INSERT INTO users (username, password_hash, role, avatar_url, email) VALUES (?,?,?,?,?)',
    [username, hashPassword(password), 'user', avatarUrl, (payload && payload.email) || null]
  );
  return getUserByUsername(username);
}

async function getUserFromTokenData(data) {
  if (!data) {
    return null;
  }
  if (data.id) {
    return getUserById(data.id);
  }
  if (data.username || data.name) {
    return getUserByUsername(data.username || data.name);
  }
  return null;
}

module.exports = {
  safeUser,
  login,
  register,
  getUserById,
  getUserByUsername,
  getUserFromTokenData
};
