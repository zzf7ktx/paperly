const { copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const destination = join(root, 'portable-build');
mkdirSync(destination, { recursive: true });
for (const file of ['server.cjs', 'README.txt', 'Start Paperly.cmd']) {
  copyFileSync(join(root, 'portable', file), join(destination, file));
}
// The Windows launcher must work on a machine without Node installed.
if (process.platform === 'win32') copyFileSync(process.execPath, join(destination, 'node.exe'));
