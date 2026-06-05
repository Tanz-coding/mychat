const { app, BrowserWindow, ipcMain, dialog, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const DEFAULT_PORT = 3123;
const SERVER_PORT = Number(process.env.APP_PORT || DEFAULT_PORT);
let mainWindow = null;
let backendProcess = null;
let backendLogStream = null;
let backendLogFile = '';
let backendLockHandle = null;
let backendLockFile = '';
let tray = null;
let heartbeatTimer = null;
let desktopClientId = `${process.pid}-${Date.now()}`;
let isQuitting = false;
let activeServerOrigin = `http://127.0.0.1:${SERVER_PORT}`;

function normalizeServerOrigin(origin) {
  const raw = String(origin || '').trim().replace(/\/+$/, '');
  if (!raw) {
    return `http://127.0.0.1:${SERVER_PORT}`;
  }
  if (!/^https?:\/\//i.test(raw)) {
    return `http://${raw}`;
  }
  return raw;
}

function getBundledServerOrigin() {
  return `http://127.0.0.1:${SERVER_PORT}`;
}

function resolveProjectRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return path.join(__dirname, '..');
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getTrayIconPath() {
  const candidates = [
    path.join(resolveProjectRoot(), 'assets', 'icon.ico'),
    path.join(process.resourcesPath || '', 'assets', 'icon.ico')
  ];
  return candidates.find((item) => item && fs.existsSync(item)) || '';
}

function getServerOriginConfigPath() {
  return path.join(app.getPath('userData'), 'config', 'server-origin.json');
}

function getBackendLockFile() {
  return path.join(app.getPath('userData'), 'backend.lock');
}

function loadServerOrigin() {
  try {
    const configPath = getServerOriginConfigPath();
    if (!fs.existsSync(configPath)) {
      return activeServerOrigin;
    }
    const payload = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const savedOrigin = normalizeServerOrigin(payload && payload.origin);
    if (app.isPackaged && /^http:\/\/(127\.0\.0\.1|localhost):3000$/i.test(savedOrigin)) {
      return getBundledServerOrigin();
    }
    return savedOrigin;
  } catch (error) {
    console.error('读取后端地址配置失败:', error);
    return activeServerOrigin;
  }
}

function saveServerOrigin(origin) {
  const normalized = normalizeServerOrigin(origin);
  const configPath = getServerOriginConfigPath();
  ensureDirectory(path.dirname(configPath));
  fs.writeFileSync(configPath, JSON.stringify({ origin: normalized }, null, 2), 'utf8');
  activeServerOrigin = normalized;
  return normalized;
}

function acquireBackendLock() {
  backendLockFile = getBackendLockFile();
  ensureDirectory(path.dirname(backendLockFile));

  try {
    backendLockHandle = fs.openSync(backendLockFile, 'wx');
    fs.writeFileSync(backendLockHandle, String(process.pid), 'utf8');
    return true;
  } catch (error) {
    if (error && error.code !== 'EEXIST') {
      console.error('获取后端启动锁失败:', error);
      return false;
    }
  }

  try {
    const stat = fs.statSync(backendLockFile);
    const stale = Date.now() - stat.mtimeMs > 2 * 60 * 1000;
    if (stale) {
      fs.unlinkSync(backendLockFile);
      backendLockHandle = fs.openSync(backendLockFile, 'wx');
      fs.writeFileSync(backendLockHandle, String(process.pid), 'utf8');
      return true;
    }
  } catch (error) {
    console.error('检查后端启动锁失败:', error);
  }

  return false;
}

function releaseBackendLock() {
  if (backendLockHandle !== null) {
    try {
      fs.closeSync(backendLockHandle);
    } catch (error) {
      console.error('关闭后端启动锁失败:', error);
    }
    backendLockHandle = null;
  }
  if (backendLockFile) {
    try {
      if (fs.existsSync(backendLockFile)) {
        const owner = fs.readFileSync(backendLockFile, 'utf8').trim();
        if (!owner || owner === String(process.pid)) {
          fs.unlinkSync(backendLockFile);
        }
      }
    } catch (error) {
      console.error('释放后端启动锁失败:', error);
    }
  }
  backendLockFile = '';
}

function setupBackendRequestRedirect() {
  const redirectPrefixes = ['/api/', '/upload/', '/assets/images/', '/assets/files/', '/socket.io/'];
  const filter = {
    urls: ['file://*/*']
  };

  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    try {
      const url = new URL(details.url);
      const requestPath = decodeURIComponent(url.pathname || '');
      const matched = redirectPrefixes.some((prefix) => requestPath === prefix.slice(0, -1) || requestPath.startsWith(prefix));
      if (matched) {
        callback({
          redirectURL: `${activeServerOrigin}${requestPath}${url.search || ''}`
        });
        return;
      }
    } catch (error) {
      console.error('重定向后端请求失败:', error);
    }
    callback({});
  });
}

