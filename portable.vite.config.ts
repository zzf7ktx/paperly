import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  root: 'portable',
  base: './',
  publicDir: '../public',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react(), wasm()],
  build: {
    outDir: '../portable-build/app',
    emptyOutDir: true,
  },
});
