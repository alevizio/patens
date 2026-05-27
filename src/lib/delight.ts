/**
 * Delight utilities — confetti, time-of-day greetings, milestone copy,
 * reduced-motion gate. Imported on demand to keep canvas-confetti out of the
 * initial bundle.
 */

type ConfettiFn = (options?: import('canvas-confetti').Options) => Promise<undefined> | null;
let confettiImpl: ConfettiFn | null = null;
const loadConfetti = async (): Promise<ConfettiFn> => {
	if (confettiImpl) return confettiImpl;
	const mod = await import('canvas-confetti');
	confettiImpl = mod.default as ConfettiFn;
	return confettiImpl;
};

/** Respect the user's reduced-motion preference for any animation. */
export const prefersReducedMotion = (): boolean => {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Fire a foundry-restrained confetti burst — narrow spread, no streamers,
 * accent-colored. Used for genuine ship moments (seal version, family
 * bundle exported, audit clean).
 */
export const celebrate = async (level: 'small' | 'medium' | 'large' = 'medium') => {
	if (prefersReducedMotion()) return;
	const confetti = await loadConfetti();
	const counts = { small: 40, medium: 80, large: 160 } as const;
	const accent = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-accent')
		.trim();
	const success = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-success')
		.trim();
	const colors = [accent || '#5B9BD5', success || '#7BB87B', '#E8E2D3'];
	void confetti({
		particleCount: counts[level],
		spread: level === 'large' ? 90 : 60,
		startVelocity: 35,
		gravity: 1.1,
		ticks: 200,
		origin: { y: 0.62 },
		colors
	});
};

/** Two simultaneous bursts from the bottom corners — used for top-tier moments
 *  like sealing a release. */
export const celebrateSeal = async () => {
	if (prefersReducedMotion()) return;
	const confetti = await loadConfetti();
	const accent = getComputedStyle(document.documentElement)
		.getPropertyValue('--color-accent')
		.trim();
	const colors = [accent || '#5B9BD5', '#E8E2D3', '#888', '#222'];
	const common = {
		particleCount: 60,
		angle: 0,
		spread: 70,
		startVelocity: 45,
		gravity: 1.15,
		ticks: 220,
		colors
	} as const;
	void confetti({ ...common, angle: 60, origin: { x: 0, y: 0.85 } });
	void confetti({ ...common, angle: 120, origin: { x: 1, y: 0.85 } });
};

/**
 * Foundry-style time-of-day greetings. Restrained but warm. Used on the home
 * page header and the "Continue working" card.
 */
export const timeOfDay = (now: Date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' => {
	const h = now.getHours();
	if (h < 5) return 'night';
	if (h < 12) return 'morning';
	if (h < 18) return 'afternoon';
	if (h < 22) return 'evening';
	return 'night';
};

/**
 * Home H1 tagline. Returns the canonical two-line headline:
 *
 *     Type,
 *     with a mentor in the margin.
 *
 * Why this shape: foundries (Klim, Dinamo, Sharp Type) don't use
 * verb-prompt headlines like "Design your own typeface" or "Draw a
 * glyph" — those are SaaS-onboarding shapes, not editorial-craft
 * shapes. A single immodest noun-phrase asserts identity. "With a
 * mentor in the margin" carries the Patens-Method position by
 * giving it a clear physical image: the mentor (the audit) lives in
 * the margin (where the audit's prose explanations render in the
 * editor, beside the glyph). See docs/launch/positioning-rework.md
 * for the full reasoning.
 *
 * Why no time-of-day rotation anymore: no foundry rotates its
 * homepage headline. Rotation itself is a SaaS-product-tour signal
 * and was undermining the H1. One line, set perfectly, stays.
 *
 * Signature stays compatible (still takes a Date arg) so the
 * existing call site in `/+page.svelte` doesn't need to change.
 */
export const homeTagline = (_now: Date = new Date()): string => {
	// _now intentionally unused — kept for forward compat in case
	// we ever bring back contextual variants without re-wiring the
	// call site again.
	void _now;
	return 'Type,\nwith a mentor in the margin.';
};

/** Per-milestone copy. Concrete, specific to type design, not generic. */
export const milestoneMessage = (count: number): string => {
	switch (count) {
		case 1:
			return 'One. The foundry begins.';
		case 5:
			return 'First five drawn.';
		case 10:
			return 'Ten. The control set takes shape.';
		case 25:
			return '25 — the alphabet is half-formed.';
		case 50:
			return '50. Most basic Latin is done.';
		case 100:
			return '100 glyphs. This is a real font now.';
		case 200:
			return '200. Few personal projects ever reach here.';
		default:
			return `${count} glyphs drawn — keep going.`;
	}
};

/**
 * Friendly greeting for the "Continue working" card. Acknowledges if the user
 * is returning after a long break.
 */
export const continueGreeting = (lastEditedAtIso: string): string => {
	const ts = Date.parse(lastEditedAtIso);
	if (!Number.isFinite(ts)) return 'Continue working';
	const hoursAgo = (Date.now() - ts) / (1000 * 60 * 60);
	if (hoursAgo > 168) return 'Welcome back';
	if (hoursAgo > 12) return 'Pick up where you left off';
	if (hoursAgo < 0.25) return 'Still warm';
	return 'Continue working';
};

/** Print the developer hello to the console once per page load. */
let helloShown = false;
export const consoleHello = () => {
	if (helloShown || typeof window === 'undefined') return;
	helloShown = true;
	const banner = [
		'',
		'  ████████╗██╗   ██╗██████╗ ███████╗',
		'  ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝',
		'     ██║    ╚████╔╝ ██████╔╝█████╗  ',
		'     ██║     ╚██╔╝  ██╔═══╝ ██╔══╝  ',
		'     ██║      ██║   ██║     ███████╗',
		'     ╚═╝      ╚═╝   ╚═╝     ╚══════╝',
		''
	].join('\n');
	// Easter-egg banner shown to anyone who opens DevTools. Intentional
	// console.log usage; the rule is "no debug console.log", not "no
	// branding console.log."
	/* eslint-disable no-console */
	console.log(`%c${banner}`, 'color: hsl(220, 60%, 55%); font-family: monospace; line-height: 1.0;');
	console.log(
		'%cPatens — a personal type design tool.',
		'color: #888; font-family: ui-serif, serif; font-style: italic;'
	);
	console.log(
		'%cPoking around the source? It\'s SvelteKit + opentype.js + Pyodide.',
		'color: #666; font-size: 11px;'
	);
	/* eslint-enable no-console */
};

/** Konami code detector — fires `onFound` when the sequence is entered. */
export const installKonamiListener = (onFound: () => void): (() => void) => {
	const sequence = [
		'ArrowUp',
		'ArrowUp',
		'ArrowDown',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'ArrowLeft',
		'ArrowRight',
		'b',
		'a'
	];
	let pos = 0;
	const handler = (e: KeyboardEvent) => {
		// Don't fire while typing in an input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
			return;
		const expected = sequence[pos];
		if (e.key === expected || e.key.toLowerCase() === expected.toLowerCase()) {
			pos++;
			if (pos === sequence.length) {
				pos = 0;
				onFound();
			}
		} else {
			pos = 0;
		}
	};
	window.addEventListener('keydown', handler);
	return () => window.removeEventListener('keydown', handler);
};

/**
 * Specific, product-aware loading messages. Rotate through these instead of
 * a generic "Loading..." spinner. Each describes what's actually happening.
 */
export const PYODIDE_BOOT_MESSAGES = [
	'Loading Python runtime in the browser…',
	'Bringing up fontTools…',
	'Almost ready — first time only takes longer.'
] as const;

export const FAMILY_BUILD_MESSAGES = [
	'Building each sibling…',
	'Patching OS/2 weight + width classes…',
	'Bundling everything into one zip…'
] as const;
