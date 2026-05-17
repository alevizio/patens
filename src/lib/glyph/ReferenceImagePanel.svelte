<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import type { ReferenceImage } from '$lib/font/types';
	import Image from '@lucide/svelte/icons/image';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	let fileInput: HTMLInputElement | null = $state(null);

	const loadImage = (src: string): Promise<{ width: number; height: number }> =>
		new Promise((resolve, reject) => {
			const img = new window.Image();
			img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
			img.onerror = reject;
			img.src = src;
		});

	const handleFiles = async (files: FileList | null) => {
		if (!files || files.length === 0 || !glyph || !metrics) return;
		const file = files[0];
		if (!file.type.startsWith('image/')) {
			alert('Please choose an image file.');
			return;
		}
		if (file.size > 4 * 1024 * 1024) {
			alert('Image is over 4MB — please use a smaller reference to keep the project light.');
			return;
		}
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		const dim = await loadImage(dataUrl);
		// Fit the image's height to the em-square (ascender → descender)
		const fontHeight = metrics.ascender - metrics.descender;
		const scale = fontHeight / dim.height;
		const ref: ReferenceImage = {
			src: dataUrl,
			x: 0,
			y: metrics.descender,
			width: Math.round(dim.width * scale),
			height: Math.round(dim.height * scale),
			opacity: 0.4
		};
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, referenceImage: ref }));
	};

	const update = (mut: Partial<ReferenceImage>) => {
		if (!glyph?.referenceImage) return;
		const next = { ...glyph.referenceImage, ...mut };
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, referenceImage: next }));
	};

	const remove = () => {
		if (!glyph) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => {
			const { referenceImage: _, ...rest } = g;
			return rest;
		});
	};

	const handlePaste = (ev: ClipboardEvent) => {
		if (!ev.clipboardData) return;
		for (const item of ev.clipboardData.items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					const fl = new DataTransfer();
					fl.items.add(file);
					handleFiles(fl.files);
					ev.preventDefault();
					return;
				}
			}
		}
	};
</script>

<svelte:window onpaste={handlePaste} />

{#if glyph}
	<div class="border-b border-border p-4">
		<h3 class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<span class="inline-flex items-center gap-1.5">
				<Image class="size-3" /> Reference
			</span>
			{#if glyph.referenceImage}
				<button
					type="button"
					onclick={remove}
					class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
					aria-label="Remove reference image"
				>
					<Trash2 class="size-3" />
				</button>
			{/if}
		</h3>
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			class="hidden"
			onchange={(e) => handleFiles(e.currentTarget.files)}
		/>
		{#if !glyph.referenceImage}
			<button
				type="button"
				onclick={() => fileInput?.click()}
				class="block w-full rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 px-2 py-3 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
			>
				Upload or paste an image to trace
			</button>
			<p class="mt-2 text-[10px] text-fg-subtle">
				Drop an image, click here, or paste from clipboard. Fits height to the em-square.
			</p>
		{:else}
			<label class="block text-[10px] text-fg-subtle">
				Opacity
				<input
					type="range"
					min={0.05}
					max={1}
					step={0.05}
					value={glyph.referenceImage.opacity}
					oninput={(e) => update({ opacity: Number(e.currentTarget.value) })}
					class="mt-1 h-1 w-full accent-accent"
				/>
			</label>
			<div class="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-fg-subtle">
				<label class="flex items-center gap-1">
					x
					<input
						type="number"
						value={glyph.referenceImage.x}
						onchange={(e) => update({ x: Number(e.currentTarget.value) })}
						class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"
					/>
				</label>
				<label class="flex items-center gap-1">
					y
					<input
						type="number"
						value={glyph.referenceImage.y}
						onchange={(e) => update({ y: Number(e.currentTarget.value) })}
						class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"
					/>
				</label>
				<label class="flex items-center gap-1">
					w
					<input
						type="number"
						value={glyph.referenceImage.width}
						onchange={(e) => update({ width: Number(e.currentTarget.value) })}
						class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"
					/>
				</label>
				<label class="flex items-center gap-1">
					h
					<input
						type="number"
						value={glyph.referenceImage.height}
						onchange={(e) => update({ height: Number(e.currentTarget.value) })}
						class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"
					/>
				</label>
			</div>
			<button
				type="button"
				onclick={() => fileInput?.click()}
				class="mt-2 w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
			>
				Replace image
			</button>
		{/if}
	</div>
{/if}
