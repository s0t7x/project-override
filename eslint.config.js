// project-override/eslint.config.js
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
// import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'; // This often bundles config-prettier
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier'; // To turn off conflicting rules

export default tseslint.config(
	// Global ignores (equivalent to ignorePatterns)
	{
		ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', 'pnpm-lock.yaml', '**/*.md'],
	},

	// Base recommended rules for all JS/TS files
	{
		files: ['**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.cjs', '**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser, // Use typescript-eslint parser
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
				// project: true, // For type-aware linting, can point to true to find tsconfig.json
				// tsconfigRootDir: import.meta.dirname, // Or process.cwd()
			},
			globals: {
				...globals.browser, // Or specific ones like globals.node for server
				...globals.es2021,
				// Add Node.js globals explicitly if not covered by globals.node in specific configs
				// process: 'readonly',
				// __dirname: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			react: pluginReact,
			'react-hooks': pluginReactHooks,
			prettier: prettierPlugin,
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
		rules: {
			...tseslint.configs.eslintRecommended.rules, // eslint:recommended
			...tseslint.configs.recommended.rules, // @typescript-eslint/recommended
			// ...tseslint.configs.recommendedTypeChecked.rules, // If using type-aware linting
			...pluginReact.configs.recommended.rules,
			...pluginReact.configs['jsx-runtime'].rules,
			...pluginReactHooks.configs.recommended.rules,
			...prettierConfig.rules, // Turns off ESLint rules that conflict with Prettier
			'prettier/prettier': 'warn',

			// Your custom rules
			'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
			'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
			eqeqeq: ['error', 'always'],
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			// '@typescript-eslint/no-unused-imports': 'error', // tseslint.plugin doesn't directly export this rule, check its availability
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'react/prop-types': 'off',
		},
	},

	// Overrides for server files
	{
		files: ['packages/server/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		rules: {
			// server-specific rules
		},
	},

	// Overrides for client files
	{
		files: ['packages/client/**/*.ts', 'packages/client/**/*.tsx'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2021,
			},
		},
		rules: {
			// client-specific rules
		},
	},

	// Overrides for shared files
	{
		files: ['packages/shared/**/*.ts'],
		languageOptions: {
			globals: {
				// Allow both node and browser globals for shared
				...globals.node,
				...globals.browser,
				...globals.es2021,
			},
		},
		rules: {
			// shared-specific rules
		},
	},
);
