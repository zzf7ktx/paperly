const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('paperlyUpdater', {
  check: () => ipcRenderer.invoke('paperly:check-for-updates'),
  install: () => ipcRenderer.invoke('paperly:install-update'),
  onStatus: (listener) => {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on('paperly-update-status', handler);
    return () => ipcRenderer.removeListener('paperly-update-status', handler);
  },
});
