<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { onMount } from 'svelte';
	import X from '@lucide/svelte/icons/x';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';

	type Step = {
		title: string;
		body: string;
		selector: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
	};

	const STEPS: Step[] = [
		{
			title: 'The glyph browser',
			body: 'Every character in the font lives here. Click any tile to start editing it. Categories collapse, and the search filters as you type.',
			selector: 'aside .grid',
			placement: 'right'
		},
		{
			title: 'Tool group',
			body: 'Three tools: Pencil (P) sketches with pressure-sensitive strokes, Eraser (E) removes them, Edit (A) drags bezier points after you trace.',
			selector: 'button[title*="Pencil"]',
			placement: 'bottom'
		},
		{
			title: 'Layer toggles',
			body: 'Anchors, onion-skin, sketch, vector, and grid are independent layers — toggle visibility without losing data.',
			selector: 'button[title*="Toggle anchors"]',
			placement: 'bottom'
		},
		{
			title: 'Trace to vector',
			body: 'After sketching, this turns your strokes into clean cubic-bezier contours via boolean union + Schneider curve fitting. Press T for fast access.',
			selector: 'button[title*="Trace to vector"], button[title*="Trace"]',
			placement: 'top'
		},
		{
			title: 'Live metrics window',
			body: 'Type any string here to see it rendered in your font as you draw. This is how you verify spacing and texture in real time.',
			selector: 'input[placeholder="Type to preview…"]',
			placement: 'top'
		},
		{
			title: 'Live preview pane',
			body: 'The current glyph rendered through @font-face. Updates in ~15ms after every edit. Glyph count + file size shown below.',
			selector: 'aside h3:nth-of-type(1) ~ div, .preview-font',
			placement: 'left'
		},
		{
			title: 'Tabs along the top',
			body: 'Spacing for kerning + classes + script packs. Designspace for variable fonts. Features for .fea source. AI for Claude-powered help. Preview for proofs. Export to ship.',
			selector: 'nav button[type="button"]',
			placement: 'bottom'
		}
	];

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();

	let stepIdx = $state(0);
	let targetRect = $state<DOMRect | null>(null);

	const step = $derived(STEPS[stepIdx]);

	const measureTarget = () => {
		if (!step) return;
		const candidates = document.querySelectorAll(step.selector);
		const el = candidates[0] as HTMLElement | undefined;
		if (!el) {
			targetRect = null;
			return;
		}
		targetRect = el.getBoundingClientRect();
	};

	$effect(() => {
		if (!open) return;
		void stepIdx; // re-measure when step changes
		requestAnimationFrame(measureTarget);
	});

	onMount(() => {
		const onResize = () => measureTarget();
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onResize, true);
		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onResize, true);
		};
	});

	// Always honour Escape so an opened tour can be dismissed even if the
	// tooltip happens to overlap a critical button.
	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') finish();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const next = () => {
		if (stepIdx < STEPS.length - 1) stepIdx++;
		else finish();
	};
	const prev = () => {
		if (stepIdx > 0) stepIdx--;
	};
	const finish = () => {
		settings.dismissEditorTour();
		stepIdx = 0;
		onclose();
	};

	const tooltipStyle = $derived.by(() => {
		if (!targetRect) return 'left: 50%; top: 50%; transform: translate(-50%, -50%);';
		const placement = step?.placement ?? 'bottom';
		const tooltipW = 360;
		const tooltipH = 160;
		const gap = 14;
		let left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
		let top = targetRect.bottom + gap;
		if (placement === 'top') top = targetRect.top - tooltipH - gap;
		if (placement === 'left') {
			top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
			left = targetRect.left - tooltipW - gap;
		}
		if (placement === 'right') {
			top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
			left = targetRect.right + gap;
		}
		// Keep within viewport
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		left = Math.max(12, Math.min(vw - tooltipW - 12, left));
		top = Math.max(12, Math.min(vh - tooltipH - 12, top));
		return `left: ${left}px; top: ${top}px;`;
	});

	const highlightStyle = $derived.by(() => {
		if (!targetRect) return 'display: none;';
		const pad = 6;
		return `left: ${targetRect.left - pad}px; top: ${targetRect.top - pad}px; width: ${targetRect.width + pad * 2}px; height: ${targetRect.height + pad * 2}px;`;
	});
</script>

{#if open}
	<!-- Dim overlay (clicks pass through to the highlighted element). The tour panel + spotlight catch their own events. -->
	<div class="pointer-events-none fixed inset-0 z-40 bg-fg/35 backdrop-blur-[2px]"></div>

	<!-- Spotlight box -->
	<div
		class="pointer-events-none fixed z-40 rounded-md border-2 border-accent shadow-[0_0_0_3px_var(--color-accent-soft)] transition-all duration-150"
		style={highlightStyle}
	></div>

	<!-- Tour tooltip card -->
	<div
		class="pointer-events-auto fixed z-50 w-[360px] rounded-xl border border-border bg-surface p-4 shadow-xl"
		style={tooltipStyle}
		role="dialog"
		aria-modal="false"
		aria-label="Editor tour"
	>
		<div class="mb-2 flex items-start justify-between gap-3">
			<div>
				<div class="text-[10px] font-semibold tracking-wider text-accent uppercase">
					Step {stepIdx + 1} of {STEPS.length}
				</div>
				<h3 class="mt-0.5 text-[15px] font-semibold text-fg">{step?.title}</h3>
			</div>
			<button
				type="button"
				onclick={finish}
				class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
				aria-label="Skip tour"
				title="Skip tour (Esc)"
			>
				<X class="size-4" />
			</button>
		</div>

		<p class="mb-4 text-[13px] leading-relaxed text-fg-muted">{step?.body}</p>

		<div class="flex items-center justify-between">
			<button
				type="button"
				onclick={prev}
				disabled={stepIdx === 0}
				class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
			>
				<ChevronLeft class="size-3.5" /> Back
			</button>
			<button
				type="button"
				onclick={finish}
				class="rounded-md px-2 py-1 text-[12px] font-medium text-fg-subtle hover:text-fg-muted"
			>
				Skip tour
			</button>
			<button
				type="button"
				onclick={next}
				class="inline-flex items-center gap-1 rounded-md bg-fg px-3 py-1 text-[12px] font-medium text-canvas hover:bg-fg/90"
			>
				{stepIdx === STEPS.length - 1 ? 'Done' : 'Next'}
				{#if stepIdx < STEPS.length - 1}<ChevronRight class="size-3.5" />{/if}
			</button>
		</div>
	</div>
{/if}
