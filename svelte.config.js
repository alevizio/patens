import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x'
		}),
		// Default 'modulepreload' only kicks in once the bootstrap inline
		// script runs — meaning the browser can't start fetching the
		// entry chunks until HTML+CSS+inline-script parse completes.
		// 'preload-mjs' emits <link rel="preload" as="script" crossorigin>
		// in <head>, so the browser starts fetching start.js + app.js in
		// parallel with HTML parsing. Targets the lighthouse
		// network-dependency-tree-insight warning surfaced in the v1.4.0
		// audit.
		output: {
			preloadStrategy: 'preload-mjs'
		}
	}
};

export default config;
