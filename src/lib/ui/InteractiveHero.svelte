<script lang="ts">
	/**
	 * Interactive hero specimen for the home page.
	 *
	 * Displays a large display word ("DESIGN TYPE" by default) set in
	 * Big Shoulders (OFL 1.1, Google Fonts) and exposes 4 controls
	 * below the type so visitors can play:
	 *
	 *   - Text input    — change the rendered word (max 18 chars).
	 *   - Weight slider — 100..900 (Big Shoulders' native VF axis).
	 *   - Width slider  — CSS transform: scaleX(...). 50..300%.
	 *   - Height slider — CSS transform: scaleY(...). 50..300%.
	 *   - Spacing       — letter-spacing in px. -2..32.
	 *
	 * This is the "Fit specimen" the launch prototype was reaching for
	 * (see /Users/alevizio/Downloads/patens-fat-css-with-fit.zip) —
	 * substituted to Big Shoulders because DJR's Fit is licensed for
	 * Font of the Month Club subscribers' personal use only, not
	 * for public redistribution on patens.design.
	 *
	 * @font-face declaration lives in +page.svelte's <svelte:head>
	 * so the preload + face declaration coexist cleanly.
	 */

	let text = $state('design type');
	let weight = $state(800);
	let widthPct = $state(100);
	let heightPct = $state(100);
	let spacing = $state(2);

	const MAX_LENGTH = 18;

	const display = $derived(text.slice(0, MAX_LENGTH).toUpperCase());
	const charsUsed = $derived(text.length);
</script>

<!-- The interactive hero. Two halves:
     1. The specimen — a big display word that scales with the controls.
     2. The controls — a horizontal row of 4 inputs under the type. -->
<div class="interactive-hero">
	<div
		class="specimen"
		style="
			--y-stretch: {heightPct / 100};
			--letter-spacing: {spacing}px;
		"
	>
		<span
			class="display-word"
			style="
				font-weight: {weight};
				transform: scaleX({widthPct / 100}) scaleY({heightPct / 100});
				letter-spacing: {spacing}px;
			"
		>
			{display}
		</span>
	</div>

	<form class="controls" aria-label="Type specimen controls" onsubmit={(e) => e.preventDefault()}>
		<label class="text-control">
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

		<label class="slider-control">
			<span class="control-label">
				Weight
				<output>{weight}</output>
			</span>
			<input type="range" min="100" max="900" step="10" bind:value={weight} aria-label="Font weight" />
		</label>

		<label class="slider-control">
			<span class="control-label">
				Width
				<output>{widthPct}%</output>
			</span>
			<input type="range" min="50" max="300" step="1" bind:value={widthPct} aria-label="Horizontal scale" />
		</label>

		<label class="slider-control">
			<span class="control-label">
				Height
				<output>{heightPct}%</output>
			</span>
			<input type="range" min="50" max="300" step="1" bind:value={heightPct} aria-label="Vertical scale" />
		</label>

		<label class="slider-control">
			<span class="control-label">
				Spacing
				<output>{spacing}px</output>
			</span>
			<input type="range" min="-2" max="32" step="1" bind:value={spacing} aria-label="Letter spacing" />
		</label>
	</form>
</div>

<style>
	.interactive-hero {
		display: grid;
		gap: 2.5rem;
		width: 100%;
	}

	.specimen {
		display: grid;
		place-items: center;
		width: 100%;
		min-height: clamp(180px, 28vh, 380px);
		overflow: hidden;
		padding-inline: clamp(0.5rem, 2vw, 2rem);
		color: var(--fg);
	}

	.display-word {
		display: inline-block;
		max-width: 100%;
		font-family: 'BigShoulders', ui-sans-serif, system-ui, sans-serif;
		font-size: clamp(
			3.2rem,
			min(calc((100vw - 4rem) / var(--text-length-hint, 8) * 1.8), 14vh),
			14rem
		);
		font-weight: 800;
		line-height: 0.85;
		text-align: center;
		text-transform: uppercase;
		text-wrap: nowrap;
		transform-origin: center;
		transition:
			font-weight 80ms ease-out,
			transform 80ms ease-out;
		white-space: nowrap;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: clamp(0.85rem, 2.2vw, 1.8rem);
		align-items: end;
		justify-content: center;
		width: 100%;
		max-width: 56rem;
		margin: 0 auto;
		padding: 0;
		border: 0;
		font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	.text-control,
	.slider-control {
		display: grid;
		gap: 0.42rem;
		width: clamp(7rem, 12vw, 10rem);
		color: var(--fg);
		user-select: none;
	}

	.text-control {
		width: clamp(10rem, 22vw, 14rem);
	}

	.control-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1;
		letter-spacing: 0;
		color: var(--fg-subtle);
	}

	output {
		min-width: 2.6rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--fg);
	}

	.text-control input[type='text'] {
		width: 100%;
		min-height: 2.2rem;
		padding: 0;
		border: 0;
		border-bottom: 1px solid var(--border);
		border-radius: 0;
		appearance: none;
		background: transparent;
		color: var(--fg);
		font:
			600 0.92rem/1 ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		outline: none;
	}

	.text-control input[type='text']:focus-visible {
		border-bottom-color: var(--fg);
		outline: 1px solid transparent;
	}

	.slider-control input[type='range'] {
		width: 100%;
		height: 1.05rem;
		margin: 0;
		appearance: none;
		accent-color: var(--fg);
		background: transparent;
		color: var(--fg);
		cursor: ew-resize;
	}

	.slider-control input[type='range']:focus-visible {
		outline: 2px solid var(--fg);
		outline-offset: 5px;
	}

	.slider-control input[type='range']::-webkit-slider-runnable-track {
		height: 0.24rem;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 24%, transparent);
	}

	.slider-control input[type='range']::-webkit-slider-thumb {
		width: 1rem;
		height: 1rem;
		margin-top: -0.38rem;
		border: 0;
		border-radius: 999px;
		appearance: none;
		background: currentColor;
	}

	.slider-control input[type='range']::-moz-range-track {
		height: 0.24rem;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 24%, transparent);
	}

	.slider-control input[type='range']::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border: 0;
		border-radius: 999px;
		background: currentColor;
	}

	@media (max-width: 640px) {
		.controls {
			gap: 0.6rem;
		}

		.text-control,
		.slider-control {
			width: 5rem;
		}

		.text-control {
			width: 6rem;
		}

		.control-label {
			gap: 0.25rem;
			font-size: 0.62rem;
		}

		output {
			min-width: 1.65rem;
		}

		.text-control input[type='text'] {
			min-height: 1.6rem;
			font-size: 0.82rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.display-word {
			transition: none;
		}
	}
</style>
