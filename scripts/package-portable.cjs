const { copyFileSync, existsSync, mkdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const destination = join(root, 'portable-build');
mkdirSync(destination, { recursive: true });
for (const file of ['server.cjs', 'README.txt', 'Start Paperly.cmd']) {
  copyFileSync(join(root, 'portable', file), join(destination, file));
}
// The Windows launcher must work on a machine without Node installed.
if (process.platform === 'win32') {
  const runtime = join(destination, 'node.exe');
  // Windows locks a running executable. An identical bundled runtime can stay
  // in place while the user keeps the portable app open during a rebuild.
  if (!existsSync(runtime) || !readFileSync(runtime).equals(readFileSync(process.execPath))) {
    copyFileSync(process.execPath, runtime);
  }
}
