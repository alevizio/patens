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
	import { onMount } from 'svelte';
	import { cubicInOut, cubicOut } from 'svelte/easing';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';

	let text = $state('design type');
	let widthAxis = $state(100);
	let heightPct = $state(35);
	let spacing = $state(-12);

	/* Per-CHARACTER scale arrays. Each char has its own wdth axis +
	   scaleY during the entrance animation. After the entrance ends,
	   the sliders take over (every char then tracks the same values).
	   `charEntrance` is the scale 0→1 used for the initial pop-in,
	   replacing the prior opacity fade-in. */
	let charWidths = $state<number[]>([]);
	let charHeights = $state<number[]>([]);
	let charEntrance = $state<number[]>([]);

	let controlsOpen = $state(false);
	let entranceDone = $state(false);

	const MAX_LENGTH = 18;
	const AXIS_REFERENCE = 482;
	const WIDTH_TARGET = 380;
	const HEIGHT_TARGET = 142;
	const INTRO_HOLD = 650;
	const WIDTH_STAGGER = 150;
	const WIDTH_DURATION = 1150;
	const PHASE_GAP = 400;
	const HEIGHT_STAGGER = 150;
	const HEIGHT_DURATION = 1150;
	/* During the height phase, some chars take a "twist" trajectory —
	   their height (or width) deviates past the target value, then
	   settles back. TWIST_CLIMB is the fraction of HEIGHT_DURATION spent
	   reaching the peak; the remainder is the settle-back to the final
	   target. The deviation peaks well before the cascade ends, so the
	   final frame is clean. */
	const TWIST_CLIMB = 0.6;
	/* Entrance — each char pops in (scale 0 → 1) at its OWN random
	   width and height, but all values sit at the SMALL end of the
	   scale. The cascade phases then grow every char up to the
	   canonical (WIDTH_TARGET, HEIGHT_TARGET). Ranges are tight enough
	   to read as "all small, slightly different" — every char is
	   visibly smaller than its final state at the moment of arrival. */
	const INTRO_WIDTH_MIN = 100;
	const INTRO_WIDTH_MAX = 175;
	const INTRO_HEIGHT_MIN = 35;
	const INTRO_HEIGHT_MAX = 70;

	const display = $derived(text.slice(0, MAX_LENGTH));
	const charsUsed = $derived(text.length);
	/* The specimen renders at opacity 0 until onMount has filled the
	   per-char width/height arrays with random intro values. Without
	   this gate, SSR + first client paint show chars at the template
	   fallback (100, 35) and they SNAP to their random intro sizes the
	   instant the state arrays populate. The opacity gate hides that
	   transition so the first visible frame already shows the intro. */
	const ready = $derived(charWidths.length > 0);

	onMount(() => {
		const initialLen = display.length;

		/* Per-char random intro sizes. Each char pops in at its own
		   width and height — visually distinct from every neighbour —
		   and the cascade phases tween FROM these values TO the canonical
		   targets. */
		const introWidths = Array.from({ length: initialLen }, () =>
			Math.round(
				INTRO_WIDTH_MIN + Math.random() * (INTRO_WIDTH_MAX - INTRO_WIDTH_MIN)
			)
		);
		const introHeights = Array.from({ length: initialLen }, () =>
			Math.round(
				INTRO_HEIGHT_MIN + Math.random() * (INTRO_HEIGHT_MAX - INTRO_HEIGHT_MIN)
			)
		);

		charWidths = [...introWidths];
		charHeights = [...introHeights];
		/* No entrance scale animation — chars are at full scale from
		   frame 1. charEntrance stays at 1 throughout and the cascade
		   does all the visible movement. */
		charEntrance = new Array(initialLen).fill(1);

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) {
			widthAxis = WIDTH_TARGET;
			heightPct = HEIGHT_TARGET;
			charWidths = new Array(initialLen).fill(WIDTH_TARGET);
			charHeights = new Array(initialLen).fill(HEIGHT_TARGET);
			charEntrance = new Array(initialLen).fill(1);
			entranceDone = true;
			return;
		}

		/* Two phases of per-char sizing, each with its own shuffled order
		   so the two reveals look uncorrelated:
		     Phase 2 — every char tweens width from 100 → WIDTH_TARGET
		     PHASE_GAP
		     Phase 3 — every char tweens height from 35 → HEIGHT_TARGET
		   Within each phase, the chars start in shuffled order — Fisher-
		   Yates — so the eye can't predict who's next. */
		const indices = Array.from({ length: initialLen }, (_, i) => i);
		const shuffle = (arr: number[]) => {
			const a = [...arr];
			for (let i = a.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[a[i], a[j]] = [a[j], a[i]];
			}
			return a;
		};
		const widthOrder = shuffle(indices);
		const heightOrder = shuffle(indices);

		const widthStarts = new Array<number>(initialLen);
		widthOrder.forEach((charIdx, pos) => {
			widthStarts[charIdx] = pos * WIDTH_STAGGER;
		});
		const widthPhaseEnd =
			(initialLen - 1) * WIDTH_STAGGER + WIDTH_DURATION;
		const heightPhaseBase = widthPhaseEnd + PHASE_GAP;

		const heightStarts = new Array<number>(initialLen);
		heightOrder.forEach((charIdx, pos) => {
			heightStarts[charIdx] = heightPhaseBase + pos * HEIGHT_STAGGER;
		});
		const choreographyEnd =
			heightPhaseBase + (initialLen - 1) * HEIGHT_STAGGER + HEIGHT_DURATION;

		/* Per-char "twist" — during the height phase, ~50% of chars take
		   a deviation trajectory and settle back to the canonical final
		   value. 25% get a HEIGHT overshoot (peak above 142, settle to
		   142); 25% get a WIDTH twist (width detours wide OR narrow off
		   380, settle back to 380). The other 50% tween straight. The
		   peaks are bounded so the type still fits the viewport area at
		   the climax, and every trajectory lands on (WIDTH_TARGET,
		   HEIGHT_TARGET) at choreographyEnd. */
		type Twist = 'height' | 'width' | 'none';
		const twists = new Array<Twist>(initialLen);
		const peakHeights = new Array<number>(initialLen);
		const peakWidths = new Array<number>(initialLen);

		for (let i = 0; i < initialLen; i++) {
			const r = Math.random();
			if (r < 0.25) {
				twists[i] = 'height';
				peakHeights[i] = 175 + Math.round(Math.random() * 40);
				peakWidths[i] = WIDTH_TARGET;
			} else if (r < 0.5) {
				twists[i] = 'width';
				const wide = Math.random() < 0.5;
				peakWidths[i] = wide
					? 440 + Math.round(Math.random() * 60)
					: 200 + Math.round(Math.random() * 80);
				peakHeights[i] = HEIGHT_TARGET;
			} else {
				twists[i] = 'none';
				peakHeights[i] = HEIGHT_TARGET;
				peakWidths[i] = WIDTH_TARGET;
			}
		}

		const sizingStart = INTRO_HOLD;
		const animStart = performance.now();

		let frameId = 0;
		const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

		const tick = (now: number) => {
			const elapsed = now - animStart - sizingStart;

			for (let i = 0; i < initialLen; i++) {
				/* Width cascade — every char tweens FROM its own intro
				   width TO WIDTH_TARGET on its shuffled start time.
				   cubicInOut: smooth ease-in-out, no overshoot, no
				   anticipation — clean settle in both directions. */
				const wt = clamp01((elapsed - widthStarts[i]) / WIDTH_DURATION);
				const wStart = introWidths[i];
				charWidths[i] = Math.round(
					wStart + (WIDTH_TARGET - wStart) * cubicInOut(wt)
				);

				/* Height cascade — fires AFTER the width phase ends
				   (heightStarts[i] is offset by widthPhaseEnd + PHASE_GAP).
				   Tweens FROM the per-char intro height TO HEIGHT_TARGET.
				   Twist chars deviate past their target on one axis and
				   settle back to the canonical final value by ht = 1. */
				const ht = clamp01((elapsed - heightStarts[i]) / HEIGHT_DURATION);
				const hStart = introHeights[i];
				const twist = twists[i];

				if (twist === 'height' && ht > 0) {
					const peak = peakHeights[i];
					if (ht < TWIST_CLIMB) {
						const p = ht / TWIST_CLIMB;
						charHeights[i] = Math.round(hStart + (peak - hStart) * cubicInOut(p));
					} else {
						const p = (ht - TWIST_CLIMB) / (1 - TWIST_CLIMB);
						charHeights[i] = Math.round(
							peak + (HEIGHT_TARGET - peak) * cubicOut(p)
						);
					}
				} else {
					charHeights[i] = Math.round(
						hStart + (HEIGHT_TARGET - hStart) * cubicInOut(ht)
					);
				}

				if (twist === 'width' && ht > 0) {
					const peak = peakWidths[i];
					if (ht < TWIST_CLIMB) {
						const p = ht / TWIST_CLIMB;
						charWidths[i] = Math.round(
							WIDTH_TARGET + (peak - WIDTH_TARGET) * cubicOut(p)
						);
					} else {
						const p = (ht - TWIST_CLIMB) / (1 - TWIST_CLIMB);
						charWidths[i] = Math.round(
							peak + (WIDTH_TARGET - peak) * cubicOut(p)
						);
					}
				}
			}

			if (elapsed < choreographyEnd) {
				frameId = requestAnimationFrame(tick);
			} else {
				widthAxis = WIDTH_TARGET;
				heightPct = HEIGHT_TARGET;
				charEntrance = new Array(initialLen).fill(1);
				entranceDone = true;
			}
		};
		frameId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frameId);
		};
	});

	/* After the entrance ends, the sliders are the single source of
	   truth — every char tracks the same widthAxis/heightPct values. */
	$effect(() => {
		if (!entranceDone) return;
		const len = display.length;
		charWidths = new Array(len).fill(widthAxis);
		charHeights = new Array(len).fill(heightPct);
	});
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
	<div class="specimen" class:ready>
		<span class="display-word">
			{#each Array.from(display) as char, i (i)}
				{@const w = charWidths[i] ?? (entranceDone ? widthAxis : 100)}
				{@const h = charHeights[i] ?? (entranceDone ? heightPct : 35)}
				{@const e = charEntrance[i] ?? 1}
				<span
					class="display-char"
					style="
						font-stretch: {w}%;
						font-variation-settings: 'wdth' {w};
						transform: scale({e}) scaleY({h / 100});
					"
				>{char}</span>
			{/each}
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
		/* See `ready` $derived in the script: hidden until the per-char
		   state arrays are populated with their random intro values, so
		   the first VISIBLE frame is already the intro state — no flash
		   of (100, 35) before the snap. */
		opacity: 0;
		transition: opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.specimen.ready {
		opacity: 1;
	}

	/* Each character is its own inline-block with its own font-stretch
	   + scaleY (set inline from per-char state). The entrance scale
	   from 0→1 is also baked into the inline transform (driven from
	   the RAF tick in onMount) — no more CSS opacity keyframe needed. */
	.display-char {
		display: inline-block;
		transform-origin: center center;
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
		font-weight: 400;
		letter-spacing: var(--letter-spacing);
		line-height: 1;
		text-align: center;
		text-transform: uppercase;
		/* Just X translation — the per-word scaleY happens on each
		   .word-part below so each word can be tweened independently. */
		transform: translateX(calc(-50% + var(--letter-spacing) / 2)) translateY(-50%);
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
