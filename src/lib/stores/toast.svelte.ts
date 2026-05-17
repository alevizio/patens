/**
 * Tiny toast queue — show transient status messages for save, undo, paste,
 * trace failures, etc. Auto-dismisses after a few seconds.
 */

export type ToastKind = 'info' | 'success' | 'warn' | 'error';

export type Toast = {
	id: number;
	kind: ToastKind;
	message: string;
	createdAt: number;
};

class ToastStore {
	items = $state<Toast[]>([]);
	private nextId = 1;

	push(message: string, kind: ToastKind = 'info', durationMs = 3200) {
		const id = this.nextId++;
		const toast: Toast = { id, kind, message, createdAt: Date.now() };
		this.items = [...this.items, toast];
		if (durationMs > 0) {
			setTimeout(() => this.dismiss(id), durationMs);
		}
		return id;
	}

	info(msg: string, ms?: number) {
		return this.push(msg, 'info', ms);
	}
	success(msg: string, ms?: number) {
		return this.push(msg, 'success', ms);
	}
	warn(msg: string, ms?: number) {
		return this.push(msg, 'warn', ms);
	}
	error(msg: string, ms?: number) {
		return this.push(msg, 'error', ms ?? 5000);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastStore();
