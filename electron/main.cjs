const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let server;
const localPort = 4174;

function sendUpdateStatus(status, details = {}) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('paperly-update-status', { status, ...details });
  }
}

function configureUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
  autoUpdater.on('update-available', (info) => sendUpdateStatus('downloading', { version: info.version }));
  autoUpdater.on('update-not-available', (info) => sendUpdateStatus('latest', { version: info.version }));
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus('downloading', { percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus('downloaded', { version: info.version }));
  autoUpdater.on('error', (error) => {
    console.error('Update error:', error);
    sendUpdateStatus('error');
  });

  ipcMain.handle('paperly:check-for-updates', async () => {
    await autoUpdater.checkForUpdates();
  });
  ipcMain.handle('paperly:install-update', () => {
    autoUpdater.quitAndInstall();
  });
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.traineddata': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function appRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..', 'portable-build', 'app');
}

function startLocalServer() {
  const root = path.resolve(appRoot());
  server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400).end('Bad request'); return; }
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    let file = path.resolve(root, requested);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end('Forbidden'); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(localPort, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function createWindow() {
  const localUrl = await startLocalServer();
  const window = new BrowserWindow({
    title: 'Paperly',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#ecebe5',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(localUrl)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
  window.once('ready-to-show', () => window.show());
  await window.loadURL(localUrl);
}

app.whenReady().then(async () => {
  configureUpdater();
  await createWindow();
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.close());
