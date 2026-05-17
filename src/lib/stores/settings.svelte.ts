/**
 * Browser-local user settings (currently: the Anthropic API key for AI
 * features). Stored in localStorage so it persists across sessions but
 * never leaves the user's browser except as a per-request payload to our
 * own serverless proxy.
 */

import { browser } from '$app/environment';

const KEY = 'font-studio:settings:v1';

export type ThemePref = 'system' | 'light' | 'dark';

export type EditorPrefs = {
	showGrid: boolean;
	showAnatomy: boolean;
	skipEmptyNav: boolean;
	showOnion: boolean;
	showAnchors: boolean;
	showReference: boolean;
};

type SettingsShape = {
	anthropicApiKey?: string;
	preferredModel?: string;
	welcomeDismissed?: boolean;
	editorTourDismissed?: boolean;
	theme?: ThemePref;
	editor?: Partial<EditorPrefs>;
};

const read = (): SettingsShape => {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return {};
		return JSON.parse(raw) as SettingsShape;
	} catch {
		return {};
	}
};

const write = (s: SettingsShape) => {
	if (!browser) return;
	try {
		localStorage.setItem(KEY, JSON.stringify(s));
	} catch {
		/* ignore quota errors */
	}
};

class SettingsStore {
	anthropicApiKey = $state<string>('');
	preferredModel = $state<string>('claude-sonnet-4-6');
	welcomeDismissed = $state<boolean>(false);
	editorTourDismissed = $state<boolean>(false);
	theme = $state<ThemePref>('system');
	editor = $state<EditorPrefs>({
		showGrid: false,
		showAnatomy: false,
		skipEmptyNav: false,
		showOnion: false,
		showAnchors: true,
		showReference: true
	});

	constructor() {
		const initial = read();
		if (initial.anthropicApiKey) this.anthropicApiKey = initial.anthropicApiKey;
		if (initial.preferredModel) this.preferredModel = initial.preferredModel;
		this.welcomeDismissed = !!initial.welcomeDismissed;
		this.editorTourDismissed = !!initial.editorTourDismissed;
		if (initial.theme === 'light' || initial.theme === 'dark' || initial.theme === 'system') {
			this.theme = initial.theme;
		}
		if (initial.editor) {
			this.editor = { ...this.editor, ...initial.editor };
		}
		this.applyTheme();
	}

	private persist() {
		write({
			anthropicApiKey: this.anthropicApiKey,
			preferredModel: this.preferredModel,
			welcomeDismissed: this.welcomeDismissed,
			editorTourDismissed: this.editorTourDismissed,
			theme: this.theme,
			editor: this.editor
		});
	}

	updateEditorPrefs(mut: Partial<EditorPrefs>) {
		// Only assign keys that actually changed to avoid an infinite reactive
		// loop with $effect callers (writing to $state re-triggers any effect
		// whose dependency expression includes that state).
		let changed = false;
		const next = { ...this.editor };
		for (const k of Object.keys(mut) as Array<keyof EditorPrefs>) {
			const v = mut[k];
			if (v !== undefined && next[k] !== v) {
				(next as Record<string, unknown>)[k] = v;
				changed = true;
			}
		}
		if (!changed) return;
		this.editor = next;
		this.persist();
	}

	setTheme(theme: ThemePref) {
		this.theme = theme;
		this.applyTheme();
		this.persist();
	}

	private applyTheme() {
		if (!browser) return;
		const root = document.documentElement;
		root.classList.remove('theme-light', 'theme-dark');
		if (this.theme === 'light') root.classList.add('theme-light');
		else if (this.theme === 'dark') root.classList.add('theme-dark');
	}

	setApiKey(value: string) {
		this.anthropicApiKey = value.trim();
		this.persist();
	}

	setPreferredModel(model: string) {
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
		this.anthropicApiKey = '';
		this.persist();
	}

	get hasKey(): boolean {
		return this.anthropicApiKey.length > 10;
	}

	get maskedKey(): string {
		if (!this.hasKey) return '';
		return this.anthropicApiKey.slice(0, 10) + '…' + this.anthropicApiKey.slice(-4);
	}
}

export const settings = new SettingsStore();
