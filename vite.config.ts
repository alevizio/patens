import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// Bundle analysis on demand — `pnpm run analyze` builds with the
// visualizer plugin enabled and writes bundle-report.html to the
// repo root. Local-only by default so production builds stay clean.
const analyze = process.env.ANALYZE === '1';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		...(analyze
			? [
					visualizer({
						filename: 'bundle-report.html',
						gzipSize: true,
						brotliSize: true,
						template: 'treemap'
					})
				]
			: [])
	],
	// opentype.js ships dual CJS/ESM with no exports field. Vite picks the
	// .mjs ESM (named exports only) but the Node SSR runtime picks the
	// CJS (default export). Bundling it into the SSR output forces Vite's
	// resolver to handle the interop in one place — fixes
	// "Named export 'parse' not found" + "opentype.parse is not a function"
	// without needing per-import gymnastics.
	ssr: {
		noExternal: ['opentype.js']
	},
	// HarfBuzzJS ships a .wasm next to its JS. Vite's dep-optimization
	// inlines the JS but loses the wasm reference, then SSR handlers get
	// asked for /node_modules/.vite/deps/harfbuzz.wasm and rightly 404.
	// Excluding harfbuzzjs from pre-bundling routes the wasm via its
	// natural path. (See https://vitejs.dev/config/dep-optimization-options)
	optimizeDeps: {
		exclude: ['harfbuzzjs']
	},
	// Dev-only: keep Vite's file-watcher off doc-tree churn. We update
	// docs/launch/*, docs/architecture.md, README.md, etc. frequently
	// during release prep — these have no module graph dependency on
	// the app code, but Vite watching them triggers HMR cycles that can
	// confuse the dep-cache after a large doc commit, producing the
	// "Cannot read properties of undefined" + stale-chunk-fetch errors.
	server: {
		watch: {
			ignored: [
				'**/docs/**',
				'**/.claude/**',
				'**/memory/**',
				'**/*.md'
			]
		}
	}
});