function requestBackend(pathname, method = 'GET', payload, origin = activeServerOrigin) {
  return new Promise((resolve, reject) => {
    const target = new URL(pathname, origin);
    const body = payload ? JSON.stringify(payload) : '';
    const request = http.request({
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search || ''}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 2500
    }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    request.on('timeout', () => request.destroy(new Error('后端请求超时')));
    request.on('error', reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

function startBackendHeartbeat() {
  stopBackendHeartbeat();
  const send = () => {
    requestBackend('/api/desktop/heartbeat', 'POST', {
      clientId: desktopClientId,
      pid: process.pid
    }).catch(() => {});
  };
  send();
  heartbeatTimer = setInterval(send, 15000);
  if (heartbeatTimer && typeof heartbeatTimer.unref === 'function') {
    heartbeatTimer.unref();
  }
}

function stopBackendHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function releaseBackendClient() {
  return requestBackend('/api/desktop/release', 'POST', {
    clientId: desktopClientId,
    pid: process.pid
  }).catch(() => {});
}

function stopBundledBackend() {
  return requestBackend('/api/desktop/shutdown', 'POST', {
    clientId: desktopClientId,
    pid: process.pid
  }, getBundledServerOrigin());
}

function buildBackendMenuTemplate() {
  return [
    {
      label: '打开客户端',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow().catch((error) => console.error('打开窗口失败:', error));
        }
      }
    },
    {
      label: '退出客户端',
      click: async () => {
        isQuitting = true;
        await releaseBackendClient();
        app.quit();
      }
    },
    { type: 'separator' },
    {
      label: '停止后端服务',
      click: () => {
        stopBundledBackend()
          .then(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('server:status', {
                running: false,
                message: '内置后端已停止'
              });
            }
          })
          .catch((error) => dialog.showErrorBox('停止后端失败', error.message || '请稍后重试'));
      }
    },
    {
      label: '退出并停止后端',
      click: async () => {
        isQuitting = true;
        try {
          await stopBundledBackend();
        } catch (error) {
          console.error('退出并停止后端失败:', error);
        }
        app.quit();
      }
    }
  ];
}

