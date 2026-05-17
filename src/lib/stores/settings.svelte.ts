/**
 * Browser-local user settings (currently: the Anthropic API key for AI
 * features). Stored in localStorage so it persists across sessions but
 * never leaves the user's browser except as a per-request payload to our
 * own serverless proxy.
 */

import { browser } from '$app/environment';

const KEY = 'font-studio:settings:v1';

type SettingsShape = {
	anthropicApiKey?: string;
	preferredModel?: string;
	welcomeDismissed?: boolean;
	editorTourDismissed?: boolean;
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

	constructor() {
		const initial = read();
		if (initial.anthropicApiKey) this.anthropicApiKey = initial.anthropicApiKey;
		if (initial.preferredModel) this.preferredModel = initial.preferredModel;
		this.welcomeDismissed = !!initial.welcomeDismissed;
		this.editorTourDismissed = !!initial.editorTourDismissed;
	}

	private persist() {
		write({
			anthropicApiKey: this.anthropicApiKey,
			preferredModel: this.preferredModel,
			welcomeDismissed: this.welcomeDismissed,
			editorTourDismissed: this.editorTourDismissed
		});
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
