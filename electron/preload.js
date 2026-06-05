const { contextBridge, ipcRenderer } = require('electron');

function getArgumentValue(name) {
  const prefix = `${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}

const initialServerOrigin = getArgumentValue('--qxin-server-origin');

const electronApi = {
  platform: process.platform,
  version: process.versions.electron,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  close: () => ipcRenderer.invoke('window:close'),
  quitClient: () => ipcRenderer.invoke('app:quit-client'),
  stopBackend: () => ipcRenderer.invoke('backend:stop'),
  quitAndStopBackend: () => ipcRenderer.invoke('app:quit-and-stop-backend'),
  showBackendMenu: () => ipcRenderer.invoke('backend:show-menu'),
  restart: () => ipcRenderer.invoke('app:restart'),
  getServerOrigin: () => ipcRenderer.invoke('server:get-host'),
  setServerOrigin: (origin) => ipcRenderer.invoke('server:set-host', origin),
  onServerStatus: (listener) => {
    if (typeof listener !== 'function') {
      return () => {};
    }
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on('server:status', handler);
    return () => ipcRenderer.removeListener('server:status', handler);
  }
};

contextBridge.exposeInMainWorld('electron', electronApi);

window.__ELECTRON__ = true;
window._HOST = initialServerOrigin || '';

ipcRenderer.invoke('server:get-host')
  .then(({ origin }) => {
    window._HOST = origin;
  })
  .catch(() => {
    window._HOST = '';
  });

ipcRenderer.on('window:maximized', (_event, payload) => {
  window.__ELECTRON_MAXIMIZED__ = Boolean(payload);
  const evt = new CustomEvent('electron-window-maximize', { detail: { maximized: window.__ELECTRON_MAXIMIZED__ } });
  window.dispatchEvent(evt);
});
