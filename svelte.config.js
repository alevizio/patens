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
		},
		// Routes the build crawler can't auto-discover because nothing
		// links to them in the prerendered HTML graph: the AI-corpus
		// endpoints (LLM crawlers hit these directly via robots.txt /
		// llms.txt convention), the sitemap, and the RSS feed. Each is
		// marked `prerender = true` in its own +server.ts but needs to
		// appear here too so the build doesn't error with
		// `routes were marked as prerenderable but were not prerendered`.
		prerender: {
			entries: [
				'*', // crawl-reachable routes
				'/llms.txt',
				'/llms-full.txt',
				'/sitemap.xml',
				'/changelog/rss.xml',
				'/robots.txt'
			]
		}
	}
};

export default config;
