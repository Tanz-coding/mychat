const { query } = require('../mysql');
const { ensureCoreSchema } = require('./schemaService');

const defaultSettings = {
  language: '简体中文',
  theme: 'fresh',
  fontSize: 'medium',
  messageNotice: true,
  soundNotice: true,
  desktopNotice: true,
  groupNotice: true,
  specialCare: true,
  messageNotify: true,
  newsNotify: true,
  aiNotify: false,
  enterToSend: true,
  sendShortcut: 'enter',
  historyDays: '30',
  autoDownload: false,
  imagePreview: true,
  emojiRecommend: true,
  profileVisible: '所有人',
  friendVerify: true,
  blockedCount: 0,
  deviceCount: 3,
  cacheUsed: 256,
  storageUsed: 1.2,
  storageLimit: 5
};

async function getSettings(userId) {
  await ensureCoreSchema();
  const rows = await query('SELECT settings_text FROM user_settings WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows.length) {
    return { ...defaultSettings };
  }
  try {
    return { ...defaultSettings, ...JSON.parse(rows[0].settings_text || '{}') };
  } catch (error) {
    return { ...defaultSettings };
  }
}

async function saveSettings(userId, settings) {
  await ensureCoreSchema();
  const merged = { ...defaultSettings, ...(settings || {}) };
  await query(
    'INSERT INTO user_settings (user_id, settings_text) VALUES (?,?) ON DUPLICATE KEY UPDATE settings_text = VALUES(settings_text), updated_at = CURRENT_TIMESTAMP',
    [userId, JSON.stringify(merged)]
  );
  return merged;
}

module.exports = {
  defaultSettings,
  getSettings,
  saveSettings
};
