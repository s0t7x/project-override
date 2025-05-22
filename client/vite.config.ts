// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Node.js path module
import electron from 'vite-plugin-electron';

export default defineConfig({
	plugins: [react(), electron({
		entry: './boot.cjs'
	})],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@project-override/shared': path.resolve(__dirname, '../shared/src'),
		},
	},
	build: {
		outDir: 'build',
	},
	server: {
		port: 3000,
	},
});
