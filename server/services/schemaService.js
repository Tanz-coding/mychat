const crypto = require('crypto');
const { query } = require('../mysql');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

async function ensureCoreSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      avatar_url VARCHAR(255) DEFAULT NULL,
      email VARCHAR(128) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_users_username (username),
      KEY idx_users_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_low_id BIGINT UNSIGNED NOT NULL,
      user_high_id BIGINT UNSIGNED NOT NULL,
      requester_id BIGINT UNSIGNED NOT NULL,
      addressee_id BIGINT UNSIGNED NOT NULL,
      status ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_friend_pair (user_low_id, user_high_id),
      KEY idx_friendships_requester (requester_id),
      KEY idx_friendships_addressee (addressee_id),
      KEY idx_friendships_status (status),
      CONSTRAINT fk_friendships_low_user FOREIGN KEY (user_low_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_friendships_high_user FOREIGN KEY (user_high_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_friendships_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_friendships_addressee FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id BIGINT UNSIGNED NOT NULL,
      settings_text TEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await seedUser('1', '1234', 'user', '/static/img/avatar/20180414165754.jpg');
  await seedUser('2', '1234', 'user', '/static/img/avatar/20180414170003.jpg');
  await seedUser('admin', '1234', 'admin', '/static/img/avatar/admin-island.png');
}

async function seedUser(username, password, role, avatarUrl) {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
  if (rows.length > 0) {
    await query(
      'UPDATE users SET password_hash = ?, role = ?, avatar_url = ? WHERE username = ?',
      [hashPassword(password), role, avatarUrl, username]
    );
    return;
  }
  await query(
    'INSERT INTO users (username, password_hash, role, avatar_url, email) VALUES (?,?,?,?,?)',
    [username, hashPassword(password), role, avatarUrl, null]
  );
}

module.exports = {
  ensureCoreSchema,
  hashPassword
};
