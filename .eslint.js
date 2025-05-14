// project-override/.eslintrc.js
module.exports = {
	root: true, // ESLint should not look for config files further up the directory tree.
	parser: '@typescript-eslint/parser', // Specifies the ESLint parser for TypeScript
	parserOptions: {
		ecmaVersion: 2022, // Allows for the parsing of modern ECMAScript features
		sourceType: 'module', // Allows for the use of imports
		ecmaFeatures: {
			jsx: true, // Allows for the parsing of JSX
		},
		// project: ['./packages/*/tsconfig.json', './tsconfig.json'], // For type-aware linting (can be slower)
		// tsconfigRootDir: __dirname, // Root directory for tsconfig.json files
	},
	settings: {
		react: {
			version: 'detect', // Automatically detects the React version
		},
	},
	env: {
		browser: true, // Browser global variables.
		node: true, // Node.js global variables and Node.js scoping.
		es2021: true, // Adds all ECMAScript 2021 globals and automatically sets sourceType to 'module'.
	},
	plugins: [
		'@typescript-eslint', // TypeScript specific linting rules
		'react', // React specific linting rules
		'react-hooks', // React Hooks specific linting rules
		'prettier', // Runs Prettier as an ESLint rule
	],
	extends: [
		'eslint:recommended', // Base ESLint recommended rules
		'plugin:@typescript-eslint/recommended', // Recommended rules from @typescript-eslint/eslint-plugin
		// 'plugin:@typescript-eslint/recommended-requiring-type-checking', // Optional: for stricter type-aware rules (requires `project` in parserOptions)
		'plugin:react/recommended', // Recommended rules from eslint-plugin-react
		'plugin:react/jsx-runtime', // For the new JSX transform (no need to import React)
		'plugin:react-hooks/recommended', // Recommended rules from eslint-plugin-react-hooks
		'prettier', // Turns off ESLint rules that might conflict with Prettier
		// 'plugin:prettier/recommended' // This enables eslint-plugin-prettier and eslint-config-prettier in one go.
		// Using 'prettier' in extends and 'prettier' in plugins is equivalent and common.
	],
	rules: {
		'prettier/prettier': 'warn', // Show Prettier differences as ESLint warnings. Use 'error' for stricter enforcement.

		// General Best Practices
		'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // Warn about console.log in production
		'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
		eqeqeq: ['error', 'always'], // Enforce === and !==

		// TypeScript Specific Rules
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn on unused vars, allowing _ for ignored args
		'@typescript-eslint/no-explicit-any': 'warn', // Warn on usage of 'any' type
		'@typescript-eslint/explicit-function-return-type': 'off', // Optional: Can be noisy, TS often infers well
		'@typescript-eslint/explicit-module-boundary-types': 'off', // Optional: Similar to above for exported functions
		'@typescript-eslint/no-non-null-assertion': 'warn', // Warn on `!` non-null assertions

		// React Specific Rules
		'react/prop-types': 'off', // Not needed with TypeScript
		'react/react-in-jsx-scope': 'off', // Already handled by 'plugin:react/jsx-runtime' with new JSX transform
		// Add any other specific rules you want
	},
	overrides: [
		// Configuration for backend (Node.js) files
		{
			files: ['./packages/po_server/**/*.ts'],
			env: {
				node: true,
				browser: false, // Server code doesn't run in browser
			},
			rules: {
				// You can add server-specific rules here if needed
			},
		},
		// Configuration for frontend (React) files
		{
			files: ['./packages/client/**/*.ts', './packages/client/**/*.tsx'],
			env: {
				browser: true,
				node: false, // Client code typically doesn't have direct Node.js access
			},
			rules: {
				// You can add client-specific rules here if needed
			},
		},
		// Configuration for shared files (could be used in both Node and Browser)
		{
			files: ['./packages/shared/**/*.ts'],
			env: {
				// Assume it can be used in both, or set more specific based on usage
				node: true,
				browser: true,
			},
			rules: {
				// Add shared-specific rules here
			},
		},
		// Configuration for JS config files (like this .eslintrc.js itself)
		{
			files: ['*.js', '*.cjs'],
			env: {
				node: true,
				browser: false,
			},
			rules: {
				'@typescript-eslint/no-var-requires': 'off', // Allow require() in JS config files
			},
		},
	],
	ignorePatterns: [
		'node_modules/',
		'dist/', // Common output directory
		'build/', // Another common output directory
		'coverage/',
		'pnpm-lock.yaml',
		'**/*.md', // Ignore markdown files for linting TS/JS
		// Add any other files or directories you want to ignore
	],
};
