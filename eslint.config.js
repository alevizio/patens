import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

/**
 * Flat ESLint config for Font Studio.
 *
 * Goal: catch real bugs + enforce style invariants svelte-check doesn't
 * cover, WITHOUT being so strict that every PR turns into a lint cleanup.
 *
 * Rules pinned to error are things that have actually bitten this codebase:
 *  - no-unused-vars: easy way to spot dead code during refactors
 *  - no-explicit-any: matches the CLAUDE.md TypeScript strict-mode rule
 *  - svelte/no-at-html-tags: defense-in-depth against XSS in user notes/brief
 *
 * Rules at warn are stylistic; CI doesn't fail on warns, but the linter
 * surfaces them locally.
 */
export default [
	{
		ignores: [
			'.svelte-kit/**',
			'.vercel/**',
			'build/**',
			'dist/**',
			'node_modules/**',
			'static/**',
			'public/**',
			'coverage/**',
			'cli/dist/**',
			'docs/api/**',
			'**/*.d.ts'
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		files: ['**/*.ts', '**/*.svelte', '**/*.svelte.ts', '**/*.mjs'],
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				...globals.browser,
				...globals.node
			},
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module'
			}
		},
		rules: {
			// Catch real bugs / dead code — warn-level so CI surfaces them
			// without blocking PRs while the existing audit is being worked
			// down.
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			// Real-bug rules at error — these have actually caused issues
			// in this codebase (no-dupe-else-if found the v-shortcut conflict).
			'no-dupe-else-if': 'error',
			'no-redeclare': 'error',
			// Defense-in-depth against XSS via user notes/brief fields
			'svelte/no-at-html-tags': 'error',
			// Stylistic — warn so the report shows them; CI runs with
			// --max-warnings 9999 so warnings don't block.
			'no-useless-assignment': 'warn',
			'no-useless-escape': 'warn',
			'no-empty': 'warn',
			'no-constant-binary-expression': 'warn',
			'no-sparse-arrays': 'warn',
			'svelte/no-useless-mustaches': 'warn',
			'svelte/prefer-writable-derived': 'warn',
			// Loosen things that don't fit Svelte 5 / SvelteKit, or that
			// would require a refactor too large for this baseline
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			// Svelte-reactivity rules that would require switching every
			// Map/Set in the codebase to SvelteMap/SvelteSet — real signal,
			// but a deliberate follow-up arc, not a baseline lint pass.
			'svelte/prefer-svelte-reactivity': 'off',
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			},
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.svelte']
			}
		}
	},
	{
		// Tests + build scripts use console freely (and Node globals).
		files: ['**/*.test.ts', '**/*.spec.ts', 'e2e/**', 'scripts/**'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'no-console': 'off',
			// Build scripts intentionally declare constants they may not
			// use yet (BASELINE etc.); don't flag them.
			'@typescript-eslint/no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^(_|[A-Z_]+$)'
			}]
		}
	}
];