function createTray() {
  if (tray) {
    return;
  }
  const iconPath = getTrayIconPath();
  const image = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(image);
  tray.setToolTip('Q信 后端服务');
  tray.setContextMenu(Menu.buildFromTemplate(buildBackendMenuTemplate()));
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function showBackendMenu() {
  const menu = Menu.buildFromTemplate(buildBackendMenuTemplate());
  if (mainWindow && !mainWindow.isDestroyed()) {
    menu.popup({ window: mainWindow });
    return;
  }
  menu.popup();
}

function startBackend() {
  const projectRoot = resolveProjectRoot();
  const workingDirectory = app.isPackaged ? process.resourcesPath : projectRoot;
  let serverEntry = path.join(projectRoot, 'server', 'index.js');
  if (app.isPackaged && !fs.existsSync(serverEntry)) {
    const unpackedEntry = path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'index.js');
    if (fs.existsSync(unpackedEntry)) {
      serverEntry = unpackedEntry;
    }
  }
  if (!fs.existsSync(serverEntry)) {
    console.error('找不到后端入口文件 index.js');
    releaseBackendLock();
    return false;
  }
  const uploadRoot = path.join(app.getPath('userData'), 'upload');
  const uploadDir = path.join(uploadRoot, 'files');
  const configPath = path.join(app.getPath('userData'), 'config', 'db-config.json');
  const dataRoot = path.join(app.getPath('userData'), 'data');
  const logDir = path.join(app.getPath('userData'), 'logs');
  ensureDirectory(path.dirname(configPath));
  ensureDirectory(uploadDir);
  ensureDirectory(dataRoot);
  ensureDirectory(logDir);

  backendLogFile = path.join(logDir, 'backend.log');
  try {
    backendLogStream = fs.createWriteStream(backendLogFile, { flags: 'a', encoding: 'utf8' });
  } catch (error) {
    console.error('无法创建日志文件:', error);
    backendLogStream = null;
  }

  const writeBackendLog = (chunk, level = 'stdout') => {
    if (!chunk) {
      return;
    }
    const text = chunk.toString();
    const stamped = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${text}`;
    if (backendLogStream) {
      backendLogStream.write(stamped);
      if (!stamped.endsWith('\n')) {
        backendLogStream.write('\n');
      }
    }
    if (process.stdout && !app.isPackaged) {
      const writer = level === 'stderr' ? process.stderr : process.stdout;
      writer.write(`[backend] ${text}`);
    }
  };

  const backendEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(SERVER_PORT),
    ENABLE_CONFIG_API: 'true',
    UPLOAD_ROOT: uploadRoot,
    UPLOAD_DIR: uploadDir,
    DATA_ROOT: dataRoot,
    APP_ROOT: projectRoot,
    CONFIG_PATH: configPath,
    BACKEND_LOCK_FILE: backendLockFile,
    ELECTRON_RUNTIME: 'true'
  };

  const backendStdio = backendLogStream
    ? ['ignore', backendLogStream, backendLogStream]
    : 'ignore';

  backendProcess = spawn(process.execPath, [serverEntry], {
    cwd: workingDirectory,
    detached: true,
    env: backendEnv,
    stdio: backendStdio,
    windowsHide: true
  });

  backendProcess.unref();

  backendProcess.on('error', (error) => {
    writeBackendLog(error ? `${error.stack || error.message || String(error)}` : 'unknown error', 'stderr');
    releaseBackendLock();
  });

  backendProcess.on('exit', (code, signal) => {
    backendProcess = null;
    if (isQuitting) {
      return;
    }
    const reason = signal || code;
    console.error(`内置服务已停止 (code: ${reason})`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server:status', {
        running: false,
        message: `内置服务已停止 (code: ${reason})`,
        logFile: backendLogFile
      });
    }
  });

  return true;
}

function waitForServerReady(url, maxRetry = 60, interval = 250) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts += 1;
      const request = http.get(url, (res) => {
        if (res.statusCode === 200) {
          res.resume();
          return resolve();
        }
        res.resume();
        if (attempts >= maxRetry) {
          return reject(new Error('健康检查返回非 200 状态'));  }
        setTimeout(check, interval);
      });
      request.on('error', () => {
        if (attempts >= maxRetry) {
          return reject(new Error('无法连接到内置服务'));
        }
        setTimeout(check, interval);
      });
    };
    check();
  });
}

async function createMainWindow() {
  const host = `http://127.0.0.1:${SERVER_PORT}`;
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#f2f2f2',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Q信',
    webPreferences: {
      preload: preloadPath,
      additionalArguments: [`--qxin-server-origin=${activeServerOrigin}`],
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  });

  const showWindow = () => {
    if (mainWindow) {
      mainWindow.show();
    }
  };

  mainWindow.once('ready-to-show', showWindow);
  mainWindow.webContents.once('did-finish-load', showWindow);
  setTimeout(showWindow, 1800);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window:maximized', true);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window:maximized', false);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const localIndex = path.join(resolveProjectRoot(), 'dist', 'index.html');
  if (fs.existsSync(localIndex)) {
    await mainWindow.loadFile(localIndex);
    return;
  }
  await mainWindow.loadURL(host);
}

