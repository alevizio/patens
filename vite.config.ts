import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// opentype.js ships dual CJS/ESM with no exports field. Vite picks the
	// .mjs ESM (named exports only) but the Node SSR runtime picks the
	// CJS (default export). Bundling it into the SSR output forces Vite's
	// resolver to handle the interop in one place — fixes
	// "Named export 'parse' not found" + "opentype.parse is not a function"
	// without needing per-import gymnastics.
	ssr: {
		noExternal: ['opentype.js']
	}
});
