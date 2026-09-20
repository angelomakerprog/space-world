import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths, so a built copy works wherever it is served from —
  // a host's root, a GitHub Pages subfolder, or a plain folder
  base: './',
  server: { port: 5173, host: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
