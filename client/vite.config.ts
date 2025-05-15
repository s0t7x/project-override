// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Node.js path module

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@project-override/shared': path.resolve(__dirname, '../shared/src'),
		},
	},
	build: {
		outDir: 'dist',
	},
	server: {
		port: 3000,
	},
});
