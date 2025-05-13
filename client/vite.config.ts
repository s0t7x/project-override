// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Node.js path module

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias for your src directory (matches tsconfig.json paths)
      '@': path.resolve(__dirname, './src'),
      // Alias for your shared package (matches tsconfig.json paths)
      // This tells Vite where to find the shared package's source code during bundling.
      '@project-override/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  // Optional: if you need to serve from a sub-path in development or production
  // base: '/my-app/',
  build: {
    outDir: 'dist', // Output directory for production build
  },
  server: {
    port: 3000, // Development server port
    // proxy: { // Optional: Proxy API requests to your po_server in development
    //   '/api': { // If your po_server has REST endpoints at /api
    //     target: 'http://localhost:2567', // Your po_server address
    //     changeOrigin: true,
    //     // rewrite: (path) => path.replace(/^\/api/, '') // if needed
    //   }
    // }
  },
});
