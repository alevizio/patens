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

	constructor() {
		const initial = read();
		if (initial.anthropicApiKey) this.anthropicApiKey = initial.anthropicApiKey;
		if (initial.preferredModel) this.preferredModel = initial.preferredModel;
	}

	setApiKey(value: string) {
		this.anthropicApiKey = value.trim();
		write({ anthropicApiKey: this.anthropicApiKey, preferredModel: this.preferredModel });
	}

	setPreferredModel(model: string) {
		this.preferredModel = model;
		write({ anthropicApiKey: this.anthropicApiKey, preferredModel: this.preferredModel });
	}

	clear() {
		this.anthropicApiKey = '';
		write({ preferredModel: this.preferredModel });
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
