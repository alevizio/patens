import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			// SvelteKit injects this alias at build time; Vitest needs it manually.
			$lib: path.resolve(__dirname, 'src/lib')
		}
	},
	test: {
		// Playwright owns e2e/**; Vitest owns *.test.ts colocated with source.
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules', 'e2e', '.svelte-kit', 'build']
	}
});
