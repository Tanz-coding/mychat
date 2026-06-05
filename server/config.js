const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (!key || process.env[key] !== undefined) {
      return;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

loadDotEnv();

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../db/config.json');
const CONFIG_PATH = process.env.CONFIG_PATH
  ? path.resolve(process.env.CONFIG_PATH)
  : DEFAULT_CONFIG_PATH;
let cachedRaw = null;

function ensureConfigFile() {
  if (fs.existsSync(CONFIG_PATH)) {
    return;
  }
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
    fs.copyFileSync(DEFAULT_CONFIG_PATH, CONFIG_PATH);
  } else {
    throw new Error(`配置文件缺失: ${CONFIG_PATH}`);
  }
}

function readFileConfig() {
  ensureConfigFile();
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`配置文件缺失: ${CONFIG_PATH}`);
  }
  const content = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(content);
}

function applyEnvOverrides(raw) {
  const clone = JSON.parse(JSON.stringify(raw || {}));
  clone.mysql = clone.mysql || {};
  clone.redis = clone.redis || {};
  clone.upload = clone.upload || {};
  clone.ai = clone.ai || {};

  const mysqlEnv = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT && Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: process.env.DB_CONN_LIMIT && Number(process.env.DB_CONN_LIMIT),
    charset: process.env.DB_CHARSET,
    timezone: process.env.DB_TIMEZONE
  };
  const redisEnv = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT && Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB && Number(process.env.REDIS_DB),
    keyPrefix: process.env.REDIS_PREFIX
  };
  const uploadEnv = {
    maxFileSizeMB: process.env.UPLOAD_MAX_MB && Number(process.env.UPLOAD_MAX_MB)
  };
  const aiEnv = {
    enabled: parseBooleanEnv(process.env.AI_ENABLED),
    provider: process.env.AI_PROVIDER,
    model: process.env.AI_MODEL || process.env.DEEPSEEK_MODEL,
    endpoint: process.env.AI_ENDPOINT || process.env.DEEPSEEK_BASE_URL,
    apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY
  };

  clone.mysql = { ...clone.mysql, ...filterUndefined(mysqlEnv) };
  clone.redis = { ...clone.redis, ...filterUndefined(redisEnv) };
  clone.upload = { ...clone.upload, ...filterUndefined(uploadEnv) };
  clone.ai = { ...clone.ai, ...filterUndefined(aiEnv) };
  return clone;
}

function parseBooleanEnv(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function filterUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj || {}).filter(([, value]) => {
      if (value === undefined || value === null || value === '') {
        return false;
      }
      if (typeof value === 'number' && Number.isNaN(value)) {
        return false;
      }
      return true;
    })
  );
}

function loadRawConfig(forceReload = false) {
  if (!cachedRaw || forceReload) {
    cachedRaw = readFileConfig();
  }
  return JSON.parse(JSON.stringify(cachedRaw));
}

function loadConfig(options = {}) {
  const { refresh } = options;
  const raw = loadRawConfig(Boolean(refresh));
  return applyEnvOverrides(raw);
}

function validateConfigShape(next) {
  const mysql = next.mysql || {};
  const redis = next.redis || {};
  if (!mysql.host || !mysql.user || !mysql.database) {
    throw new Error('MySQL 配置缺失 host/user/database');
  }
  if (mysql.port && Number.isNaN(Number(mysql.port))) {
    throw new Error('MySQL 端口必须为数字');
  }
  if (redis.port && Number.isNaN(Number(redis.port))) {
    throw new Error('Redis 端口必须为数字');
  }
}

function updateConfig(partial) {
  const raw = loadRawConfig(true);
  const next = JSON.parse(JSON.stringify(raw));
  if (partial.mysql) {
    next.mysql = { ...next.mysql, ...partial.mysql };
  }
  if (partial.redis) {
    next.redis = { ...next.redis, ...partial.redis };
  }
  if (partial.upload) {
    next.upload = { ...next.upload, ...partial.upload };
  }
  if (partial.ai) {
    next.ai = { ...(next.ai || {}), ...partial.ai };
  }
  if (next.mysql && next.mysql.port) {
    next.mysql.port = Number(next.mysql.port);
  }
  if (next.redis && next.redis.port) {
    next.redis.port = Number(next.redis.port);
  }
  if (next.redis && next.redis.db !== undefined) {
    next.redis.db = Number(next.redis.db);
  }
  validateConfigShape(next);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  cachedRaw = next;
  return applyEnvOverrides(next);
}

module.exports = {
  loadConfig,
  loadRawConfig,
  updateConfig,
  getConfigPath: () => CONFIG_PATH
};
