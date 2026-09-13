const { cpSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const destination = join(root, 'public', 'pdfjs', 'wasm');
mkdirSync(destination, { recursive: true });
cpSync(join(root, 'node_modules', 'pdfjs-dist', 'wasm'), destination, { recursive: true });
