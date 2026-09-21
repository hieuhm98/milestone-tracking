import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser only ever talks to localhost:5173. Vite forwards every
    // /api request to the Express server on 4000, so frontend and API look
    // like ONE site to the browser: no CORS setup, and cookies just work.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
