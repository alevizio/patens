import "./dev.js";
//#region src/lib/stores/toast.svelte.ts
var ToastStore = class {
	items = [];
	nextId = 1;
	push(message, kind = "info", durationMs = 3200) {
		const id = this.nextId++;
		const toast = {
			id,
			kind,
			message,
			createdAt: Date.now()
		};
		this.items = [...this.items, toast];
		if (durationMs > 0) setTimeout(() => this.dismiss(id), durationMs);
		return id;
	}
	info(msg, ms) {
		return this.push(msg, "info", ms);
	}
	success(msg, ms) {
		return this.push(msg, "success", ms);
	}
	warn(msg, ms) {
		return this.push(msg, "warn", ms);
	}
	error(msg, ms) {
		return this.push(msg, "error", ms ?? 5e3);
	}
	dismiss(id) {
		this.items = this.items.filter((t) => t.id !== id);
	}
};
var toast = new ToastStore();
//#endregion
export { toast as t };
