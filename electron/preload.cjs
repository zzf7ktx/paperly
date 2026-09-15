const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('paperlyUpdater', {
  check: () => ipcRenderer.invoke('paperly:check-for-updates'),
  install: () => ipcRenderer.invoke('paperly:install-update'),
  getVersion: () => ipcRenderer.invoke('paperly:get-app-version'),
  getDownloadDirectory: () => ipcRenderer.invoke('paperly:get-update-download-directory'),
  chooseDownloadDirectory: () => ipcRenderer.invoke('paperly:choose-update-download-directory'),
  onStatus: (listener) => {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on('paperly-update-status', handler);
    return () => ipcRenderer.removeListener('paperly-update-status', handler);
  },
});
