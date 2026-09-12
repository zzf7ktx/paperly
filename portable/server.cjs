const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const host = '127.0.0.1';
const port = 4173;
const root = path.join(__dirname, 'app');
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let file = path.resolve(root, requested);
  if (!file.startsWith(path.resolve(root))) { response.writeHead(403).end('Forbidden'); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  const extension = path.extname(file).toLowerCase();
  response.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(response);
});

server.on('error', (error) => {
  console.error(`Could not start Paperly: ${error.message}`);
  process.stdin.resume();
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log(`Paperly is running at ${url}`);
  console.log('Keep this window open while editing. Press Ctrl+C to stop.');
  spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
});
