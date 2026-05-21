import "./dev.js";
import "./project.svelte.js";
import "./export.js";
//#region src/lib/stores/preview.svelte.ts
var BASE_FAMILY = "PreviewFont";
var PreviewStore = class {
	familyName = BASE_FAMILY;
	building = false;
	error = null;
	lastBuildMs = 0;
	glyphCount = 0;
	sizeKb = 0;
	buildSeq = 0;
	currentFace = null;
	currentUrl = null;
	pending = null;
	requestRebuild(delayMs = 180) {}
	async build() {}
	updateRootCss(family) {
		document.documentElement.style.setProperty("--preview-family", `'${family}', ui-sans-serif, system-ui`);
	}
	dispose() {
		if (this.pending) clearTimeout(this.pending);
		if (this.currentFace) document.fonts.delete(this.currentFace);
		if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
		this.currentFace = null;
		this.currentUrl = null;
		this.pending = null;
	}
};
var previewStore = new PreviewStore();
//#endregion
export { previewStore as t };
