import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // PDF.js's internal XFA/operator/font APIs and legacy PDF adapters are not
    // fully typed. Keep this debt visible without blocking structural changes.
    files: ['features/pdf-editor/**/*.ts', 'features/pdf-editor/**/*.tsx'],
    rules: { '@typescript-eslint/no-explicit-any': 'warn' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'portable-build/**',
    'electron-dist/**',
    'public/ocr/**',
    '.npm-cache/**',
    '.wrangler/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
