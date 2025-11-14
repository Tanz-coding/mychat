const Redis = require('ioredis');
const { loadConfig } = require('./config');

let client = null;
let initError = null;
let isReady = false;

function setError(err) {
  initError = err;
  isReady = false;
  if (err && err.message) {
    console.error('Redis error', err.message);
  }
}

function createStubClient() {
  const makeResolve = (value) => Promise.resolve(typeof value === 'function' ? value() : value);
  const pipelineFactory = () => {
    const chain = {
      del: () => chain,
      lpush: () => chain,
      ltrim: () => chain,
      zadd: () => chain,
      zincrby: () => chain,
      hdel: () => chain,
      exec: () => Promise.resolve([])
    };
    return chain;
  };
  return {
    getStatus() {
      return {
        ready: false,
        error: initError ? initError.message : 'Redis 未配置'
      };
    },
    keys: () => Promise.resolve([]),
    del: () => Promise.resolve(0),
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
    lrange: () => Promise.resolve([]),
    lpush: () => Promise.resolve(0),
    ltrim: () => Promise.resolve(null),
    zadd: () => Promise.resolve(0),
    zrevrange: () => Promise.resolve([]),
    zincrby: () => Promise.resolve(0),
    hincrby: () => Promise.resolve(0),
    zrem: () => Promise.resolve(0),
    hdel: () => Promise.resolve(0),
    pipeline: () => pipelineFactory(),
    quit: () => makeResolve(null),
    disconnect: () => makeResolve(null)
  };
}

try {
  const cfg = loadConfig().redis;
  if (!cfg) {
    throw new Error('Redis 配置缺失');
  }
  if (!cfg.host) {
    throw new Error('Redis 配置缺少 host');
  }
  client = new Redis({
    host: cfg.host,
    port: Number(cfg.port || 6379),
    password: cfg.password || undefined,
    db: cfg.db || 0,
    keyPrefix: cfg.keyPrefix || 'mychat:news:'
  });
  client.on('ready', () => {
    isReady = true;
    initError = null;
  });
  client.on('error', setError);
  client.getStatus = () => ({
    ready: isReady,
    error: initError ? initError.message : null
  });
} catch (error) {
  setError(error);
  client = createStubClient();
}

if (!client.getStatus) {
  client.getStatus = () => ({
    ready: isReady,
    error: initError ? initError.message : null
  });
}

module.exports = client;
