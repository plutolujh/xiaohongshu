import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    mimeTypes: {
      '.md': 'text/markdown; charset=utf-8'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    include: []
  },
  assetsInclude: ['**/*.md'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,mjs,jsx}']
  }
});
