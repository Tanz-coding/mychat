const { contextBridge, ipcRenderer } = require('electron');

const electronApi = {
  platform: process.platform,
  version: process.versions.electron,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  close: () => ipcRenderer.invoke('window:close'),
  restart: () => ipcRenderer.invoke('app:restart'),
  getServerOrigin: () => ipcRenderer.invoke('server:get-host')
};

contextBridge.exposeInMainWorld('electron', electronApi);

window.__ELECTRON__ = true;

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
