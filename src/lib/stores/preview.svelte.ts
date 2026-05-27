/**
 * Live preview pipeline: watches the project store, debounce-builds an OTF,
 * registers it via FontFace API, and exposes the family name for consumers.
 *
 * Strategy:
 *   - Suffix the family name with a build counter so each new build is a
 *     distinct FontFace — this forces the browser to re-layout text.
 *   - Drop the previous FontFace from `document.fonts` after the new one loads.
 *
 * Lazy-load discipline:
 *   `buildFont` (export.ts) statically imports opentype.js (~243 KB chunk).
 *   That's worthwhile cost when the user is in the editor, but the project
 *   /[id]/+layout.svelte mounts the previewStore on EVERY child route — the
 *   audit page, the spacing page, the export page, etc. all of which already
 *   carry their own heavy chunks. To stop opentype.js from landing on the
 *   critical path of every project sub-route, we dynamically import
 *   `buildFont` + `applyColorFontTables` inside `build()`. The first
 *   `requestRebuild()` then incurs a one-time fetch cost (gzipped ~68 KB);
 *   subsequent calls hit the browser's module cache.
 */

import { browser } from '$app/environment';
import { projectStore } from './project.svelte';

const BASE_FAMILY = 'PreviewFont';

class PreviewStore {
	familyName = $state<string>(BASE_FAMILY);
	building = $state(false);
	error = $state<string | null>(null);
	lastBuildMs = $state(0);
	glyphCount = $state(0);
	sizeKb = $state(0);

	private buildSeq = 0;
	private currentFace: FontFace | null = null;
	private currentUrl: string | null = null;
	private pending: ReturnType<typeof setTimeout> | null = null;

	requestRebuild(delayMs = 180) {
		if (!browser) return;
		if (this.pending) clearTimeout(this.pending);
		this.pending = setTimeout(() => this.build(), delayMs);
	}

	private async build() {
		if (!browser) return;
		const project = projectStore.project;
		if (!project) return;

		this.building = true;
		this.error = null;
		const start = performance.now();
		try {
			// Lazy-load opentype.js (via export.ts) so it stays off the
			// critical path of every /project/[id]/* sub-route that doesn't
			// render the live preview immediately (audit / spacing / families
			// / release / share).
			const [{ buildFont }, { applyColorFontTables }] = await Promise.all([
				import('$lib/font/export'),
				import('$lib/font/colr')
			]);
			const { font, glyphCount, colorBaseGlyphs, colorV1BaseGlyphs } = buildFont(project, {
				masterId: projectStore.selectedMasterId
			});
			let buffer: ArrayBuffer = font.toArrayBuffer();
			// Splice color tables when the project has color layers + palettes.
			// Modern browsers render COLR v0/v1 natively for CSS-applied text,
			// so the Specimen tab + any other preview-font surface will show
			// gradients in colour the moment this lands.
			if (
				(colorBaseGlyphs.length > 0 || colorV1BaseGlyphs.length > 0) &&
				project.palettes &&
				project.palettes.length > 0
			) {
				const spliced = applyColorFontTables(
					new Uint8Array(buffer),
					colorBaseGlyphs,
					project.palettes,
					colorV1BaseGlyphs
				);
				buffer = spliced.buffer.slice(
					spliced.byteOffset,
					spliced.byteOffset + spliced.byteLength
				) as ArrayBuffer;
			}
			const family = `${BASE_FAMILY}_${++this.buildSeq}`;
			const blob = new Blob([buffer], { type: 'font/otf' });
			const url = URL.createObjectURL(blob);
			const face = new FontFace(family, `url(${url}) format("opentype")`);
			await face.load();
			document.fonts.add(face);

			// Drop previous
			if (this.currentFace) document.fonts.delete(this.currentFace);
			if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);

			this.currentFace = face;
			this.currentUrl = url;
			this.familyName = family;
			this.glyphCount = glyphCount;
			this.sizeKb = buffer.byteLength / 1024;
			this.lastBuildMs = performance.now() - start;
			this.updateRootCss(family);
		} catch (e) {
			this.error = e instanceof Error ? e.message : String(e);
			console.error('Font build failed:', e);
		} finally {
			this.building = false;
		}
	}

	private updateRootCss(family: string) {
		document.documentElement.style.setProperty(
			'--preview-family',
			`'${family}', ui-sans-serif, system-ui`
		);
	}

	dispose() {
		if (this.pending) clearTimeout(this.pending);
		if (this.currentFace) document.fonts.delete(this.currentFace);
		if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
		this.currentFace = null;
		this.currentUrl = null;
		this.pending = null;
	}
}

export const previewStore = new PreviewStore();
