/**
 * Live preview pipeline: watches the project store, debounce-builds an OTF,
 * registers it via FontFace API, and exposes the family name for consumers.
 *
 * Strategy:
 *   - Suffix the family name with a build counter so each new build is a
 *     distinct FontFace — this forces the browser to re-layout text.
 *   - Drop the previous FontFace from `document.fonts` after the new one loads.
 */

import { browser } from '$app/environment';
import { buildFont } from '$lib/font/export';
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
			const { font, glyphCount } = buildFont(project, {
				masterId: projectStore.selectedMasterId
			});
			const buffer = font.toArrayBuffer();
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
