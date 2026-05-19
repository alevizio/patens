import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Playwright owns e2e/**; Vitest owns *.test.ts colocated with source.
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules', 'e2e', '.svelte-kit', 'build']
	}
});
