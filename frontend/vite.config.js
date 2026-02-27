import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',           // frontend/ is the root for vite
  server: {
    port: 3000,
    // ── Dev proxy: /api/* → backend:5000 ──────────────────────
    // Your backend routes are: /auth  /ride  /booking  /users
    // Frontend calls:          /api/auth  /api/ride  /api/booking
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
