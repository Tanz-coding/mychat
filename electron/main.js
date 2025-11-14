const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const fs = require('fs');

const DEFAULT_PORT = 3123;
const SERVER_PORT = Number(process.env.APP_PORT || DEFAULT_PORT);
let mainWindow = null;
let backendProcess = null;
let backendLogStream = null;
let backendLogFile = '';
let isQuitting = false;

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
    dialog.showErrorBox('启动失败', '找不到后端入口文件 index.js');
    app.quit();
    return;
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

  backendProcess = fork(serverEntry, {
    cwd: workingDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(SERVER_PORT),
      ENABLE_CONFIG_API: 'true',
      UPLOAD_ROOT: uploadRoot,
      UPLOAD_DIR: uploadDir,
      DATA_ROOT: dataRoot,
      APP_ROOT: projectRoot,
      CONFIG_PATH: configPath,
      ELECTRON_RUNTIME: 'true'
    },
    silent: true
  });

  if (backendProcess.stdout) {
    backendProcess.stdout.on('data', (data) => writeBackendLog(data, 'stdout'));
  }
  if (backendProcess.stderr) {
    backendProcess.stderr.on('data', (data) => writeBackendLog(data, 'stderr'));
  }

  backendProcess.on('error', (error) => {
    writeBackendLog(error ? `${error.stack || error.message || String(error)}` : 'unknown error', 'stderr');
  });

  backendProcess.on('exit', (code, signal) => {
    backendProcess = null;
    if (backendLogStream) {
      backendLogStream.end();
      backendLogStream = null;
    }
    if (isQuitting) {
      return;
    }
    const reason = signal || code;
    const logHint = backendLogFile ? `\n\n日志位置:\n${backendLogFile}` : '';
    dialog.showErrorBox('服务器已退出', `内置服务已停止 (code: ${reason}). 应用将退出。${logHint}`);
    app.quit();
  });
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
    title: 'MyChat',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

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

  await mainWindow.loadURL(host);
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

  ipcMain.handle('app:restart', () => {
    isQuitting = true;
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('server:get-host', () => {
    return {
      origin: `http://127.0.0.1:${SERVER_PORT}`
    };
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    try {
      backendProcess.kill('SIGTERM');
    } catch (error) {
      console.error('终止后端进程失败:', error);
    }
  }
  backendProcess = null;
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
    registerIpcHandlers();
    startBackend();
    await waitForServerReady(`http://127.0.0.1:${SERVER_PORT}/api/health`);
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
