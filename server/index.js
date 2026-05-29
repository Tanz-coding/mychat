const fs = require('fs');
const path = require('path');
const express = require('express');
const multer  = require('multer');
const io=require("./io");
const {getNetworkIPv4}=require("./utils");
const { loadConfig, updateConfig } = require('./config');
const newsRouter = require('./routes/newsRouter');
const authRouter = require('./routes/authRouter');
const friendRouter = require('./routes/friendRouter');
const settingsRouter = require('./routes/settingsRouter');
const aiRouter = require('./routes/aiRouter');
const systemRouter = require('./routes/systemRouter');
const qrRouter = require('./routes/qrRouter');
const { ensureCoreSchema } = require('./services/schemaService');

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  if (reason && reason.stack) {
    console.error('Unhandled rejection:', reason.stack);
  } else {
    console.error('Unhandled rejection:', reason);
  }
});

const app = express();
const server = require('http').createServer(app);
let config = {};
try {
  config = loadConfig();
} catch (error) {
  console.error('加载配置失败:', error.message);
  config = {};
}
const mysqlManager = require('./mysql');
const redisClient = require('./redis');

ensureCoreSchema().catch((error) => {
  console.error('Core schema init failed:', error && error.message ? error.message : error);
});

const enableConfigApi = process.env.ENABLE_CONFIG_API === 'true';

const uploadConfig = (config && config.upload) || {};
const uploadRoot = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.resolve(__dirname, '../upload');
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(uploadRoot, 'files');
const distDir = process.env.DIST_DIR
  ? path.resolve(process.env.DIST_DIR)
  : path.resolve(__dirname, '../dist');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const allowedExts = uploadConfig.allowedExtensions || ['.jpeg', '.jpg', '.png', '.gif', '.txt', '.pdf'];
const allowedMimeTypes = uploadConfig.allowedMimeTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'];
const maxFileSize = (uploadConfig.maxFileSizeMB || 5) * 1024 * 1024;
const jsonLimitMb = Math.min(Math.max(uploadConfig.maxFileSizeMB || 5, 2), 20);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  }
});

app.use(express.json({ limit: `${jsonLimitMb}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${jsonLimitMb}mb` }));

const upload = multer({
  storage: storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    // Check file extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    const extname = allowedExts.includes(fileExt);

    // Check mime type
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片、文本或PDF文件!'));
    }
  }
});
app.post('/upload/file', upload.single('file'), (req, res) => {
  console.log('Received file upload request.');
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const publicPath = `/assets/files/${req.file.filename}`;
  res.send({ filePath: publicPath, filename: req.file.originalname, size: req.file.size });
});

app.get('/api/health', async (req, res) => {
  const cfg = loadConfig();
  const mysqlCfg = cfg.mysql || {};
  const redisCfg = cfg.redis || {};

  // MySQL test
  const mysqlResult = { ready: false, error: null, host: mysqlCfg.host || '', port: mysqlCfg.port || 3306, latency: 0 };
  try {
    const t0 = Date.now();
    const rows = await mysqlManager.query('SELECT 1 AS ok');
    mysqlResult.ready = true;
    mysqlResult.latency = Date.now() - t0;
  } catch (err) {
    mysqlResult.error = err.message || 'Connection failed';
  }

  // Redis test
  const redisResult = { ready: false, error: null, host: redisCfg.host || '', port: redisCfg.port || 6379, latency: 0 };
  try {
    if (redisClient && typeof redisClient.ping === 'function') {
      const t0 = Date.now();
      await redisClient.ping();
      redisResult.ready = true;
      redisResult.latency = Date.now() - t0;
    } else {
      redisResult.error = 'Redis 未配置或不可用';
    }
  } catch (err) {
    redisResult.error = err.message || 'Connection failed';
  }

  res.json({
    status: 'ok',
    time: Date.now(),
    mysql: mysqlResult,
    redis: redisResult
  });
});

app.use('/api/news', newsRouter);
app.use('/api/auth', authRouter);
app.use('/api/friends', friendRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/system', systemRouter);
app.use('/api/auth/qr', qrRouter);

app.use("/",express.static(distDir));
app.use("/assets/images",express.static(uploadRoot));
app.use("/assets/files",express.static(uploadDir));

if (enableConfigApi) {
  app.get('/api/config', (req, res) => {
    const current = loadConfig();
    res.json({
      mysql: current.mysql || {},
      redis: current.redis || {},
      upload: current.upload || {}
    });
  });

  app.put('/api/config', (req, res, next) => {
    try {
      const payload = req.body || {};
      const updated = updateConfig({
        mysql: payload.mysql,
        redis: payload.redis,
        upload: payload.upload
      });
      res.json({
        success: true,
        mysql: updated.mysql || {},
        redis: updated.redis || {},
        upload: updated.upload || {},
        needsRestart: true
      });
    } catch (error) {
      next(error);
    }
  });
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});
const PORT=Number(process.env.PORT || 3000);
io.attach(server);

server.on('error', (error) => {
  console.error('服务器启动失败:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
});

//启动服务器
server.listen(PORT,'0.0.0.0',()=> {
  const address=getNetworkIPv4().address;
  console.info("- Local:   http://localhost:"+PORT);
  console.info(`- Network: http://${address}:`+PORT)
});
