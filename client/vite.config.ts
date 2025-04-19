import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Import path module

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  // Define server options (port, proxy if needed)
  server: {
    port: 3000,
    // host: '0.0.0.0',
  },
  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias for src directory
      '@shared': path.resolve(__dirname, '../shared'), // Alias for shared directory
    },
  },
  // Optimize dependencies (optional but can help)
  optimizeDeps: {
    include: [
       '@babylonjs/core',
       '@babylonjs/loaders',
       // Add other large dependencies if needed
    ],
  }
});