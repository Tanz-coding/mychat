const { query } = require('../mysql');
const { ensureCoreSchema } = require('./schemaService');

function pair(a, b) {
  const first = Number(a);
  const second = Number(b);
  return first < second ? [first, second] : [second, first];
}

function mapUser(row, status) {
  return {
    id: Number(row.id),
    name: row.username,
    username: row.username,
    role: row.role || 'user',
    avatarUrl: row.avatar_url || '/static/img/avatar/default.png',
    type: 'user',
    status
  };
}

async function listForUser(userId) {
  await ensureCoreSchema();
  const rows = await query(
    `SELECT f.*, u.id AS other_id, u.username, u.role, u.avatar_url
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
     WHERE f.requester_id = ? OR f.addressee_id = ?
     ORDER BY f.updated_at DESC`,
    [userId, userId, userId]
  );
  return {
    accepted: rows.filter(row => row.status === 'accepted').map(row => mapUser({
      id: row.other_id,
      username: row.username,
      role: row.role,
      avatar_url: row.avatar_url
    }, 'accepted')),
    sent: rows.filter(row => row.status === 'pending' && Number(row.requester_id) === Number(userId)).map(row => mapUser({
      id: row.other_id,
      username: row.username,
      role: row.role,
      avatar_url: row.avatar_url
    }, 'sent')),
    received: rows.filter(row => row.status === 'pending' && Number(row.addressee_id) === Number(userId)).map(row => mapUser({
      id: row.other_id,
      username: row.username,
      role: row.role,
      avatar_url: row.avatar_url
    }, 'received'))
  };
}

async function requestFriend(requesterId, addresseeId) {
  await ensureCoreSchema();
  if (Number(requesterId) === Number(addresseeId)) {
    throw Object.assign(new Error('不能添加自己为好友'), { status: 400 });
  }
  const [low, high] = pair(requesterId, addresseeId);
  const existing = await query('SELECT * FROM friendships WHERE user_low_id = ? AND user_high_id = ? LIMIT 1', [low, high]);
  if (existing.length) {
    const row = existing[0];
    if (row.status === 'accepted') {
      return { status: 'accepted' };
    }
    if (Number(row.addressee_id) === Number(requesterId)) {
      await acceptFriend(requesterId, addresseeId);
      return { status: 'accepted' };
    }
    return { status: 'sent' };
  }
  await query(
    'INSERT INTO friendships (user_low_id, user_high_id, requester_id, addressee_id, status) VALUES (?,?,?,?,?)',
    [low, high, requesterId, addresseeId, 'pending']
  );
  return { status: 'sent' };
}

async function acceptFriend(currentUserId, otherUserId) {
  await ensureCoreSchema();
  const [low, high] = pair(currentUserId, otherUserId);
  const result = await query(
    'UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_low_id = ? AND user_high_id = ? AND addressee_id = ?',
    ['accepted', low, high, currentUserId]
  );
  if (!result || result.affectedRows === 0) {
    await query(
      'INSERT INTO friendships (user_low_id, user_high_id, requester_id, addressee_id, status) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP',
      [low, high, otherUserId, currentUserId, 'accepted']
    );
  }
  return { status: 'accepted' };
}

async function deleteFriend(currentUserId, otherUserId) {
  await ensureCoreSchema();
  const [low, high] = pair(currentUserId, otherUserId);
  await query('DELETE FROM friendships WHERE user_low_id = ? AND user_high_id = ?', [low, high]);
  return { status: 'deleted' };
}

module.exports = {
  listForUser,
  requestFriend,
  acceptFriend,
  deleteFriend
};
