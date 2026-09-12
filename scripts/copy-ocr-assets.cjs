const { copyFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const destination = join(root, 'public', 'ocr');
mkdirSync(destination, { recursive: true });

const assets = [
  [join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js'],
  [join(root, 'node_modules', 'tesseract.js-core', 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [join(root, 'node_modules', 'tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
  [join(root, 'node_modules', 'tesseract.js-core', 'tesseract-core-relaxedsimd-lstm.wasm.js'), 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  [join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];

for (const [source, name] of assets) copyFileSync(source, join(destination, name));
