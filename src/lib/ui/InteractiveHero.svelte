<script lang="ts">
	/**
	 * Interactive Fit specimen for the home page.
	 *
	 * Renders a display word ("design type") set in DJR's Fit — an extreme-
	 * wdth variable font. The 4 controls (Text, Width, Height, Spacing)
	 * live in a tiny floating menu at the bottom-right of the viewport:
	 * a small icon button by default, click to open a popover with the
	 * sliders/input.
	 *
	 * @font-face for "Fit Local" lives in +page.svelte's <svelte:head>.
	 * The woff2 itself is gitignored — Fit is licensed for FotM Club
	 * subscribers' personal use, not for public redistribution.
	 */
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';

	let text = $state('design type');
	let widthAxis = $state(380);
	let heightPct = $state(142);
	let spacing = $state(-12);

	let controlsOpen = $state(false);

	const MAX_LENGTH = 18;
	const AXIS_REFERENCE = 482;

	const display = $derived(text.slice(0, MAX_LENGTH));
	const charsUsed = $derived(text.length);
</script>

<div
	class="hero-shell"
	style="
		--fit-width: {widthAxis}%;
		--fit-axis: {widthAxis};
		--y-stretch: {heightPct / 100};
		--letter-spacing: {spacing}px;
		--text-length: {Math.max(1, display.length)};
		--axis-ratio: {widthAxis / AXIS_REFERENCE};
	"
>
	<div class="specimen">
		<span class="display-word">
			{display}
		</span>
	</div>
</div>

<!-- Tiny floating menu. Bottom-right corner, fixed to the viewport so
     it survives any scroll position. Icon swaps between sliders and X
     depending on open state. -->
<button
	type="button"
	class="controls-fab"
	onclick={() => (controlsOpen = !controlsOpen)}
	aria-label={controlsOpen ? 'Close type controls' : 'Open type controls'}
	aria-expanded={controlsOpen}
	aria-controls="type-controls"
>
	{#if controlsOpen}
		<X class="size-4" />
	{:else}
		<SlidersHorizontal class="size-4" />
	{/if}
</button>

{#if controlsOpen}
	<form
		id="type-controls"
		class="controls-popover"
		aria-label="Type specimen controls"
		onsubmit={(e) => e.preventDefault()}
	>
		<label class="control">
			<span class="control-label">
				Text
				<output>{charsUsed}/{MAX_LENGTH}</output>
			</span>
			<input
				type="text"
				bind:value={text}
				maxlength={MAX_LENGTH}
				autocomplete="off"
				spellcheck="false"
				aria-label="Text to render"
			/>
		</label>

		<label class="control">
			<span class="control-label">
				Width
				<output>{widthAxis}</output>
			</span>
			<input
				type="range"
				min="100"
				max="3600"
				step="1"
				bind:value={widthAxis}
				aria-label="Fit wdth axis"
			/>
		</label>

		<label class="control">
			<span class="control-label">
				Height
				<output>{heightPct}%</output>
			</span>
			<input
				type="range"
				min="35"
				max="320"
				step="1"
				bind:value={heightPct}
				aria-label="Vertical scale"
			/>
		</label>

		<label class="control">
			<span class="control-label">
				Spacing
				<output>{spacing}px</output>
			</span>
			<input
				type="range"
				min="-16"
				max="64"
				step="1"
				bind:value={spacing}
				aria-label="Letter spacing"
			/>
		</label>
	</form>
{/if}

<style>
	.hero-shell {
		display: grid;
		width: 100%;
		height: 100%;
		min-height: 0;
		color: var(--fg);
	}

	.specimen {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	.display-word {
		position: absolute;
		top: 50%;
		left: 50%;
		color: var(--fg);
		font-family: 'Fit Local', ui-sans-serif, system-ui, sans-serif;
		/* Hero is calc(100svh − 4rem) tall (sits below the nav, not
		   behind it). Subtract a bit more so the type fits cleanly with
		   small breathing room at top and bottom of the hero. */
		font-size: calc(100svh - 8rem);
		font-stretch: var(--fit-width);
		font-variation-settings: 'wdth' var(--fit-axis);
		font-weight: 400;
		letter-spacing: var(--letter-spacing);
		line-height: 1;
		text-align: center;
		text-transform: uppercase;
		transform: translate(calc(-50% + var(--letter-spacing) / 2), -50%)
			scaleY(var(--y-stretch));
		transform-origin: center center;
		white-space: nowrap;
	}

	/* Tiny floating icon button — square, ~36px. Bottom-right of the
	   HERO region (absolute, not fixed). Scrolls away with the hero. */
	.controls-fab {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		z-index: 4;
		display: inline-flex;
		width: 2.25rem;
		height: 2.25rem;
		align-items: center;
		justify-content: center;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--canvas));
		color: var(--fg);
		cursor: pointer;
		transition: transform 100ms ease-out;
	}

	.controls-fab:hover {
		transform: translateY(-1px);
	}

	.controls-fab:focus-visible {
		outline: 2px solid var(--fg);
		outline-offset: 3px;
	}

	/* Popover floats above the button. Same containing block as the
	   fab (hero-viewport) — both absolute, both scroll with the hero. */
	.controls-popover {
		position: absolute;
		bottom: 3.75rem;
		right: 1rem;
		z-index: 3;
		display: grid;
		width: min(17rem, calc(100vw - 2rem));
		gap: 0.75rem;
		padding: 0.95rem 1rem;
		border: 1px solid hsl(var(--border));
		background: hsl(var(--canvas));
		font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	.control {
		display: grid;
		gap: 0.3rem;
		color: var(--fg);
		user-select: none;
	}

	.control-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.7rem;
		font-weight: 500;
		line-height: 1;
		color: var(--fg-subtle);
	}

	output {
		min-width: 2.6rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
	}

	.control input[type='text'] {
		width: 100%;
		min-height: 1.9rem;
		padding: 0.25rem 0;
		border: 0;
		border-bottom: 1px solid hsl(var(--border));
		border-radius: 0;
		appearance: none;
		background: transparent;
		color: var(--fg);
		font:
			500 0.88rem/1 ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		outline: none;
	}

	.control input[type='text']:focus-visible {
		border-bottom-color: var(--fg);
	}

	.control input[type='range'] {
		width: 100%;
		height: 1.05rem;
		margin: 0;
		appearance: none;
		accent-color: var(--fg);
		background: transparent;
		color: var(--fg);
		cursor: ew-resize;
	}

	.control input[type='range']:focus-visible {
		outline: 2px solid var(--fg);
		outline-offset: 4px;
	}

	.control input[type='range']::-webkit-slider-runnable-track {
		height: 0.18rem;
		border-radius: 0;
		background: color-mix(in srgb, currentColor 24%, transparent);
	}

	.control input[type='range']::-webkit-slider-thumb {
		width: 0.9rem;
		height: 0.9rem;
		margin-top: -0.4rem;
		border: 0;
		border-radius: 0;
		appearance: none;
		background: currentColor;
	}

	.control input[type='range']::-moz-range-track {
		height: 0.18rem;
		border-radius: 0;
		background: color-mix(in srgb, currentColor 24%, transparent);
	}

	.control input[type='range']::-moz-range-thumb {
		width: 0.9rem;
		height: 0.9rem;
		border: 0;
		border-radius: 0;
		background: currentColor;
	}
</style>