function isServerReady(url) {
  return waitForServerReady(url, 1, 1)
    .then(() => true)
    .catch(() => false);
}

function registerIpcHandlers() {
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) {
      return false;
    }
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    }
    mainWindow.maximize();
    return true;
  });

  ipcMain.handle('window:is-maximized', () => {
    if (!mainWindow) {
      return false;
    }
    return mainWindow.isMaximized();
  });

  ipcMain.handle('window:close', () => {
    isQuitting = true;
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('app:quit-client', async () => {
    isQuitting = true;
    await releaseBackendClient();
    app.quit();
  });

  ipcMain.handle('backend:stop', () => stopBundledBackend());

  ipcMain.handle('app:quit-and-stop-backend', async () => {
    isQuitting = true;
    try {
      await stopBundledBackend();
    } finally {
      app.quit();
    }
  });

  ipcMain.handle('backend:show-menu', () => {
    showBackendMenu();
  });

  ipcMain.handle('app:restart', () => {
    isQuitting = true;
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('server:get-host', () => {
    return {
      origin: activeServerOrigin,
      bundledOrigin: getBundledServerOrigin()
    };
  });

  ipcMain.handle('server:set-host', (_event, origin) => {
    return {
      origin: saveServerOrigin(origin),
      bundledOrigin: getBundledServerOrigin()
    };
  });
}

function stopBackend() {
  const launchedBackend = Boolean(backendProcess);
  backendProcess = null;
  if (!launchedBackend) {
    releaseBackendLock();
  }
  if (backendLogStream) {
    try {
      backendLogStream.end();
    } catch (error) {
      console.error('关闭日志写入失败:', error);
    }
    backendLogStream = null;
  }
  backendLogFile = '';
}

app.on('ready', async () => {
  try {
    activeServerOrigin = loadServerOrigin();
    setupBackendRequestRedirect();
    registerIpcHandlers();
    createTray();
    const bundledOrigin = getBundledServerOrigin();
    const bundledHealthUrl = `${bundledOrigin}/api/health`;
    const shouldUseBundledBackend = activeServerOrigin === bundledOrigin;
    let started = false;

    if (shouldUseBundledBackend && await isServerReady(bundledHealthUrl)) {
      console.info('内置后端已在运行，本客户端直接复用。');
    } else if (shouldUseBundledBackend && acquireBackendLock()) {
      started = startBackend();
      if (!started) {
        releaseBackendLock();
      }
    } else if (shouldUseBundledBackend) {
      console.info('其他客户端正在启动内置后端，本客户端直接连接。');
    }

    if (shouldUseBundledBackend) {
      waitForServerReady(bundledHealthUrl)
        .then(() => {
          releaseBackendLock();
          startBackendHeartbeat();
          if (backendLogStream) {
            backendLogStream.end();
            backendLogStream = null;
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:status', {
              running: true,
              message: started ? '内置后端已启动' : '已连接到正在运行的内置后端',
              logFile: backendLogFile
            });
          }
        })
        .catch((error) => {
          releaseBackendLock();
          if (backendLogStream) {
            backendLogStream.end();
            backendLogStream = null;
          }
          console.error('内置后端未就绪，用户可在界面中手动连接:', error);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:status', {
              running: false,
              message: '内置后端暂未就绪，可手动填写后端服务地址',
              logFile: backendLogFile
            });
          }
        });
    }
    await createMainWindow();
  } catch (error) {
    dialog.showErrorBox('启动失败', error.message || '未知错误');
    stopBackend();
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackendHeartbeat();
  releaseBackendClient();
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('exit', () => {
  stopBackend();
});

process.on('SIGINT', () => {
  app.quit();
});
