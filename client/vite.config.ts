// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Node.js path module
import electron from 'vite-plugin-electron';
import native from 'vite-plugin-native'

export default defineConfig({
	plugins: [
		react(), 
		electron({
			entry: './boot.cjs',
			 vite: {
                // This vite config is specifically for the main process build
                build: {
                    rollupOptions: {
                        // Tell Vite to treat 'steamworks.js' as an external module.
                        // It will leave `require('steamworks.js')` as is, and Node.js
                        // will resolve it from node_modules at runtime.
                        external: ['steamworks.js', '/HavokPhysics.wasm'],
                    },
                },
            },
		}), 
		native({})
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@project-override/shared': path.resolve(__dirname, '../shared/src'),
		},
		external: [ './boot.cjs', '/HavokPhysics.wasm' ]
	},
	build: {
		outDir: 'build',
	},
	server: {
		port: 3000,
		watch: {
		ignored: ['./boot.cjs']
		}
	}
});




