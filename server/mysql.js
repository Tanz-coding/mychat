const mysql = require('mysql2/promise');
const { loadConfig } = require('./config');

let pool = null;
let initError = null;

function setupPool() {
  pool = null;
  initError = null;
  try {
    const cfg = loadConfig().mysql;
    if (!cfg) {
      throw new Error('MySQL 配置缺失');
    }
    if (!cfg.host || !cfg.user || !cfg.database) {
      throw new Error('MySQL 配置缺少 host/user/database');
    }
    pool = mysql.createPool({
      host: cfg.host,
      port: Number(cfg.port || 3306),
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectionLimit: cfg.connectionLimit || 10,
      waitForConnections: true,
      charset: cfg.charset || 'utf8mb4',
      timezone: cfg.timezone || '+00:00'
    });
    pool.on('connection', () => {
      initError = null;
    });
    pool.on('error', (err) => {
      initError = err;
      console.error('MySQL 连接错误:', err.message);
    });
  } catch (error) {
    initError = error;
    console.error('MySQL 初始化失败:', error.message);
  }
}

setupPool();

function ensurePool() {
  if (pool) {
    return pool;
  }
  const error = initError || new Error('MySQL 连接池未初始化');
  error.code = error.code || 'MYSQL_NOT_INITIALIZED';
  error.status = error.status || 503;
  throw error;
}

async function query(sql, params = []) {
  const activePool = ensurePool();
  const [rows] = await activePool.query(sql, params);
  return rows;
}

async function getConnection() {
  const activePool = ensurePool();
  return activePool.getConnection();
}

function getStatus() {
  return {
    ready: Boolean(pool) && !initError,
    error: initError ? initError.message : null
  };
}

module.exports = {
  query,
  getConnection,
  getStatus
};
