// Canvas drag-and-drop helpers — pulled out of the editor +page so the
// component file stays focused on layout + state. The drag-counter
// pattern is needed because dragenter/dragleave fire on every child
// element, not just the outer drop target.

import { projectStore } from '$lib/stores/project.svelte';
import { toast } from '$lib/stores/toast.svelte';
import type { Glyph } from '$lib/font/types';

export type FontMetrics = { ascender: number; descender: number };

export type CanvasDropController = {
	active: boolean;
	onDragEnter: (e: DragEvent) => void;
	onDragLeave: (e: DragEvent) => void;
	onDragOver: (e: DragEvent) => void;
	onDrop: (e: DragEvent) => Promise<void>;
};

// Returns a self-contained controller wired against a getter for the
// current glyph + metrics (so the editor doesn't have to wire reactive
// values through every method).
export const createCanvasDropController = (
	getCtx: () => { glyph: Glyph | null; metrics: FontMetrics | null }
) => {
	let counter = 0;
	const state = $state<{ active: boolean }>({ active: false });

	const onDragEnter = (e: DragEvent) => {
		if (!e.dataTransfer?.types.includes('Files')) return;
		e.preventDefault();
		counter++;
		state.active = true;
	};

	const onDragLeave = (e: DragEvent) => {
		e.preventDefault();
		counter--;
		if (counter <= 0) state.active = false;
	};

	const onDragOver = (e: DragEvent) => {
		if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
	};

	const onDrop = async (e: DragEvent) => {
		e.preventDefault();
		state.active = false;
		counter = 0;
		const file = e.dataTransfer?.files?.[0];
		const { glyph, metrics } = getCtx();
		if (!file || !file.type.startsWith('image/') || !glyph || !metrics) return;
		if (file.size > 4 * 1024 * 1024) {
			toast.warn('Image is over 4MB — please use a smaller reference.');
			return;
		}
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		const dim = await new Promise<{ width: number; height: number }>(
			(resolve, reject) => {
				const img = new window.Image();
				img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
				img.onerror = reject;
				img.src = dataUrl;
			}
		);
		const fontHeight = metrics.ascender - metrics.descender;
		const scale = fontHeight / dim.height;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			referenceImage: {
				src: dataUrl,
				x: 0,
				y: metrics.descender,
				width: Math.round(dim.width * scale),
				height: Math.round(dim.height * scale),
				opacity: 0.4
			}
		}));
	};

	return {
		get active() {
			return state.active;
		},
		onDragEnter,
		onDragLeave,
		onDragOver,
		onDrop
	};
};
