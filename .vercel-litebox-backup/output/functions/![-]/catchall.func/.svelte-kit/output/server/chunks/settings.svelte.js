import "./dev.js";
var read = () => {
	return {};
};
var SettingsStore = class {
	anthropicApiKey = "";
	preferredModel = "claude-sonnet-4-6";
	welcomeDismissed = false;
	editorTourDismissed = false;
	theme = "system";
	editor = {
		showGrid: false,
		showAnatomy: false,
		skipEmptyNav: false,
		showOnion: false,
		showAnchors: true,
		showReference: true
	};
	constructor() {
		const initial = read();
		if (initial.anthropicApiKey) this.anthropicApiKey = initial.anthropicApiKey;
		if (initial.preferredModel) this.preferredModel = initial.preferredModel;
		this.welcomeDismissed = !!initial.welcomeDismissed;
		this.editorTourDismissed = !!initial.editorTourDismissed;
		if (initial.theme === "light" || initial.theme === "dark" || initial.theme === "system") this.theme = initial.theme;
		if (initial.editor) this.editor = {
			...this.editor,
			...initial.editor
		};
		this.applyTheme();
	}
	persist() {
		this.anthropicApiKey, this.preferredModel, this.welcomeDismissed, this.editorTourDismissed, this.theme, this.editor;
	}
	updateEditorPrefs(mut) {
		let changed = false;
		const next = { ...this.editor };
		for (const k of Object.keys(mut)) {
			const v = mut[k];
			if (v !== void 0 && next[k] !== v) {
				next[k] = v;
				changed = true;
			}
		}
		if (!changed) return;
		this.editor = next;
		this.persist();
	}
	setTheme(theme) {
		this.theme = theme;
		this.applyTheme();
		this.persist();
	}
	applyTheme() {}
	setApiKey(value) {
		this.anthropicApiKey = value.trim();
		this.persist();
	}
	setPreferredModel(model) {
		this.preferredModel = model;
		this.persist();
	}
	dismissWelcome() {
		this.welcomeDismissed = true;
		this.persist();
	}
	resetWelcome() {
		this.welcomeDismissed = false;
		this.persist();
	}
	dismissEditorTour() {
		this.editorTourDismissed = true;
		this.persist();
	}
	resetEditorTour() {
		this.editorTourDismissed = false;
		this.persist();
	}
	clear() {
		this.anthropicApiKey = "";
		this.persist();
	}
	get hasKey() {
		return this.anthropicApiKey.length > 10;
	}
	get maskedKey() {
		if (!this.hasKey) return "";
		return this.anthropicApiKey.slice(0, 10) + "…" + this.anthropicApiKey.slice(-4);
	}
};
var settings = new SettingsStore();
//#endregion
export { settings as t };
