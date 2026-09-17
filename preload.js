const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopUpdater', {
  check: () => ipcRenderer.send('updater:check'),
  download: () => ipcRenderer.send('updater:download'),
  install: () => ipcRenderer.send('updater:install'),
  openExternal: (url) => ipcRenderer.send('updater:open-external', url),
  onAvailable: (callback) => ipcRenderer.on('updater:available', (_event, info) => callback(info)),
  onRequired: (callback) => ipcRenderer.on('updater:required', (_event, info) => callback(info)),
  onProgress: (callback) => ipcRenderer.on('updater:progress', (_event, progress) => callback(progress)),
  onDownloaded: (callback) => ipcRenderer.on('updater:downloaded', () => callback()),
  onError: (callback) => ipcRenderer.on('updater:error', (_event, message) => callback(message))
});

contextBridge.exposeInMainWorld('secureStorage', {
  load: () => ipcRenderer.invoke('secure-storage:load'),
  save: (values) => ipcRenderer.invoke('secure-storage:save', values)
});
