<script lang="ts">
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import { contoursToSvgPath, glyphBounds } from '$lib/font/path';
	import X from '@lucide/svelte/icons/x';
	import {
		defaultPalette,
		planColorRender,
		rgbaToCss,
		sampleColorLine,
		type ColorRenderStep
	} from '$lib/font/color';
	import { detectFeatures, featureLabel } from '$lib/font/feature-detect';
	import type { RGBA } from '$lib/font/types';
	import Eye from '@lucide/svelte/icons/eye';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Download from '@lucide/svelte/icons/download';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Printer from '@lucide/svelte/icons/printer';
	import Link2 from '@lucide/svelte/icons/link-2';
	import LazySection from '$lib/ui/LazySection.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	const project = $derived(data.project);
	// Selected palette index for color layers. When the project has
	// multiple palettes (warm / cool / mono / material), visitors can
	// flip through them in the tester and watch every COLR-layered glyph
	// re-skin live. Initial value is the index of the default-flagged
	// palette so the page first renders the same way the designer sees
	// it in the editor; designers explicitly choose other palettes.
	const initialPaletteIndex = (() => {
		const list = data.project.palettes ?? [];
		const idx = list.findIndex((p) => p.variant === 'default');
		return idx >= 0 ? idx : 0;
	})();
	let selectedPaletteIndex = $state(initialPaletteIndex);
	const palette = $derived.by(() => {
		const list = project.palettes ?? [];
		if (list.length === 0) return defaultPalette(project.palettes);
		return list[selectedPaletteIndex] ?? defaultPalette(project.palettes);
	});

	// Sweep slice approximation for the typeset preview (SVG has no
	// native conic gradient). Same approach as GlyphTile/DrawingCanvas.
	const TYPESET_SWEEP_SLICES = 48;
	const typesetSweepSlices = (
		center: { x: number; y: number },
		startDeg: number,
		endDeg: number,
		stops: Array<{ offset: number; color: RGBA }>,
		radius: number
	): Array<{ points: string; color: string }> => {
		const out: Array<{ points: string; color: string }> = [];
		const span = endDeg - startDeg;
		for (let i = 0; i < TYPESET_SWEEP_SLICES; i++) {
			const t1 = i / TYPESET_SWEEP_SLICES;
			const t2 = (i + 1) / TYPESET_SWEEP_SLICES;
			const tMid = (t1 + t2) / 2;
			const color = sampleColorLine(stops, tMid);
			const a1 = ((startDeg + span * t1) * Math.PI) / 180;
			const a2 = ((startDeg + span * t2) * Math.PI) / 180;
			out.push({
				points: `${center.x},${center.y} ${center.x + Math.cos(a1) * radius},${center.y + Math.sin(a1) * radius} ${center.x + Math.cos(a2) * radius},${center.y + Math.sin(a2) * radius}`,
				color: rgbaToCss(color)
			});
		}
		return out;
	};

	// Treat a glyph as "drawn" when it has its own contours OR when it
	// composes them from components (Aacute, fi, æ, …). Without the
	// composite branch, every composite glyph in the project becomes
	// invisible in the grid + typeset preview, which broke the demo's
	// Aacute. Helper is hoisted so drawnGlyphs (right below) can use it.
	const isDrawnOrComposed = (g: import('$lib/font/types').Glyph | undefined): boolean => {
		if (!g) return false;
		if (g.contours.length > 0) return true;
		return (g.components?.length ?? 0) > 0;
	};
	// Resolve a glyph's components to flat contours so composites render
	// the same way they would in an installed font. Recursion is depth-
	// limited (6) as a cycle guard. Defined here so drawnGlyphs and the
	// typeset / inspector can all share it.
	const resolveContours = (
		g: import('$lib/font/types').Glyph | undefined,
		depth = 0
	): import('$lib/font/types').BezierContour[] => {
		if (!g) return [];
		if (g.contours.length > 0) return g.contours;
		if (!g.components || g.components.length === 0) return [];
		if (depth > 6) return [];
		const out: import('$lib/font/types').BezierContour[] = [];
		for (const comp of g.components) {
			const base = project.glyphs[comp.baseCodepoint];
			if (!base) continue;
			const baseContours = resolveContours(base, depth + 1);
			const dx = comp.offsetX ?? 0;
			const dy = comp.offsetY ?? 0;
			if (dx === 0 && dy === 0) {
				for (const c of baseContours) out.push(c);
				continue;
			}
			for (const c of baseContours) {
				out.push({
					closed: c.closed,
					winding: c.winding,
					commands: c.commands.map((cmd) => {
						if (cmd.type === 'M' || cmd.type === 'L') {
							return { ...cmd, x: cmd.x + dx, y: cmd.y + dy };
						}
						if (cmd.type === 'Q') {
							return { ...cmd, x1: cmd.x1 + dx, y1: cmd.y1 + dy, x: cmd.x + dx, y: cmd.y + dy };
						}
						if (cmd.type === 'C') {
							return {
								...cmd,
								x1: cmd.x1 + dx,
								y1: cmd.y1 + dy,
								x2: cmd.x2 + dx,
								y2: cmd.y2 + dy,
								x: cmd.x + dx,
								y: cmd.y + dy
							};
						}
						return cmd;
					})
				});
			}
		}
		return out;
	};

	// Glyph grid: only show drawn glyphs (skip empty placeholders),
	// sorted by codepoint for a stable order. Composites count as drawn.
	const drawnGlyphs = $derived(
		Object.values(project.glyphs)
			.filter(isDrawnOrComposed)
			.sort((a, b) => a.codepoint - b.codepoint)
	);

	const ascender = $derived(project.metrics.ascender);
	const descender = $derived(project.metrics.descender);

	// Live typesetting — visitor types any text, we render it inline
	// using the project's own SVG paths. Kerning pairs from the
	// project apply automatically so visitors see the font as the
	// designer intended (not as system-fallback substitutes).
	let typeText = $state('Type something here');
	// Force every LazySection on the page to mount immediately when the
	// share link was opened with ?print=1. Otherwise below-fold sections
	// stay placeholders and the printed specimen sheet is half-empty.
	let printRequested = $state(false);
	// In-page Specimen button → same flow as the auto-print path so the
	// PDF includes below-fold sections regardless of scroll position.
	// window.print() is synchronously blocking, so a beforeprint
	// listener that mutates $state can't paint in time — we have to
	// force-mount + wait three frames, then print.
	const triggerSpecimenPrint = () => {
		printRequested = true;
		requestAnimationFrame(() =>
			requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
		);
	};
	// Sample-text presets — quick pills for the passages designers reach
	// for first. Hamburgevons is the classic type-design proof word
	// (stems + curves + key inks); pangram covers the alphabet; AaBbCc
	// makes Upper/lower shape comparison easy; figures + punctuation +
	// lorem each test one dimension of the font.
	const SAMPLE_PRESETS = [
		{ id: 'pangram', label: 'Pangram', text: 'The quick brown fox jumps over the lazy dog.' },
		{ id: 'hamburge', label: 'Hamburgevons', text: 'Hamburgevons' },
		{ id: 'aabbcc', label: 'AaBbCc', text: 'AaBbCcDdEeFfGgHhIiJjKkLlMm' },
		{ id: 'numbers', label: 'Numbers', text: '0123456789 $1,234.56 99.9%' },
		{ id: 'punct', label: 'Punctuation', text: 'Hello, world! "Quoted" — (parens)' },
		{ id: 'lorem', label: 'Lorem', text: 'Lorem ipsum dolor sit amet consectetur adipiscing elit.' }
	] as const;
	// Tester controls — master / size / tracking. The tester is the
	// designer's playground on the share page; they should be able to
	// see the type at the size they care about, in the master they
	// care about, with the letter-spacing they want.
	let tryMasterId = $state<string | undefined>(undefined);
	let trySize = $state(96); // SVG render height in pixels
	let tryTracking = $state(0); // extra advance per glyph, UPM units
	// Active OpenType features in the tester. Each detected feature (ss01,
	// smcp, salt, etc.) can be toggled live so visitors see exactly what
	// the feature does to their text — the chip list above is awareness,
	// these toggles are tangible. kern is always on; liga isn't a single
	// sub so it's not yet wired here.
	let activeFeatures = $state<Set<string>>(new Set());
	// Inspector — click a tile in the glyph grid to open a detailed view.
	// Shows the glyph at a readable size with metric guides + the data
	// designer-friends actually want to see: advance, sidebearings,
	// anchors, tags, layer count. Indexed by codepoint into drawnGlyphs
	// so arrow keys navigate the grid.
	let inspectedIndex = $state<number | null>(null);
	// Glyph grid filter — visitors search by name, codepoint hex, tag, or
	// pick a category pill. Categories are derived from Unicode ranges +
	// glyph-name suffixes so the demo's punctuation, marks, composites,
	// and alternates land in obvious buckets. Inspector navigation steps
	// through the filtered set so arrow keys feel scoped to what the
	// designer is currently looking at.
	let glyphFilter = $state('');
	let glyphCategory = $state<string | null>(null);
	const isLatin = (cp: number) =>
		(cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a);
	const isDigit = (cp: number) => cp >= 0x0030 && cp <= 0x0039;
	const isPunct = (cp: number) =>
		(cp >= 0x0021 && cp <= 0x002f) ||
		(cp >= 0x003a && cp <= 0x0040) ||
		(cp >= 0x005b && cp <= 0x0060) ||
		(cp >= 0x007b && cp <= 0x007e) ||
		cp === 0x2013 ||
		cp === 0x2014 ||
		cp === 0x2018 ||
		cp === 0x2019 ||
		cp === 0x201c ||
		cp === 0x201d;
	const isMark = (cp: number) => cp >= 0x0300 && cp <= 0x036f;
	const isAlternate = (name: string) =>
		/\.(ss\d{2}|salt|alt|sc|smcp|c2sc|onum|tnum|lnum)$/.test(name);
	const isComposite = (name: string) =>
		/^[A-Za-z]+(?:acute|grave|circumflex|tilde|caron|breve|macron|dotaccent|ring|ogonek|cedilla|umlaut|dieresis)$/.test(
			name
		);
	const glyphCategories = [
		{ id: 'letters', label: 'Letters', match: (g: { codepoint: number }) => isLatin(g.codepoint) },
		{ id: 'numbers', label: 'Numbers', match: (g: { codepoint: number }) => isDigit(g.codepoint) },
		{ id: 'punct', label: 'Punctuation', match: (g: { codepoint: number }) => isPunct(g.codepoint) },
		{ id: 'marks', label: 'Marks', match: (g: { codepoint: number }) => isMark(g.codepoint) },
		{ id: 'alts', label: 'Alternates', match: (g: { name: string }) => isAlternate(g.name) },
		{
			id: 'composites',
			label: 'Composites',
			match: (g: { name: string }) => isComposite(g.name)
		}
	] as const;
	const visibleGlyphs = $derived.by(() => {
		const q = glyphFilter.trim().toLowerCase();
		const cat = glyphCategory
			? glyphCategories.find((c) => c.id === glyphCategory)
			: null;
		if (!q && !cat) return drawnGlyphs;
		return drawnGlyphs.filter((g) => {
			if (cat && !cat.match(g)) return false;
			if (!q) return true;
			const hex = g.codepoint.toString(16).toLowerCase();
			const ch = String.fromCodePoint(g.codepoint).toLowerCase();
			if (g.name.toLowerCase().includes(q)) return true;
			if (hex.startsWith(q) || hex === q) return true;
			if (ch === q) return true;
			if (g.tags?.some((t) => t.toLowerCase().includes(q))) return true;
			return false;
		});
	});
	// Resolve a glyph in the context of a chosen master — overrides win,
	// project glyph is the fallback. Mirrors the export pipeline's lookup
	// so what visitors preview matches what they'd download. Hoisted up
	// here so the typeset + waterfall + master-compare rows all share it.
	const resolveGlyphForMaster = (cp: number, masterId: string | undefined) => {
		if (masterId) {
			const m = project.masters?.find((x) => x.id === masterId);
			const ov = m?.glyphs?.[cp];
			if (ov && (ov.contours.length > 0 || (ov.components?.length ?? 0) > 0)) return ov;
		}
		return project.glyphs[cp];
	};
	// Name → Glyph index, derived once per master change. Used by the
	// feature applier: detectFeatures returns substitutions as name pairs
	// (e.g. "a" → "a.ss01"), so applying them live needs a name lookup.
	const glyphByName = $derived.by(() => {
		const map = new Map<string, ReturnType<typeof resolveGlyphForMaster>>();
		for (const g of Object.values(project.glyphs)) map.set(g.name, g);
		const m = project.masters?.find((x) => x.id === tryMasterId);
		if (m) {
			for (const ov of Object.values(m.glyphs ?? {})) {
				if (ov.contours.length > 0) map.set(ov.name, ov);
			}
		}
		return map;
	});
	// Detected features for the project, available to the toggles + the
	// substitution applier. Stored as an ordered list (matches feature
	// chip order) so visitors see them grouped predictably.
	const detectedFeatures = $derived.by(() => {
		const autoOn = project.features.autoFeatures !== false;
		if (!autoOn) return [];
		const disabled = new Set(project.features.disabledAutoFeatures ?? []);
		return detectFeatures(project.glyphs).filter((f) => !disabled.has(f.feature));
	});
	// Per-feature substitution maps: tag → (from name → to name). Built
	// once so the typeset applier doesn't rescan on every keystroke.
	const featureSubMaps = $derived.by(() => {
		const out = new Map<string, Map<string, string>>();
		for (const f of detectedFeatures) {
			const m = new Map<string, string>();
			for (const s of f.subs) m.set(s.from, s.to);
			out.set(f.feature, m);
		}
		return out;
	});
	// Apply active feature substitutions to a resolved glyph. Returns the
	// substituted glyph if any active feature has a sub for this glyph's
	// name AND the substituted glyph exists; otherwise the original.
	const applyFeatures = (g: ReturnType<typeof resolveGlyphForMaster>) => {
		if (!g || activeFeatures.size === 0) return g;
		let name = g.name;
		// Iterate in detection order so the user sees deterministic results
		// when two features could chain (e.g. smcp then salt).
		for (const f of detectedFeatures) {
			if (!activeFeatures.has(f.feature)) continue;
			if (f.kind !== 'single') continue;
			const next = featureSubMaps.get(f.feature)?.get(name);
			if (next) name = next;
		}
		if (name === g.name) return g;
		return glyphByName.get(name) ?? g;
	};
	// Active ligature subs flattened across every active liga-kind feature,
	// already sorted longest-first by detectFeatures. The typeset loop
	// consults this list before falling through to single-sub features —
	// when the next N codepoints' glyph names match a ligature's input,
	// the ligature glyph takes their place.
	const activeLigatures = $derived.by(() => {
		const out: import('$lib/font/feature-detect').LigatureSub[] = [];
		for (const f of detectedFeatures) {
			if (f.kind !== 'ligature') continue;
			if (!activeFeatures.has(f.feature)) continue;
			if (f.ligatures) out.push(...f.ligatures);
		}
		return out;
	});
	// Match a ligature starting at `idx` in the codepoint sequence.
	// Returns { glyph, consumed } when a ligature matches; null otherwise.
	// `consumed` is how many input codepoints the ligature collapses.
	const matchLigature = (
		codepoints: string[],
		idx: number,
		masterId: string | undefined
	): { glyph: ReturnType<typeof resolveGlyphForMaster>; consumed: number } | null => {
		if (activeLigatures.length === 0) return null;
		for (const lig of activeLigatures) {
			if (idx + lig.from.length > codepoints.length) continue;
			let matches = true;
			for (let k = 0; k < lig.from.length; k++) {
				const cp = codepoints[idx + k].codePointAt(0) ?? 0;
				const g = resolveGlyphForMaster(cp, masterId);
				if (!g || g.name !== lig.from[k]) {
					matches = false;
					break;
				}
			}
			if (matches) {
				const out = glyphByName.get(lig.to);
				if (out) return { glyph: out, consumed: lig.from.length };
			}
		}
		return null;
	};
	const toggleFeature = (tag: string) => {
		const next = new Set(activeFeatures);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		activeFeatures = next;
	};

	// Inspector — derived view of the currently-inspected glyph.
	const inspectedGlyph = $derived(
		inspectedIndex !== null ? (visibleGlyphs[inspectedIndex] ?? null) : null
	);
	// Inspector reads resolved contours so composite glyphs (Aacute, fi,
	// æ, etc.) show their actual shape + correct bounds rather than an
	// empty viewport.
	const inspectedFlatContours = $derived(
		inspectedGlyph ? resolveContours(inspectedGlyph) : []
	);
	const inspectedBounds = $derived(
		inspectedFlatContours.length > 0 ? glyphBounds(inspectedFlatContours) : null
	);
	// Master overlay — when the project has additional masters, the
	// inspector can show each master's version of the same codepoint as
	// a stroke overlay on top of the default outline. Designers see the
	// exact slant or weight delta on a single drawing instead of jumping
	// between renders. Off by default; toggled per inspector session.
	let inspectorOverlayMasters = $state(false);
	const inspectorMasterOverlays = $derived.by(() => {
		if (!inspectorOverlayMasters || !inspectedGlyph) return [];
		const cp = inspectedGlyph.codepoint;
		const out: Array<{ id: string; name: string; path: string }> = [];
		for (const m of project.masters ?? []) {
			const ov = m.glyphs?.[cp];
			if (!ov || ov.contours.length === 0) continue;
			out.push({ id: m.id, name: m.name, path: contoursToSvgPath(ov.contours) });
		}
		return out;
	});
	// Anchor-attachment preview. For each non-underscore anchor on the
	// inspected base glyph (top / bottom / center / etc.), find the
	// first drawn mark glyph whose matching _<anchor> anchor connects.
	// Render the mark as a faint path shifted so its _anchor lines up
	// with the base's anchor — designers see exactly how the mark would
	// float relative to the base. For the demo: inspect O → see the
	// acutecomb hover at the `top` anchor.
	type AnchorMarkPreview = {
		id: string;
		path: string;
		dx: number;
		dy: number;
		markName: string;
		baseAnchor: string;
	};
	const inspectorAnchorMarks = $derived.by((): AnchorMarkPreview[] => {
		if (!inspectedGlyph) return [];
		const baseAnchors = (inspectedGlyph.anchors ?? []).filter(
			(a) => !a.name.startsWith('_')
		);
		if (baseAnchors.length === 0) return [];
		// Collect every drawn mark glyph (Unicode marks live in
		// 0x0300–0x036F).
		const marks = Object.values(project.glyphs).filter(
			(g) =>
				g.codepoint >= 0x0300 &&
				g.codepoint <= 0x036f &&
				g.contours.length > 0 &&
				g.anchors &&
				g.anchors.length > 0
		);
		const out: AnchorMarkPreview[] = [];
		for (const ba of baseAnchors) {
			const wantedMarkAnchor = `_${ba.name}`;
			const match = marks.find((m) => m.anchors?.some((a) => a.name === wantedMarkAnchor));
			if (!match) continue;
			const ma = match.anchors?.find((a) => a.name === wantedMarkAnchor);
			if (!ma) continue;
			out.push({
				id: `${match.name}-on-${ba.name}`,
				path: contoursToSvgPath(match.contours),
				dx: ba.x - ma.x,
				dy: ba.y - ma.y,
				markName: match.name,
				baseAnchor: ba.name
			});
		}
		return out;
	});
	const openInspector = (cp: number) => {
		// Clear filters so the inspected glyph is guaranteed visible.
		// Otherwise designers click a tile in a filtered grid and the
		// inspector targets the unfiltered index — confusing.
		const idx = visibleGlyphs.findIndex((g) => g.codepoint === cp);
		if (idx >= 0) {
			inspectedIndex = idx;
			return;
		}
		// Codepoint not in the current filter (came from a deep link or
		// a stale click): reset filters and try again against drawnGlyphs.
		glyphFilter = '';
		glyphCategory = null;
		const i2 = drawnGlyphs.findIndex((g) => g.codepoint === cp);
		if (i2 >= 0) inspectedIndex = i2;
	};
	const closeInspector = () => (inspectedIndex = null);
	const stepInspector = (delta: number) => {
		if (inspectedIndex === null) return;
		const n = visibleGlyphs.length;
		if (n === 0) return;
		inspectedIndex = (inspectedIndex + delta + n) % n;
	};
	const onInspectorKey = (e: KeyboardEvent) => {
		if (inspectedIndex === null) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeInspector();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			stepInspector(1);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			stepInspector(-1);
		} else if ((e.key === 'm' || e.key === 'M') && (project.masters?.length ?? 0) > 0) {
			e.preventDefault();
			inspectorOverlayMasters = !inspectorOverlayMasters;
		}
	};

	// Deep-linkable inspector. `?glyph=XXXX` (hex codepoint, no U+ prefix)
	// opens the inspector at that glyph on load. Stepping or closing
	// rewrites the URL via replaceState so designer-friends can copy the
	// browser URL and share it directly — no extra Copy button needed,
	// but we ship one too because the URL bar isn't always front-of-mind.
	let linkCopied = $state(false);
	const copyInspectorLink = async () => {
		if (inspectedIndex === null) return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			linkCopied = true;
			setTimeout(() => (linkCopied = false), 1500);
		} catch {
			// Clipboard denied — the URL is still in the address bar, so
			// the designer can copy from there.
		}
	};
	// Tester share — copies the current URL (which the effect below keeps
	// in sync with text/size/tracking/master/features/palette) so the
	// recipient lands on the exact same view.
	let testerLinkCopied = $state(false);
	const copyTesterLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			testerLinkCopied = true;
			setTimeout(() => (testerLinkCopied = false), 1500);
		} catch {
			// Same fallback — URL bar is still authoritative.
		}
	};
	// True when any tester control has moved off its default. Drives the
	// "Reset" button so it only appears when there's something to undo —
	// no visual clutter on a fresh page load.
	const testerDirty = $derived(
		typeText !== 'Type something here' ||
			trySize !== 96 ||
			tryTracking !== 0 ||
			tryMasterId !== undefined ||
			activeFeatures.size > 0 ||
			selectedPaletteIndex !== initialPaletteIndex
	);
	const resetTester = () => {
		typeText = 'Type something here';
		trySize = 96;
		tryTracking = 0;
		tryMasterId = undefined;
		activeFeatures = new Set();
		selectedPaletteIndex = initialPaletteIndex;
	};
	// On mount: parse URL params and restore the tester + inspector state.
	// onMount (not $effect) so closing/clearing the inspector or tester
	// later isn't undone by a reactive re-run on the initial URL.
	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		// Glyph deep link
		const hex = params.get('glyph');
		if (hex) {
			const cp = parseInt(hex, 16);
			if (!Number.isNaN(cp)) {
				const idx = drawnGlyphs.findIndex((g) => g.codepoint === cp);
				if (idx >= 0) inspectedIndex = idx;
			}
		}
		// Tester state
		const t = params.get('t');
		if (t !== null) typeText = t;
		const s = params.get('s');
		if (s !== null) {
			const n = parseInt(s, 10);
			if (!Number.isNaN(n) && n >= 24 && n <= 240) trySize = n;
		}
		const tr = params.get('tr');
		if (tr !== null) {
			const n = parseInt(tr, 10);
			if (!Number.isNaN(n) && n >= -100 && n <= 200) tryTracking = n;
		}
		const m = params.get('m');
		if (m && project.masters?.some((x) => x.id === m)) tryMasterId = m;
		const f = params.get('f');
		if (f) {
			const tags = f.split(',').filter(Boolean);
			activeFeatures = new Set(tags);
		}
		const p = params.get('p');
		if (p !== null) {
			const n = parseInt(p, 10);
			if (!Number.isNaN(n) && n >= 0 && n < (project.palettes?.length ?? 0)) {
				selectedPaletteIndex = n;
			}
		}
		// Auto-print — when the editor's Print button opens this tab with
		// ?print=1, force-mount every lazy section so the printed specimen
		// is complete, then kick off the browser print dialog. Three RAFs
		// instead of two so Svelte has a chance to render the newly-mounted
		// LazySection content before the print dialog snapshots the DOM.
		if (params.get('print') === '1') {
			printRequested = true;
			requestAnimationFrame(() =>
				requestAnimationFrame(() =>
					requestAnimationFrame(() => {
						window.print();
						// Strip ?print=1 from the URL so a reload doesn't
						// re-trigger the dialog. printRequested stays true
						// so the lazy sections keep their forceMount path.
						const u = new URL(window.location.href);
						u.searchParams.delete('print');
						window.history.replaceState(
							null,
							'',
							u.pathname + (u.search || '')
						);
					})
				)
			);
		}
	});
	// Sync URL when inspector + tester state changes. replaceState (not
	// pushState) so a designer-friend dragging the size slider doesn't
	// accumulate dozens of entries in the back stack. Param names are
	// short (t/s/tr/m/f/p) so the URL stays readable when shared. Only
	// non-default values are written — bare URL means default state.
	$effect(() => {
		const url = new URL(window.location.href);
		const g = inspectedGlyph;
		if (g) {
			url.searchParams.set('glyph', g.codepoint.toString(16).toUpperCase().padStart(4, '0'));
		} else {
			url.searchParams.delete('glyph');
		}
		if (typeText && typeText !== 'Type something here') {
			url.searchParams.set('t', typeText);
		} else {
			url.searchParams.delete('t');
		}
		if (trySize !== 96) url.searchParams.set('s', String(trySize));
		else url.searchParams.delete('s');
		if (tryTracking !== 0) url.searchParams.set('tr', String(tryTracking));
		else url.searchParams.delete('tr');
		if (tryMasterId) url.searchParams.set('m', tryMasterId);
		else url.searchParams.delete('m');
		if (activeFeatures.size > 0) {
			url.searchParams.set('f', [...activeFeatures].sort().join(','));
		} else {
			url.searchParams.delete('f');
		}
		if (selectedPaletteIndex !== initialPaletteIndex) {
			url.searchParams.set('p', String(selectedPaletteIndex));
		} else {
			url.searchParams.delete('p');
		}
		const next = url.pathname + (url.search || '');
		if (next !== window.location.pathname + window.location.search) {
			window.history.replaceState(null, '', next);
		}
	});
	const kerningLookup = $derived.by(() => {
		const map = new Map<string, number>();
		for (const k of project.kerning) {
			if (typeof k.left !== 'number' || typeof k.right !== 'number') continue;
			map.set(`${k.left},${k.right}`, k.value);
		}
		return map;
	});
	const typeset = $derived.by(() => {
		const out: Array<{
			id: string;
			char: string;
			path: string;
			advance: number;
			x: number;
			colorPlan: ColorRenderStep[];
		}> = [];
		let x = 0;
		const codepoints = [...typeText];
		for (let i = 0; i < codepoints.length; i++) {
			const ch = codepoints[i];
			const cp = ch.codePointAt(0) ?? 0;
			// Ligature pass — try to consume multiple codepoints at this
			// position. Walks longest-first so ffi beats fi. Falls through
			// to single-glyph rendering when nothing matches.
			const lig = matchLigature(codepoints, i, tryMasterId);
			let g: ReturnType<typeof resolveGlyphForMaster>;
			let displayChar = ch;
			let consumed = 1;
			if (lig) {
				g = lig.glyph;
				consumed = lig.consumed;
				displayChar = codepoints.slice(i, i + consumed).join('');
			} else {
				const base = resolveGlyphForMaster(cp, tryMasterId);
				g = applyFeatures(base);
			}
			const flatContours = g ? resolveContours(g) : [];
			if (!g || flatContours.length === 0) {
				// Missing glyph — render as a hollow box at half-em width.
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ id: `${i}-${cp}`, char: ch, path: '', advance: w, x, colorPlan: [] });
				x += w + tryTracking;
				continue;
			}
			// Compute the color render plan when the glyph has color
			// layers + the project has a palette; otherwise renderColorPlan
			// is empty and we fall back to monochrome contours.
			const colorPlan =
				palette && g.colorLayers && g.colorLayers.length > 0
					? planColorRender(g.colorLayers, palette)
					: [];
			out.push({
				id: `${i}-${cp}`,
				char: displayChar,
				path: contoursToSvgPath(flatContours),
				advance: g.advanceWidth,
				x,
				colorPlan
			});
			x += g.advanceWidth + tryTracking;
			// Kerning uses the codepoint AFTER the consumed window — when a
			// ligature ate "fi" (i=0, consumed=2), kerning's right neighbor
			// is at i + 2, not i + 1. The for-loop step adds consumed.
			const nextIdx = i + consumed;
			if (nextIdx < codepoints.length) {
				const nextCp = codepoints[nextIdx].codePointAt(0) ?? 0;
				const kv = kerningLookup.get(`${cp},${nextCp}`);
				if (kv !== undefined) x += kv;
			}
			if (consumed > 1) i += consumed - 1;
		}
		return { glyphs: out, totalWidth: x };
	});

	const fontSpan = $derived(ascender - descender);

	const sweepRadiusTypeset = $derived(fontSpan * 2);

	// Waterfall sample — common pangram laid out at several heights.
	// Reuses the same typeset computation but on a fixed string.
	const WATERFALL_TEXT = 'The quick brown fox jumps over the lazy dog.';
	const WATERFALL_SIZES = [14, 18, 24, 36, 56];
	const computeRow = (
		text: string,
		masterId: string | undefined = undefined,
		withFeatures = false
	): { glyphs: typeof typeset.glyphs; totalWidth: number } => {
		const out: typeof typeset.glyphs = [];
		let x = 0;
		const codepoints = [...text];
		for (let i = 0; i < codepoints.length; i++) {
			const ch = codepoints[i];
			const cp = ch.codePointAt(0) ?? 0;
			const base = resolveGlyphForMaster(cp, masterId);
			const g = withFeatures ? applyFeatures(base) : base;
			const flat = g ? resolveContours(g) : [];
			if (!g || flat.length === 0) {
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ id: `${i}-${cp}`, char: ch, path: '', advance: w, x, colorPlan: [] });
				x += w;
				continue;
			}
			out.push({
				id: `${i}-${cp}`,
				char: ch,
				path: contoursToSvgPath(flat),
				advance: g.advanceWidth,
				x,
				colorPlan: []
			});
			x += g.advanceWidth;
			if (i + 1 < codepoints.length) {
				const nextCp = codepoints[i + 1].codePointAt(0) ?? 0;
				const kv = kerningLookup.get(`${cp},${nextCp}`);
				if (kv !== undefined) x += kv;
			}
		}
		return { glyphs: out, totalWidth: x };
	};
	const waterfallRow = $derived(computeRow(WATERFALL_TEXT));

	// Mock text for the in-context section. Pulls from project brief
	// when present so the headline reads as the designer's own pitch.
	const headlineMock = $derived.by(() => {
		const intent = (project.brief?.intent ?? '').trim();
		const firstSentence = intent.split(/[.!?]\s+/)[0] ?? '';
		const title =
			firstSentence && firstSentence.length <= 80
				? firstSentence
				: 'A typeface built for working.';
		const lede =
			intent && intent.length > 40
				? intent.slice(0, 180) + (intent.length > 180 ? '…' : '')
				: 'Drawn for screens, kerned for reading, and shaped to feel familiar from the first letter.';
		return { title, lede };
	});
	const bodyMock = `Typography is two-thirds invisible. Most of the work of a typeface is in how it carries a reader from one line to the next without asking for attention. The letters that draw the eye in display sizes are the same letters that fade into rhythm at sixteen pixels — only if they were drawn to do both.`;

	// Glyph coverage heatmap data. Each set is a list of codepoints we
	// expect a "complete" Latin font to ship; the heatmap colors each
	// cell by status so designer-friends see at a glance which sets are
	// missing pieces. Sets are roughly the same buckets the editor uses
	// for the "fill character set" wizard, so the visualization mirrors
	// the editor's mental model.
	const range = (start: number, end: number): number[] => {
		const out: number[] = [];
		for (let cp = start; cp <= end; cp++) out.push(cp);
		return out;
	};
	const COVERAGE_SETS: ReadonlyArray<{
		id: string;
		label: string;
		codepoints: readonly number[];
	}> = [
		{ id: 'uppercase', label: 'Uppercase Latin', codepoints: range(0x41, 0x5a) },
		{ id: 'lowercase', label: 'Lowercase Latin', codepoints: range(0x61, 0x7a) },
		{ id: 'digits', label: 'Digits', codepoints: range(0x30, 0x39) },
		{
			id: 'punct',
			label: 'Punctuation',
			codepoints: [
				...range(0x21, 0x2f),
				...range(0x3a, 0x40),
				...range(0x5b, 0x60),
				...range(0x7b, 0x7e),
				0x2013,
				0x2014,
				0x2018,
				0x2019,
				0x201c,
				0x201d,
				0x2026
			]
		},
		{
			id: 'extended',
			label: 'Extended Latin',
			codepoints: [
				// Uppercase accented (Latin-1 + extended-A common)
				0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xcb,
				0xcc, 0xcd, 0xce, 0xcf, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd8, 0xd9,
				0xda, 0xdb, 0xdc,
				// Lowercase accented
				0xe0, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xeb,
				0xec, 0xed, 0xee, 0xef, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf8, 0xf9,
				0xfa, 0xfb, 0xfc,
				// Common ligatures + ß
				0xdf, 0xfb01, 0xfb02
			]
		},
		{
			// Basic Cyrillic — the "common subset" most foundries ship in
			// their multi-script v1. Includes the look-alikes (A B E H K M O P
			// C T X — already drawn in the demo as composites) + the bespoke
			// shapes the demo doesn't have yet (Я Ж Ц Щ Б Г Д Ы Ю Э Ч П Л Ф).
			// Empty cells in this row are an honest signal of what's missing.
			id: 'cyrillic',
			label: 'Cyrillic (basic)',
			codepoints: [
				// Uppercase: А Б В Г Д Е Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я
				...Array.from({ length: 32 }, (_, i) => 0x0410 + i),
				// Lowercase: а б в г д е ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я
				...Array.from({ length: 32 }, (_, i) => 0x0430 + i)
			]
		},
		{
			// Greek uppercase — most-common subset (skipping the obsolete
			// archaic letters). 24-letter classical alphabet.
			id: 'greek',
			label: 'Greek (uppercase)',
			codepoints: [
				// Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω
				0x0391, 0x0392, 0x0393, 0x0394, 0x0395, 0x0396, 0x0397, 0x0398,
				0x0399, 0x039a, 0x039b, 0x039c, 0x039d, 0x039e, 0x039f, 0x03a0,
				0x03a1, 0x03a3, 0x03a4, 0x03a5, 0x03a6, 0x03a7, 0x03a8, 0x03a9
			]
		}
	];
	type CoverageCell = {
		cp: number;
		char: string;
		drawn: boolean;
		wip: boolean;
		glyph: ReturnType<typeof resolveGlyphForMaster> | null;
	};
	type CoverageRow = {
		id: string;
		label: string;
		cells: CoverageCell[];
		drawnCount: number;
		total: number;
	};
	const coverageRows = $derived.by((): CoverageRow[] => {
		return COVERAGE_SETS.map((set) => {
			let drawnCount = 0;
			const cells = set.codepoints.map((cp): CoverageCell => {
				const g = project.glyphs[cp];
				const drawn = isDrawnOrComposed(g);
				if (drawn) drawnCount++;
				return {
					cp,
					char: String.fromCodePoint(cp),
					drawn,
					wip: drawn && (g.status === 'sketch' || g.status === 'draft'),
					glyph: g ?? null
				};
			});
			return { id: set.id, label: set.label, cells, drawnCount, total: cells.length };
		});
	});
	const coverageOverall = $derived.by(() => {
		let drawn = 0;
		let total = 0;
		for (const row of coverageRows) {
			drawn += row.drawnCount;
			total += row.total;
		}
		return { drawn, total, percent: total > 0 ? Math.round((drawn / total) * 100) : 0 };
	});

	// Multi-line layout for the reading specimens. Greedy word-wrap at a
	// fixed UPM width; each line is one SVG row stacked vertically.
	// Designers read paragraphs, not pangrams — the waterfall above
	// shows how letters behave at different sizes, this section shows
	// how the type breathes across real prose.
	type LaidOutGlyph = {
		id: string;
		char: string;
		path: string;
		advance: number;
		x: number;
	};
	type LaidOutLine = { glyphs: LaidOutGlyph[]; width: number };
	const spaceAdvance = $derived.by(() => {
		const space = project.glyphs[0x20];
		if (space) return space.advanceWidth;
		return Math.round(project.metrics.unitsPerEm * 0.25);
	});
	const layoutParagraph = (
		text: string,
		maxWidthUpm: number,
		masterId: string | undefined,
		withFeatures = false
	): { lines: LaidOutLine[]; totalHeight: number } => {
		const words = text.split(/\s+/).filter(Boolean);
		// Per-word layout — codepoints + kerning, no space prefix.
		const wordRows = words.map((w) => computeRow(w, masterId, withFeatures));
		const lines: LaidOutLine[] = [];
		let curGlyphs: LaidOutGlyph[] = [];
		let curWidth = 0;
		let lineSeq = 0;
		for (let wi = 0; wi < words.length; wi++) {
			const wr = wordRows[wi];
			const needsSpace = curGlyphs.length > 0;
			const addWidth = (needsSpace ? spaceAdvance : 0) + wr.totalWidth;
			if (curGlyphs.length > 0 && curWidth + addWidth > maxWidthUpm) {
				// Commit current line and start fresh
				lines.push({ glyphs: curGlyphs, width: curWidth });
				curGlyphs = [];
				curWidth = 0;
				lineSeq++;
			}
			if (curGlyphs.length > 0) curWidth += spaceAdvance;
			const baseX = curWidth;
			for (let gi = 0; gi < wr.glyphs.length; gi++) {
				const g = wr.glyphs[gi];
				curGlyphs.push({
					id: `${lineSeq}-${wi}-${gi}-${g.char}`,
					char: g.char,
					path: g.path,
					advance: g.advance,
					x: baseX + g.x
				});
			}
			curWidth += wr.totalWidth;
		}
		if (curGlyphs.length > 0) lines.push({ glyphs: curGlyphs, width: curWidth });
		return { lines, totalHeight: lines.length * fontSpan };
	};

	// Reading samples — three tiers, each on a real designer concern.
	// Display tier shows a short phrase (where letterforms have room to
	// breathe). Body tier shows running text (where rhythm matters most).
	// Caption tier shows fine print (where the type has to survive at
	// small sizes). Brief intent (if present) replaces the lorem.
	const READING_LINE_WIDTH = 2400; // UPM units — generous so paragraphs feel honest
	const READING_SAMPLES = $derived.by(() => {
		const brief = (project.brief?.intent ?? '').trim();
		const display = brief
			? brief.split(/[.!?]\s+/)[0].slice(0, 80)
			: 'Typography is what language looks like.';
		const body = brief && brief.length > 100
			? brief
			: 'Good design is honest. It does not attempt to manipulate the reader with promises it cannot keep. Letterforms are not decoration — they are the medium through which an idea reaches a reader. The work of the type designer is to make that reaching feel effortless.';
		const caption =
			'Set in ' + project.metadata.familyName + '. ' +
			(project.brief?.references?.[0] ?? 'Drawn glyph-by-glyph in Font Studio.');
		return [
			{ id: 'display', label: 'Display', size: 64, text: display },
			{ id: 'body', label: 'Body', size: 18, text: body },
			{ id: 'caption', label: 'Caption', size: 12, text: caption }
		];
	});
	const readingLayouts = $derived(
		READING_SAMPLES.map((s) => ({
			...s,
			layout: layoutParagraph(s.text, READING_LINE_WIDTH, tryMasterId)
		}))
	);
	// Per-master rows — only computed when the project has additional masters,
	// rendered at one fixed size so the slant/weight difference is obvious
	// without making the waterfall itself N× longer.
	const masterRows = $derived.by(() => {
		const masters = project.masters ?? [];
		if (masters.length === 0) return [];
		return [
			{ name: project.metadata.styleName || 'Regular', row: waterfallRow },
			...masters.map((m) => ({ name: m.name, row: computeRow(WATERFALL_TEXT, m.id) }))
		];
	});

	// Download flow — lazy-loads the export pipeline only on click so
	// the initial share-page bundle stays light for visitors who don't
	// download. Builds the chosen format in-browser and triggers a save.
	let downloading = $state<null | 'otf' | 'woff2'>(null);
	let downloadError = $state<string | null>(null);
	// Master selector — when the project has multiple masters, designers
	// pick which one to build as a static OTF/WOFF2. A true variable
	// font export needs Pyodide and is too heavy for the share page; this
	// gives access to every master as a separate file.
	let selectedMasterId = $state<string | undefined>(undefined);
	const availableMasters = $derived.by(() => {
		const list: Array<{ id: string | undefined; name: string }> = [
			{ id: undefined, name: project.metadata.styleName || 'Regular' }
		];
		for (const m of project.masters ?? []) list.push({ id: m.id, name: m.name });
		return list;
	});
	const safeFilename = (s: string): string => s.replace(/[^A-Za-z0-9_-]/g, '') || 'Font';
	// Filename for downloads — incorporates the chosen master so files don't
	// silently overwrite each other when designer-friends download multiple.
	const downloadFilename = (ext: string): string => {
		const family = safeFilename(project.metadata.familyName);
		const style = safeFilename(
			availableMasters.find((m) => m.id === selectedMasterId)?.name ?? project.metadata.styleName
		);
		return `${family}-${style}.${ext}`;
	};
	const downloadOtf = async () => {
		if (downloading) return;
		downloading = 'otf';
		downloadError = null;
		try {
			const { buildFont } = await import('$lib/font/export');
			const { font } = buildFont(project, { masterId: selectedMasterId });
			triggerDownloadNamed(font.toArrayBuffer(), downloadFilename('otf'), 'font/otf');
		} catch (err) {
			downloadError = err instanceof Error ? err.message : String(err);
		} finally {
			downloading = null;
		}
	};
	const downloadWoff2 = async () => {
		if (downloading) return;
		downloading = 'woff2';
		downloadError = null;
		try {
			const { buildFont } = await import('$lib/font/export');
			const { otfToWoff2 } = await import('$lib/font/woff2');
			const { font } = buildFont(project, { masterId: selectedMasterId });
			const otf = font.toArrayBuffer();
			const woff2 = await otfToWoff2(otf);
			triggerDownloadNamed(woff2, downloadFilename('woff2'), 'font/woff2');
		} catch (err) {
			downloadError = err instanceof Error ? err.message : String(err);
		} finally {
			downloading = null;
		}
	};
	const triggerDownloadNamed = (buffer: ArrayBuffer, filename: string, mime: string) => {
		const blob = new Blob([buffer], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// Glyph tag inventory — same grouping logic as the design-md exporter.
	// Surfaces the project's own taxonomy (flagship / WIP / alternate /
	// mark / composite / etc.) so designer-friends see what the designer
	// considers special.
	const tagInventory = $derived.by(() => {
		const buckets = new Map<string, string[]>();
		for (const g of Object.values(project.glyphs)) {
			if (!g.tags || g.tags.length === 0) continue;
			const label =
				g.codepoint > 0x20 && g.codepoint < 0x10000
					? String.fromCodePoint(g.codepoint)
					: g.name;
			for (const t of g.tags) {
				const arr = buckets.get(t) ?? [];
				arr.push(label);
				buckets.set(t, arr);
			}
		}
		return [...buckets.entries()]
			.sort((a, b) => b[1].length - a[1].length)
			.map(([tag, members]) => ({ tag, members }));
	});

	// OpenType features the project ships. Combines kern/liga toggles
	// with anything detectFeatures finds via glyph-name suffixes (ss01,
	// onum, etc.).
	const sharedFeatures = $derived.by(() => {
		const out: Array<{ tag: string; label: string; count?: number }> = [];
		const seen = new Set<string>();
		const push = (tag: string, label: string, count?: number) => {
			if (seen.has(tag)) return;
			seen.add(tag);
			out.push({ tag, label, count });
		};
		if (project.features.kern) push('kern', 'Kerning');
		const disabled = new Set(project.features.disabledAutoFeatures ?? []);
		const autoOn = project.features.autoFeatures !== false;
		if (autoOn) {
			for (const f of detectFeatures(project.glyphs)) {
				if (disabled.has(f.feature)) continue;
				const count = f.kind === 'ligature' ? f.ligatures?.length ?? 0 : f.subs.length;
				push(f.feature, featureLabel(f.feature), count);
			}
		}
		// If the project explicitly opted into liga but no ligatures were
		// auto-detected, surface the chip with no count so the contract
		// (the font ships liga) stays visible.
		if (project.features.liga) push('liga', 'Standard ligatures');
		return out;
	});

	// Feature category mapping — buckets OpenType tags so designer-friends
	// see the features grouped the way they'd be in an InDesign or Figma
	// type panel: Letterforms / Figures / Spacing & ligatures / Positional.
	// Unknown tags fall into Other so nothing disappears.
	type FeatureCategoryId =
		| 'spacing'
		| 'letterforms'
		| 'figures'
		| 'positional'
		| 'other';
	const FEATURE_CATEGORY_LABELS: Record<FeatureCategoryId, string> = {
		spacing: 'Spacing & ligatures',
		letterforms: 'Letterforms',
		figures: 'Figures',
		positional: 'Positional',
		other: 'Other'
	};
	const FEATURE_CATEGORY_ORDER: FeatureCategoryId[] = [
		'spacing',
		'letterforms',
		'figures',
		'positional',
		'other'
	];
	const featureCategory = (tag: string): FeatureCategoryId => {
		if (['kern', 'liga', 'dlig', 'clig', 'calt', 'rlig', 'hlig'].includes(tag)) return 'spacing';
		if (['init', 'medi', 'fina', 'isol'].includes(tag)) return 'positional';
		if (
			[
				'lnum',
				'onum',
				'tnum',
				'pnum',
				'sups',
				'subs',
				'numr',
				'dnom',
				'frac',
				'ordn',
				'zero'
			].includes(tag)
		)
			return 'figures';
		if (
			['smcp', 'c2sc', 'salt', 'swsh', 'hist', 'unic', 'titl'].includes(tag) ||
			tag.startsWith('ss') ||
			tag.startsWith('cv')
		)
			return 'letterforms';
		return 'other';
	};
	type GroupedFeature<T> = { category: FeatureCategoryId; label: string; items: T[] };
	const groupFeatures = <T extends { tag?: string; feature?: string }>(
		items: T[]
	): GroupedFeature<T>[] => {
		const buckets = new Map<FeatureCategoryId, T[]>();
		for (const it of items) {
			const tag = it.tag ?? it.feature ?? '';
			const cat = featureCategory(tag);
			const list = buckets.get(cat) ?? [];
			list.push(it);
			buckets.set(cat, list);
		}
		const out: GroupedFeature<T>[] = [];
		for (const id of FEATURE_CATEGORY_ORDER) {
			const list = buckets.get(id);
			if (list && list.length > 0) {
				out.push({ category: id, label: FEATURE_CATEGORY_LABELS[id], items: list });
			}
		}
		return out;
	};
	const sharedFeaturesGrouped = $derived(groupFeatures(sharedFeatures));
	const detectedFeaturesGrouped = $derived(groupFeatures(detectedFeatures));

	// OpenGraph metadata — derived so social cards always reflect current
	// project state. Description truncated to 200 chars (well under the
	// 300-char Twitter limit) and falls back to a spec summary when the
	// brief is unpopulated.
	const shareTitle = $derived(
		`${project.metadata.familyName} · ${project.metadata.styleName}`
	);
	const shareDesc = $derived.by(() => {
		const briefIntent = project.brief?.intent?.split('. ')[0]?.slice(0, 200);
		if (briefIntent) return briefIntent;
		if (project.description) return project.description.slice(0, 200);
		const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
		return `${drawn} drawn glyphs · UPM ${project.metrics.unitsPerEm} · ${project.kerning.length} kerning pairs`;
	});

	// Specs block — pulled from project state for the visitor footer.
	const specs = $derived.by(() => {
		const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
		const total = Object.keys(project.glyphs).length;
		return {
			drawn,
			total,
			upm: project.metrics.unitsPerEm,
			capHeight: project.metrics.capHeight,
			xHeight: project.metrics.xHeight,
			kerningPairs: project.kerning.length,
			palettes: project.palettes?.length ?? 0,
			axes: project.axes?.length ?? 0
		};
	});

	// CSS embed snippet — exposed as a $derived so it can be copied in one
	// place and rendered in another. Designers paste this into their site
	// to use the font; the one-click copy beats hand-selecting from a <pre>.
	const cssSnippet = $derived.by(() => {
		const family = project.metadata.familyName;
		const file = `${safeFilename(family)}-${safeFilename(project.metadata.styleName)}.woff2`;
		const weight = project.familyAxes?.wght ?? 400;
		const featureSettings = sharedFeatures.map((f) => `'${f.tag}' 1`).join(', ');
		return `@font-face {
  font-family: '${family}';
  src: url('${file}') format('woff2');
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
}

body {
  font-family: '${family}', sans-serif;${featureSettings ? `\n  font-feature-settings: ${featureSettings};` : ''}
}`;
	});
	let snippetCopied = $state(false);
	const copySnippet = async () => {
		try {
			await navigator.clipboard.writeText(cssSnippet);
			snippetCopied = true;
			setTimeout(() => (snippetCopied = false), 1500);
		} catch {
			// Clipboard access denied (rare on https). Fail silent — the
			// snippet stays selectable as text so the designer can still copy.
		}
	};
</script>

<svelte:head>
	<title>{project.metadata.familyName} — {project.metadata.styleName}</title>
	<meta name="description" content={shareDesc} />
	<!-- OpenGraph for link unfurls on Twitter, Slack, Discord, iMessage.
	     og:image points at /og/{projectId} — a server-rendered PNG
	     using satori + resvg that shows the family name + designer +
	     glyph count for THIS specific project. Renders the demo on
	     the fly; falls back to a generic Font Studio brand card if the
	     project isn't in cloud storage. Bots that fetch the page get
	     a project-specific preview instead of generic brand art. -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={shareDesc} />
	<meta property="og:site_name" content="Font Studio" />
	<meta property="og:image" content="/og/{project.id}" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={shareDesc} />
	<meta name="twitter:image" content="/og/{project.id}" />
</svelte:head>

<!-- Reusable type-rendering snippets for the In context mockups.
     Each snippet picks up tryMasterId + activeFeatures from outer
     reactive scope, so switching master or toggling a feature in
     the tester re-renders every mockup in step. Snippets are
     defined here so they can be called from anywhere in the markup. -->
{#snippet typeRow(text: string, sizePx: number)}
	{@const row = computeRow(text, tryMasterId, true)}
	<svg
		viewBox="0 {descender} {Math.max(row.totalWidth, 100)} {fontSpan}"
		preserveAspectRatio="xMinYMid meet"
		style="height: {sizePx}px; width: auto; transform: scaleY(-1); display: inline-block; vertical-align: middle;"
		aria-label={text}
	>
		{#each row.glyphs as g (g.id)}
			{#if g.path}
				<path
					d={g.path}
					transform="translate({g.x} 0)"
					fill="currentColor"
					fill-rule="evenodd"
				/>
			{/if}
		{/each}
	</svg>
{/snippet}
{#snippet typeParagraph(text: string, maxWidthUpm: number, sizePx: number)}
	{@const layout = layoutParagraph(text, maxWidthUpm, tryMasterId, true)}
	<svg
		viewBox="0 0 {maxWidthUpm} {layout.totalHeight}"
		preserveAspectRatio="xMinYMin meet"
		style="width: 100%; height: auto; max-height: {sizePx * (layout.lines.length + 0.5)}px; display: block;"
		aria-label={text}
	>
		{#each layout.lines as line, li (li)}
			<g transform="translate(0 {li * fontSpan + ascender}) scale(1 -1)">
				{#each line.glyphs as g (g.id)}
					{#if g.path}
						<path
							d={g.path}
							transform="translate({g.x} 0)"
							fill="currentColor"
							fill-rule="evenodd"
						/>
					{/if}
				{/each}
			</g>
		{/each}
	</svg>
{/snippet}

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
	<!-- Print-only specimen banner — visible only when printing. Replaces
	     the read-only chip with a dateline so the printed sheet stands
	     alone as an artifact: family name + designer is already in the
	     header below; this gives the document a date and shareable URL. -->
	<div data-print-only class="mb-6 hidden border-b border-fg pb-2 text-[10px] uppercase">
		<span class="font-mono">Specimen</span>
		<span class="mx-2">·</span>
		<span class="font-mono" data-numeric>{new Date().toISOString().slice(0, 10)}</span>
	</div>

	<!-- Read-only banner — clarifies what the route is for. -->
	<div
		data-print-hide
		class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase text-fg-muted"
	>
		<Eye class="size-3" />
		<span>Shared view · read-only</span>
	</div>

	<header
		class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row"
	>
		<div class="min-w-0">
			<h1
				class="text-[28px] leading-tight tracking-tight text-fg sm:text-[36px]"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				{project.metadata.familyName}
			</h1>
			<p class="mt-1 text-[13px] text-fg-muted">
				{project.metadata.styleName} · designed by {project.metadata.designer || 'Unknown'}
			</p>
			{#if project.description}
				<p class="mt-3 max-w-prose text-[14px] leading-relaxed text-fg">
					{project.description}
				</p>
			{/if}
		</div>
		<!-- Download — two formats: OTF for install, WOFF2 for web.
		     Both lazy-load the export pipeline only on click. When the
		     project has masters, a selector lets the designer pick which
		     to build as a static font. -->
		<div data-print-hide class="flex shrink-0 flex-col items-start gap-2 sm:items-end">
			<div class="flex gap-2">
				<button
					type="button"
					onclick={downloadOtf}
					disabled={downloading !== null}
					class="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
					title="Download as OTF — install in macOS, Windows, design apps"
				>
					<Download class="size-3.5" />
					{downloading === 'otf' ? 'Building…' : 'OTF'}
				</button>
				<button
					type="button"
					onclick={downloadWoff2}
					disabled={downloading !== null}
					class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-fg hover:border-accent disabled:opacity-50"
					title="Download as WOFF2 — for @font-face web embedding"
				>
					<Download class="size-3.5" />
					{downloading === 'woff2' ? 'Building…' : 'WOFF2'}
				</button>
				<button
					type="button"
					onclick={triggerSpecimenPrint}
					class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-fg hover:border-accent"
					title="Print or save as PDF — type specimen sheet"
				>
					<Printer class="size-3.5" />
					Specimen
				</button>
			</div>
			{#if availableMasters.length > 1}
				<select
					bind:value={selectedMasterId}
					disabled={downloading !== null}
					class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] outline-none focus:border-accent disabled:opacity-50"
					title="Master to build as a static font"
				>
					{#each availableMasters as m (m.id ?? 'default')}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			{/if}
		</div>
	</header>
	{#if downloadError}
		<div
			data-print-hide
			class="mb-6 rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger-strong"
		>
			Download failed: {downloadError}
		</div>
	{/if}

	<!-- Live typeset preview. Renders typed text using the project's
	     own SVG paths + kerning data, so visitors see the WIP font
	     as the designer intended. Master/size/tracking controls give
	     designers a real foundry-style "tester" — they can audition
	     the type at the size and rhythm they actually need. -->
	<section class="mb-10" data-print-hide>
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span class="flex items-center gap-2">
				<span>Try it</span>
				<button
					type="button"
					onclick={copyTesterLink}
					class="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-normal normal-case text-fg-muted hover:border-accent hover:text-fg"
					title="Copy a link to this exact tester view — text, size, master, features, palette"
				>
					{#if testerLinkCopied}
						<Check class="size-2.5" />
						<span>Copied</span>
					{:else}
						<Link2 class="size-2.5" />
						<span>Share view</span>
					{/if}
				</button>
				{#if testerDirty}
					<button
						type="button"
						onclick={resetTester}
						class="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-normal normal-case text-fg-muted hover:border-accent hover:text-fg"
						title="Reset text, size, tracking, master, features, palette to defaults"
					>
						<span>Reset</span>
					</button>
				{/if}
			</span>
			<span class="font-mono normal-case text-fg-subtle" data-numeric>
				{trySize}px · {tryTracking > 0 ? '+' : ''}{tryTracking}
			</span>
		</h2>
		<input
			type="text"
			bind:value={typeText}
			placeholder="Type something..."
			class="w-full rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-fg outline-none focus:border-accent"
		/>
		<!-- Sample-text presets. Quick pills for the passages designers
		     reach for first: a pangram for coverage, AaBbCc for shape
		     comparison, Numbers for figures, Punctuation for marks,
		     Lorem for body rhythm, Hamburgevons as the type-design proof
		     word (catches stem widths + curve consistency + key inks).
		     Click sets typeText; URL stays in sync via the existing
		     effect. Hidden in print since the tester itself is hidden. -->
		<div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
			<span class="text-fg-subtle">Try</span>
			{#each SAMPLE_PRESETS as preset (preset.id)}
				{@const active = typeText === preset.text}
				<button
					type="button"
					onclick={() => (typeText = preset.text)}
					class="rounded-md border px-2 py-0.5 transition-colors {active
						? 'border-accent bg-accent-soft/40 text-fg'
						: 'border-border bg-surface text-fg-muted hover:border-accent/60'}"
					title={preset.text}
				>
					{preset.label}
				</button>
			{/each}
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-fg-muted">
			{#if availableMasters.length > 1}
				<div class="flex items-center gap-1.5">
					<span class="text-fg-subtle">Master</span>
					{#each availableMasters as m (m.id ?? 'default')}
						<button
							type="button"
							onclick={() => (tryMasterId = m.id)}
							class="rounded-md border px-2 py-0.5 transition-colors {tryMasterId === m.id
								? 'border-accent bg-accent-soft/40 text-fg'
								: 'border-border bg-surface hover:border-accent/60'}"
						>
							{m.name}
						</button>
					{/each}
				</div>
			{/if}
			<label class="flex items-center gap-2">
				<span class="text-fg-subtle">Size</span>
				<input
					type="range"
					min="24"
					max="240"
					step="4"
					bind:value={trySize}
					class="h-1 w-32 cursor-pointer accent-accent"
					aria-label="Preview size"
				/>
			</label>
			<label class="flex items-center gap-2">
				<span class="text-fg-subtle">Tracking</span>
				<input
					type="range"
					min="-100"
					max="200"
					step="10"
					bind:value={tryTracking}
					class="h-1 w-32 cursor-pointer accent-accent"
					aria-label="Tracking"
				/>
				{#if tryTracking !== 0}
					<button
						type="button"
						onclick={() => (tryTracking = 0)}
						class="text-[10px] text-fg-subtle hover:text-fg"
						title="Reset tracking to 0"
					>
						reset
					</button>
				{/if}
			</label>
		</div>
		{#if detectedFeatures.length > 0}
			<!-- Feature toggles grouped by category (letterforms / figures /
			     spacing & ligatures / positional) so designers can scan the
			     ones they care about. Active set spans groups; clear works
			     across all. -->
			<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
				<span class="text-fg-subtle">Features</span>
				{#each detectedFeaturesGrouped as group (group.category)}
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="text-[10px] text-fg-subtle">{group.label}</span>
						{#each group.items as f (f.feature)}
							{@const on = activeFeatures.has(f.feature)}
							<button
								type="button"
								onclick={() => toggleFeature(f.feature)}
								class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono transition-colors {on
									? 'border-accent bg-accent-soft/40 text-fg'
									: 'border-border bg-surface text-fg-muted hover:border-accent/60'}"
								title="{featureLabel(f.feature)} — {f.subs.length} substitution{f.subs.length === 1 ? '' : 's'}"
							>
								<span>{f.feature}</span>
								<span class="text-[9px] text-fg-subtle" data-numeric>{f.subs.length}</span>
							</button>
						{/each}
					</div>
				{/each}
				{#if activeFeatures.size > 0}
					<button
						type="button"
						onclick={() => (activeFeatures = new Set())}
						class="ml-1 text-[10px] text-fg-subtle hover:text-fg"
					>
						clear
					</button>
				{/if}
			</div>
		{/if}
		{#if (project.palettes?.length ?? 0) > 1}
			<div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
				<span class="text-fg-subtle">Palette</span>
				{#each project.palettes ?? [] as p, pi (pi)}
					{@const on = pi === selectedPaletteIndex}
					<button
						type="button"
						onclick={() => (selectedPaletteIndex = pi)}
						class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition-colors {on
							? 'border-accent bg-accent-soft/40 text-fg'
							: 'border-border bg-surface text-fg-muted hover:border-accent/60'}"
						title={p.name ?? `Palette ${pi + 1}`}
					>
						<!-- Mini swatch strip — the first four colors of the
						     palette so visitors can recognize a palette by
						     its colors before reading its name. -->
						<span class="inline-flex overflow-hidden rounded-sm">
							{#each p.colors.slice(0, 4) as c, ci (ci)}
								<span
									class="inline-block size-2.5"
									style="background: {rgbaToCss(c)};"
								></span>
							{/each}
						</span>
						<span>{p.name ?? `Palette ${pi + 1}`}</span>
					</button>
				{/each}
			</div>
		{/if}
		<div
			class="mt-3 overflow-x-auto rounded-md border border-border bg-canvas px-4 py-6"
			style="--font-baseline: {ascender}px;"
		>
			<svg
				viewBox="0 {descender} {Math.max(typeset.totalWidth, 100)} {fontSpan}"
				preserveAspectRatio="xMinYMid meet"
				style="height: {trySize}px; width: auto; transform: scaleY(-1); display: block;"
				aria-label="Typeset preview of {project.metadata.familyName}"
			>
				<!-- Color/gradient defs per glyph instance. Each gradient
				     def's id is scoped by glyph index so multiple
				     occurrences of the same letter don't collide. -->
				<defs>
					{#each typeset.glyphs as g (g.id)}
						{#each g.colorPlan as step (step.layerId)}
							{#if step.fill.type === 'linearGradient'}
								<linearGradient
									id="ts-{g.id}-{step.layerId}"
									gradientUnits="userSpaceOnUse"
									x1={step.fill.start.x + g.x}
									y1={step.fill.start.y}
									x2={step.fill.end.x + g.x}
									y2={step.fill.end.y}
								>
									{#each step.fill.stops as s (s.offset)}
										<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
									{/each}
								</linearGradient>
							{:else if step.fill.type === 'radialGradient'}
								<radialGradient
									id="ts-{g.id}-{step.layerId}"
									gradientUnits="userSpaceOnUse"
									cx={step.fill.center.x + g.x}
									cy={step.fill.center.y}
									r={Math.max(step.fill.radius, 1)}
								>
									{#each step.fill.stops as s (s.offset)}
										<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
									{/each}
								</radialGradient>
							{:else if step.fill.type === 'sweepGradient'}
								<clipPath id="ts-clip-{g.id}-{step.layerId}">
									<path d={step.path} transform="translate({g.x} 0)" />
								</clipPath>
							{/if}
						{/each}
					{/each}
				</defs>
				{#each typeset.glyphs as g (g.id)}
					{#if g.colorPlan.length > 0}
						{#each g.colorPlan as step (step.layerId)}
							{#if step.fill.type === 'sweepGradient'}
								<g clip-path="url(#ts-clip-{g.id}-{step.layerId})">
									{#each typesetSweepSlices({ x: step.fill.center.x + g.x, y: step.fill.center.y }, step.fill.startAngle, step.fill.endAngle, step.fill.stops, sweepRadiusTypeset) as slice, i (i)}
										<polygon points={slice.points} fill={slice.color} />
									{/each}
								</g>
							{:else}
								<path
									d={step.path}
									transform="translate({g.x} 0)"
									fill={step.fill.type === 'solid'
										? rgbaToCss(step.fill.color)
										: `url(#ts-${g.id}-${step.layerId})`}
									fill-rule="evenodd"
								/>
							{/if}
						{/each}
					{:else if g.path}
						<path
							d={g.path}
							transform="translate({g.x} 0)"
							fill="currentColor"
							fill-rule="evenodd"
							class="text-fg"
						/>
					{:else}
						<rect
							x={g.x + 20}
							y={descender + 20}
							width={g.advance - 40}
							height={fontSpan - 40}
							fill="none"
							stroke="currentColor"
							stroke-width="20"
							stroke-dasharray="40 40"
							class="text-fg-subtle"
						/>
					{/if}
				{/each}
			</svg>
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Live render with the project's kerning applied. Dashed boxes mark
			glyphs the designer hasn't drawn yet — system font won't substitute.
		</p>
	</section>

	<!-- Brief — visible project narrative for designer-friends.
	     Renders intent + audience + differentiation as a small
	     prose block. Each piece is conditional so the section
	     stays clean for projects without a populated brief. -->
	{#if project.brief && (project.brief.intent || project.brief.audience || project.brief.differentiation)}
		<section class="mb-10">
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Brief
			</h2>
			<div class="space-y-3 rounded-md border border-border bg-surface-2/30 p-4 text-[13px] leading-relaxed text-fg-muted">
				{#if project.brief.intent}
					<p>
						<span class="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
							Intent
						</span><br />
						{project.brief.intent}
					</p>
				{/if}
				{#if project.brief.audience}
					<p>
						<span class="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
							Audience
						</span><br />
						{project.brief.audience}
					</p>
				{/if}
				{#if project.brief.differentiation}
					<p>
						<span class="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
							Differentiation
						</span><br />
						{project.brief.differentiation}
					</p>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Waterfall — same pangram at multiple sizes. Shows how the
	     typeface behaves from caption to display. -->
	{#if waterfallRow.glyphs.length > 0}
		<section class="mb-10">
			<h2
				class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				Waterfall
			</h2>
			<div class="space-y-3 rounded-md border border-border bg-canvas px-4 py-5">
				{#each WATERFALL_SIZES as size (size)}
					<div class="flex items-baseline gap-4">
						<span class="w-10 shrink-0 text-right font-mono text-[10px] text-fg-subtle" data-numeric>
							{size}px
						</span>
						<svg
							viewBox="0 {descender} {Math.max(waterfallRow.totalWidth, 100)} {fontSpan}"
							preserveAspectRatio="xMinYMid meet"
							style="height: {size}px; width: auto; transform: scaleY(-1);"
							aria-label="Waterfall {size}px"
						>
							{#each waterfallRow.glyphs as g (g.id)}
								{#if g.path}
									<path
										d={g.path}
										transform="translate({g.x} 0)"
										fill="currentColor"
										fill-rule="evenodd"
										class="text-fg"
									/>
								{/if}
							{/each}
						</svg>
					</div>
				{/each}
			</div>
			<p class="mt-2 text-[11px] text-fg-subtle">
				The classic English pangram from 14px (caption) to 56px (small display).
			</p>
		</section>
	{/if}

	<!-- Reading specimens — display / body / caption. Designers read
	     paragraphs, not pangrams; this is where the rhythm of the type
	     becomes legible. Width is fixed in UPM so the line count reflects
	     the actual measure a designer would set, not the viewport. -->
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Reading</span>
			<span class="font-mono normal-case text-fg-subtle">
				Display · Body · Caption
			</span>
		</h2>
		<div class="space-y-6 rounded-md border border-border bg-canvas px-5 py-6">
			{#each readingLayouts as sample (sample.id)}
				{#if sample.layout.lines.length > 0}
					<div>
						<div
							class="mb-1.5 text-[9px] font-mono uppercase tracking-wider text-fg-subtle"
							data-numeric
						>
							{sample.label} · {sample.size}px
						</div>
						<svg
							viewBox="0 0 {READING_LINE_WIDTH} {sample.layout.totalHeight}"
							preserveAspectRatio="xMinYMin meet"
							style="width: 100%; height: auto; display: block;"
							aria-label="{sample.label} reading specimen"
						>
							{#each sample.layout.lines as line, li (li)}
								<g transform="translate(0 {li * fontSpan + ascender}) scale(1 -1)">
									{#each line.glyphs as g (g.id)}
										{#if g.path}
											<path
												d={g.path}
												transform="translate({g.x} 0)"
												fill="currentColor"
												fill-rule="evenodd"
												class="text-fg"
											/>
										{/if}
									{/each}
								</g>
							{/each}
						</svg>
					</div>
				{/if}
			{/each}
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Display, body, and caption. Body sample {project.brief?.intent ? 'uses the project brief' : 'is a generic typography passage'}; switch the master in the tester above to re-render every sample in that style.
		</p>
	</section>

	<!-- In context — mockups that put the type in real UI shapes.
	     Designers buy fonts because of how they look in their work, not
	     as specimens. Buttons, headline card, stat card, paragraph
	     block. Each renders through the same computeRow / layoutParagraph
	     pipeline as the tester so the master switch above re-renders
	     these mockups in step. Lazy-mounted — four SVG mockups + a body
	     paragraph layout was paying for itself on cold load even when
	     designers landed above-fold. -->
	<LazySection minHeight={700} forceMount={printRequested}>
	<section class="mb-10">
		<h2
			class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			In context
		</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Buttons — primary + secondary. The primary uses bg-accent
			     so it picks up the page's accent token rather than a
			     project-specific palette (mockup should feel "neutral
			     designer's site," not "this specific font's brand"). -->
			<div class="rounded-lg border border-border bg-canvas px-5 py-6">
				<div class="mb-3 text-[10px] uppercase tracking-wider text-fg-subtle">Buttons</div>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="inline-flex items-center rounded-md bg-accent px-4 py-2 text-accent-fg"
					>
						{@render typeRow('Get started', 16)}
					</span>
					<span
						class="inline-flex items-center rounded-md border border-border bg-surface px-4 py-2 text-fg"
					>
						{@render typeRow('Learn more', 16)}
					</span>
				</div>
			</div>
			<!-- Stat card — big number + label. Tests tabular figures and
			     decimal alignment. Number style intentionally currency-
			     adjacent because that's where tabular shines. -->
			<div class="rounded-lg border border-border bg-canvas px-5 py-6">
				<div class="mb-3 text-[10px] uppercase tracking-wider text-fg-subtle">Stat</div>
				<div class="text-fg">
					{@render typeRow('€12,847', 56)}
				</div>
				<div class="mt-1 text-fg-muted">
					{@render typeRow('Monthly recurring revenue', 13)}
				</div>
			</div>
		</div>
		<!-- Headline card. The headline pulls from project brief intent
		     when present (first sentence, capped at 60 chars) so the
		     mockup reads as the designer's own pitch rather than a
		     generic placeholder. Lede falls back to a generic line. -->
		<div class="mt-4 rounded-lg border border-border bg-canvas px-6 py-7">
			<div class="mb-3 text-[10px] uppercase tracking-wider text-fg-subtle">Headline</div>
			<div class="text-fg">
				{@render typeRow(headlineMock.title, 40)}
			</div>
			<div class="mt-3 max-w-xl text-fg-muted">
				{@render typeRow(headlineMock.lede, 16)}
			</div>
		</div>
		<!-- Paragraph card — multi-line body at a real reading measure.
		     This is where rhythm and color (typographic, not chromatic)
		     show up. Uses layoutParagraph for proper line breaks at a
		     fixed UPM measure. -->
		<div class="mt-4 rounded-lg border border-border bg-canvas px-6 py-7">
			<div class="mb-3 text-[10px] uppercase tracking-wider text-fg-subtle">Body</div>
			{@render typeParagraph(bodyMock, 1800, 16)}
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Mockups re-render in step with the tester above — switch master, palette, or features and these update too.
		</p>
	</section>
	</LazySection>

	<!-- Master compare — only when the family has > 1 master. Renders the
	     same pangram in each master at one large size so the slant / weight
	     difference is visible at a glance. -->
	{#if masterRows.length > 1}
		<section class="mb-10">
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Masters
			</h2>
			<div class="space-y-4 rounded-md border border-border bg-canvas px-4 py-5">
				{#each masterRows as m (m.name)}
					<div class="flex items-baseline gap-4">
						<span class="w-16 shrink-0 text-right font-mono text-[10px] text-fg-subtle">
							{m.name}
						</span>
						<svg
							viewBox="0 {descender} {Math.max(m.row.totalWidth, 100)} {fontSpan}"
							preserveAspectRatio="xMinYMid meet"
							style="height: 48px; width: auto; transform: scaleY(-1);"
							aria-label="{m.name} sample"
						>
							{#each m.row.glyphs as g (g.id)}
								{#if g.path}
									<path
										d={g.path}
										transform="translate({g.x} 0)"
										fill="currentColor"
										fill-rule="evenodd"
										class="text-fg"
									/>
								{/if}
							{/each}
						</svg>
					</div>
				{/each}
			</div>
			<p class="mt-2 text-[11px] text-fg-subtle">
				Each row uses the same drawing, transformed for its master. Pick a master in the
				download row above to grab any of them as a static font.
			</p>
		</section>
	{/if}

	<!-- Specs block — at-a-glance facts for designer-friends. -->
	<section class="mb-10">
		<h2
			class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			Specs
		</h2>
		<dl class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-border bg-surface-2/30 p-4 sm:grid-cols-4">
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Drawn</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>
					{specs.drawn}/{specs.total}
				</dd>
			</div>
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">UPM</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.upm}</dd>
			</div>
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Cap-height</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.capHeight}</dd>
			</div>
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">x-height</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.xHeight}</dd>
			</div>
			{#if specs.kerningPairs > 0}
				<div>
					<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Kerning pairs</dt>
					<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.kerningPairs}</dd>
				</div>
			{/if}
			{#if specs.palettes > 0}
				<div>
					<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Palettes</dt>
					<dd class="text-[14px] font-medium text-fg" data-numeric>
						{specs.palettes}
						<span class="text-[10px] font-normal text-fg-subtle">CPAL</span>
					</dd>
				</div>
			{/if}
			{#if specs.axes > 0}
				<div>
					<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Axes</dt>
					<dd class="text-[14px] font-medium text-fg" data-numeric>
						{specs.axes}
						<span class="text-[10px] font-normal text-fg-subtle">VF</span>
					</dd>
				</div>
			{/if}
		</dl>
	</section>

	<!-- Tag inventory — designer-applied taxonomy. -->
	{#if tagInventory.length > 0}
		<section class="mb-10">
			<h2
				class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				Tags
			</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each tagInventory as t (t.tag)}
					<span
						class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2.5 py-1 text-[11px]"
						title={t.members.join(' · ')}
					>
						<span class="font-medium text-fg">{t.tag}</span>
						<span class="text-fg-subtle" data-numeric>{t.members.length}</span>
					</span>
				{/each}
			</div>
		</section>
	{/if}

	<!-- OpenType features the project ships. -->
	{#if sharedFeatures.length > 0}
		<section class="mb-10">
			<h2
				class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				OpenType features
			</h2>
			<!-- Grouped by category. A flat list of 8+ tags doesn't tell
			     designers anything; "kern + liga in Spacing & ligatures,
			     ss01 + smcp in Letterforms" tells them what they're
			     getting at a glance. Each group renders as a horizontal
			     row with the category label on the left. -->
			<div class="space-y-2">
				{#each sharedFeaturesGrouped as group (group.category)}
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="mr-1 text-[10px] uppercase tracking-wider text-fg-subtle">
							{group.label}
						</span>
						{#each group.items as f (f.tag)}
							<span
								class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2.5 py-1 text-[11px]"
								title={f.count !== undefined ? `${f.count} substitution${f.count === 1 ? '' : 's'}` : undefined}
							>
								<span class="font-mono text-fg">{f.tag}</span>
								<span class="text-fg-muted">·</span>
								<span class="text-fg-muted">{f.label}</span>
								{#if f.count !== undefined}
									<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
										·{f.count}
									</span>
								{/if}
							</span>
						{/each}
					</div>
				{/each}
			</div>
			<!-- CSS snippet for designers embedding via @font-face. Includes
			     the @font-face rule + a feature-settings example with every
			     non-default-on feature so designers see what's available.
			     One-click copy lands the whole thing on the clipboard. -->
			<details class="mt-3 rounded-md border border-border bg-surface-2/30">
				<summary class="cursor-pointer px-3 py-2 text-[11px] font-medium text-fg-muted hover:text-fg">
					CSS embed snippet
				</summary>
				<div class="relative">
					<button
						type="button"
						onclick={copySnippet}
						class="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[10px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-fg"
						title="Copy snippet to clipboard"
					>
						{#if snippetCopied}
							<Check class="size-3" />
							<span>Copied</span>
						{:else}
							<Copy class="size-3" />
							<span>Copy</span>
						{/if}
					</button>
					<pre
						class="overflow-x-auto border-t border-border bg-canvas/60 px-3 py-3 pr-20 font-mono text-[11px] leading-relaxed text-fg"><code
							>{cssSnippet}</code></pre>
				</div>
			</details>
		</section>
	{/if}

	<!-- Coverage heatmap — visualizes drawn vs not-drawn across the
	     baseline character sets a "complete" Latin font would ship.
	     Each cell is one codepoint; color encodes status (drawn / WIP /
	     empty). Click a drawn cell to inspect it. The section gives
	     designer-friends a quick "is this font ready?" read without
	     having to scan the full glyph grid below. Lazy-mounted — ~120
	     cells, each a styled button. -->
	<LazySection minHeight={500} forceMount={printRequested}>
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Coverage</span>
			<span class="font-mono normal-case text-fg-subtle" data-numeric>
				{coverageOverall.drawn}/{coverageOverall.total} · {coverageOverall.percent}%
			</span>
		</h2>
		<div class="space-y-3 rounded-md border border-border bg-canvas px-5 py-5">
			{#each coverageRows as row (row.id)}
				<div>
					<div class="mb-1.5 flex items-baseline justify-between text-[11px]">
						<span class="text-fg-muted">{row.label}</span>
						<span class="font-mono text-fg-subtle" data-numeric>
							{row.drawnCount}/{row.total}
						</span>
					</div>
					<div class="flex flex-wrap gap-0.5">
						{#each row.cells as cell (cell.cp)}
							<button
								type="button"
								onclick={() => cell.drawn && openInspector(cell.cp)}
								disabled={!cell.drawn}
								class="inline-flex h-6 w-6 items-center justify-center rounded-sm border text-[11px] transition-colors {cell.drawn
									? cell.wip
										? 'border-amber-500/40 bg-amber-500/20 text-fg hover:bg-amber-500/30'
										: 'border-accent/30 bg-accent-soft/30 text-fg hover:bg-accent-soft/60'
									: 'border-border bg-surface-2/30 text-fg-subtle/40'}"
								title={`U+${cell.cp
									.toString(16)
									.toUpperCase()
									.padStart(4, '0')} · ${cell.char} · ${
									cell.drawn ? (cell.wip ? 'in progress' : 'final') : 'not drawn'
								}`}
								aria-label="{cell.char} {cell.drawn ? 'drawn' : 'not drawn'}"
							>
								{cell.char}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Cells colored by status — accent = drawn, amber = WIP, dim = not drawn. Click any drawn cell to inspect.
		</p>
	</section>
	</LazySection>

	<!-- Drawn glyph grid. Counts give context for the work-in-progress
	     state without spilling into editor chrome. Filter input +
	     category pills let visitors scope the grid to letters / numbers
	     / punctuation / marks / alternates / composites, or search by
	     name / codepoint / tag / character. Inspector navigation
	     respects the filter so arrow keys walk only the visible set.
	     Lazy-mounted — every tile renders its own SVG (≈80 of them for
	     the demo), the heaviest single section on the page. -->
	<LazySection minHeight={600} forceMount={printRequested}>
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Glyphs</span>
			<span class="font-mono normal-case text-fg-subtle" data-numeric>
				{visibleGlyphs.length}{visibleGlyphs.length !== drawnGlyphs.length
					? ` of ${drawnGlyphs.length}`
					: ''} drawn · {Object.keys(project.glyphs).length} total
			</span>
		</h2>
		<div data-print-hide class="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
			<input
				type="search"
				bind:value={glyphFilter}
				placeholder="Search name, U+, char, tag…"
				class="w-48 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-fg outline-none focus:border-accent"
				aria-label="Filter glyphs"
			/>
			{#each glyphCategories as cat (cat.id)}
				{@const on = glyphCategory === cat.id}
				<button
					type="button"
					onclick={() => (glyphCategory = on ? null : cat.id)}
					class="rounded-md border px-2 py-0.5 transition-colors {on
						? 'border-accent bg-accent-soft/40 text-fg'
						: 'border-border bg-surface text-fg-muted hover:border-accent/60'}"
				>
					{cat.label}
				</button>
			{/each}
			{#if glyphFilter || glyphCategory}
				<button
					type="button"
					onclick={() => {
						glyphFilter = '';
						glyphCategory = null;
					}}
					class="ml-1 text-[10px] text-fg-subtle hover:text-fg"
				>
					clear
				</button>
			{/if}
		</div>
		{#if drawnGlyphs.length === 0}
			<p class="rounded border border-border bg-surface-2/40 p-6 text-center text-[13px] text-fg-muted">
				No glyphs drawn yet.
			</p>
		{:else if visibleGlyphs.length === 0}
			<p class="rounded border border-border bg-surface-2/40 p-6 text-center text-[13px] text-fg-muted">
				No glyphs match the current filter.
			</p>
		{:else}
			<div class="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
				{#each visibleGlyphs as g (g.codepoint)}
					<GlyphTile
						glyph={g}
						size={48}
						showLabel={false}
						{ascender}
						{descender}
						colorPalette={palette}
						onclick={() => openInspector(g.codepoint)}
					/>
				{/each}
			</div>
			<p class="mt-2 text-[11px] text-fg-subtle">
				Click any glyph to inspect — see the contours at size with metric guides, sidebearings, anchors, and notes.
			</p>
		{/if}
	</section>
	</LazySection>

	<!-- Metadata footer — vendor + license info so the recipient
	     understands the legal context of what they're looking at. -->
	<footer class="border-t border-border pt-6 text-[12px] leading-relaxed text-fg-muted">
		<dl class="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					Version
				</dt>
				<dd class="font-mono text-fg" data-numeric>{project.metadata.version}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					License
				</dt>
				<dd class="text-fg">{project.metadata.license || '—'}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					Vendor
				</dt>
				<dd class="font-mono text-fg" data-numeric>{project.metadata.vendorID || '—'}</dd>
			</div>
		</dl>
		{#if project.metadata.copyright}
			<p class="mt-4 text-fg-muted">{project.metadata.copyright}</p>
		{/if}
	</footer>

	<div class="mt-10" data-print-hide>
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
		>
			<ArrowLeft class="size-3" />
			Back to studio
		</a>
	</div>
</div>

<!-- Glyph inspector — modal-style sheet that opens when a tile is
     clicked. Big render with metric guides + everything a designer
     wants to see about the drawing. Arrow keys to step through the
     drawn glyphs, Esc closes. -->
<svelte:window onkeydown={onInspectorKey} />
{#if inspectedGlyph && inspectedBounds}
	{@const advance = inspectedGlyph.advanceWidth}
	{@const lsb = inspectedBounds.minX}
	{@const rsb = advance - inspectedBounds.maxX}
	{@const anchorCount = inspectedGlyph.anchors?.length ?? 0}
	{@const layerCount = inspectedGlyph.colorLayers?.length ?? 0}
	{@const inspectorPad = Math.max(48, Math.round(advance * 0.05))}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default bg-canvas/70 backdrop-blur-sm"
		onclick={closeInspector}
		aria-label="Close inspector"
		tabindex="-1"
	></button>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Glyph {inspectedGlyph.name} inspector"
		class="fixed left-1/2 top-1/2 z-50 w-[min(820px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface shadow-2xl"
	>
		<header class="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
			<div class="min-w-0">
				<h3 class="truncate text-[14px] font-semibold text-fg">{inspectedGlyph.name}</h3>
				<p class="font-mono text-[11px] text-fg-subtle" data-numeric>
					U+{inspectedGlyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}
					{#if inspectedGlyph.codepoint >= 0x20 && inspectedGlyph.codepoint < 0x10000}
						· {String.fromCodePoint(inspectedGlyph.codepoint)}
					{/if}
					· {inspectedIndex !== null ? inspectedIndex + 1 : '?'}/{visibleGlyphs.length}
				</p>
			</div>
			<div class="flex items-center gap-1">
				{#if (project.masters?.length ?? 0) > 0}
					<button
						type="button"
						onclick={() => (inspectorOverlayMasters = !inspectorOverlayMasters)}
						class="rounded border px-2 py-1 text-[11px] transition-colors {inspectorOverlayMasters
							? 'border-accent bg-accent-soft/40 text-fg'
							: 'border-border bg-surface text-fg-muted hover:border-accent/60 hover:text-fg'}"
						title="Overlay other masters as stroke outlines (M)"
					>
						Masters
					</button>
				{/if}
				<button
					type="button"
					onclick={copyInspectorLink}
					class="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[11px] text-fg-muted hover:border-accent hover:text-fg"
					title="Copy a direct link to this glyph"
				>
					{#if linkCopied}
						<Check class="size-3" />
						<span>Copied</span>
					{:else}
						<Link2 class="size-3" />
						<span>Link</span>
					{/if}
				</button>
				<button
					type="button"
					onclick={() => stepInspector(-1)}
					class="rounded border border-border bg-surface px-2 py-1 text-[11px] text-fg-muted hover:border-accent hover:text-fg"
					title="Previous glyph (←)"
				>
					←
				</button>
				<button
					type="button"
					onclick={() => stepInspector(1)}
					class="rounded border border-border bg-surface px-2 py-1 text-[11px] text-fg-muted hover:border-accent hover:text-fg"
					title="Next glyph (→)"
				>
					→
				</button>
				<button
					type="button"
					onclick={closeInspector}
					class="rounded border border-border bg-surface p-1.5 text-fg-muted hover:border-accent hover:text-fg"
					title="Close (Esc)"
					aria-label="Close inspector"
				>
					<X class="size-3.5" />
				</button>
			</div>
		</header>
		<div class="grid gap-5 px-5 py-5 sm:grid-cols-[2fr_1fr]">
			<!-- Big render with metric guides. Sidebearings tinted to make
			     them legible against the contour fill. -->
			<div class="rounded-md border border-border bg-canvas px-4 py-4">
				<svg
					viewBox="{-inspectorPad} {descender - 80} {advance + inspectorPad * 2} {fontSpan + 160}"
					preserveAspectRatio="xMidYMid meet"
					style="width: 100%; height: auto; transform: scaleY(-1); display: block;"
					aria-label="{inspectedGlyph.name} large render"
				>
					<!-- Metric guides -->
					<g stroke="currentColor" stroke-width="2" class="text-fg-subtle/40">
						<line x1={-inspectorPad} y1={0} x2={advance + inspectorPad} y2={0} />
						<line
							x1={-inspectorPad}
							y1={ascender}
							x2={advance + inspectorPad}
							y2={ascender}
						/>
						<line
							x1={-inspectorPad}
							y1={descender}
							x2={advance + inspectorPad}
							y2={descender}
						/>
						{#if project.metrics.capHeight}
							<line
								x1={-inspectorPad}
								y1={project.metrics.capHeight}
								x2={advance + inspectorPad}
								y2={project.metrics.capHeight}
								stroke-dasharray="20 20"
							/>
						{/if}
						{#if project.metrics.xHeight}
							<line
								x1={-inspectorPad}
								y1={project.metrics.xHeight}
								x2={advance + inspectorPad}
								y2={project.metrics.xHeight}
								stroke-dasharray="20 20"
							/>
						{/if}
					</g>
					<!-- Advance box -->
					<g stroke="currentColor" stroke-width="2" fill="none" class="text-accent/40">
						<line x1={0} y1={descender - 60} x2={0} y2={ascender + 60} />
						<line
							x1={advance}
							y1={descender - 60}
							x2={advance}
							y2={ascender + 60}
						/>
					</g>
					<!-- Sidebearing shading -->
					{#if lsb > 0}
						<rect
							x={0}
							y={descender}
							width={lsb}
							height={fontSpan}
							fill="currentColor"
							class="text-accent/5"
						/>
					{/if}
					{#if rsb > 0}
						<rect
							x={inspectedBounds.maxX}
							y={descender}
							width={rsb}
							height={fontSpan}
							fill="currentColor"
							class="text-accent/5"
						/>
					{/if}
					<!-- The glyph itself -->
					<path
						d={contoursToSvgPath(inspectedFlatContours)}
						fill="currentColor"
						fill-rule="evenodd"
						class="text-fg"
					/>
					<!-- Master overlays — each non-default master rendered as a
					     stroke outline so the slant/weight delta is visible on
					     top of the default outline. Stroke-only so fills don't
					     fight; the badge legend below tells masters apart. -->
					{#each inspectorMasterOverlays as ov (ov.id)}
						<path
							d={ov.path}
							fill="none"
							stroke="currentColor"
							stroke-width={Math.max(10, Math.round(fontSpan / 120))}
							class="text-accent"
						/>
					{/each}
					<!-- Anchor-attachment preview — render every matched mark
					     first so it sits UNDER the anchor markers and the
					     base contour (the base path is already laid down
					     above; this prints between the base and the dots). -->
					{#each inspectorAnchorMarks as p (p.id)}
						<path
							d={p.path}
							transform="translate({p.dx} {p.dy})"
							fill="currentColor"
							fill-rule="evenodd"
							opacity="0.4"
							class="text-accent"
						/>
					{/each}
					<!-- Anchors as small markers with name labels. The SVG
					     has scaleY(-1) at the root, so each label group
					     needs to flip back to render text upright. Label
					     offset (40 UPM right + slight vertical nudge) is
					     a unit that works across UPM scales since we're
					     in font-space, not pixels. -->
					{#each inspectedGlyph.anchors ?? [] as a (a.name)}
						<g transform="translate({a.x} {a.y})">
							<circle r={24} fill="currentColor" class="text-accent" />
							<g transform="scale(1 -1)">
								<text
									x={36}
									y={6}
									font-size={60}
									font-family="ui-monospace, monospace"
									fill="currentColor"
									class="text-accent-strong"
								>{a.name}</text>
							</g>
						</g>
					{/each}
				</svg>
				{#if inspectorOverlayMasters && inspectorMasterOverlays.length > 0}
					<div
						class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-fg-subtle"
					>
						<span class="inline-flex items-center gap-1.5">
							<span class="inline-block size-2 rounded-sm bg-fg"></span>
							<span>Default ({project.metadata.styleName || 'Regular'})</span>
						</span>
						{#each inspectorMasterOverlays as ov (ov.id)}
							<span class="inline-flex items-center gap-1.5">
								<span class="inline-block size-2 rounded-sm border-2 border-accent"></span>
								<span>{ov.name}</span>
							</span>
						{/each}
					</div>
				{:else if inspectorOverlayMasters && inspectorMasterOverlays.length === 0}
					<p class="mt-2 text-[10px] text-fg-subtle">
						No master overrides for this codepoint — every master falls back to the default drawing.
					</p>
				{/if}
			</div>
			<!-- Sidebar — facts a designer wants. Number columns are
			     monospace and right-aligned (via data-numeric) so they
			     compare cleanly when stepping through glyphs. -->
			<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-fg-muted">
				<dt class="text-fg-subtle">Advance</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{advance}</dd>
				<dt class="text-fg-subtle">LSB</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{lsb}</dd>
				<dt class="text-fg-subtle">RSB</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{rsb}</dd>
				<dt class="text-fg-subtle">Contours</dt>
				<dd class="text-right font-mono text-fg" data-numeric>
					{inspectedFlatContours.length}{inspectedGlyph.contours.length === 0 &&
					(inspectedGlyph.components?.length ?? 0) > 0
						? ' (composite)'
						: ''}
				</dd>
				<dt class="text-fg-subtle">Anchors</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{anchorCount}</dd>
				{#if inspectorAnchorMarks.length > 0}
					<dt class="col-span-2 mt-2 border-t border-border pt-2 text-fg-subtle">
						Attaches
					</dt>
					<dd class="col-span-2 -mt-1 flex flex-wrap gap-1">
						{#each inspectorAnchorMarks as p (p.id)}
							<span
								class="inline-flex items-center gap-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg"
							>
								<span class="text-accent">{p.baseAnchor}</span>
								<span class="text-fg-subtle">→</span>
								<span>{p.markName}</span>
							</span>
						{/each}
					</dd>
				{/if}
				{#if layerCount > 0}
					<dt class="text-fg-subtle">Color layers</dt>
					<dd class="text-right font-mono text-fg" data-numeric>{layerCount}</dd>
				{/if}
				<dt class="col-span-2 mt-2 border-t border-border pt-2 text-fg-subtle">Status</dt>
				<dd class="col-span-2 -mt-1 font-mono uppercase text-fg">
					{inspectedGlyph.status}
				</dd>
				{#if inspectedGlyph.tags && inspectedGlyph.tags.length > 0}
					<dt class="col-span-2 mt-2 border-t border-border pt-2 text-fg-subtle">Tags</dt>
					<dd class="col-span-2 -mt-1 flex flex-wrap gap-1">
						{#each inspectedGlyph.tags as t (t)}
							<span
								class="inline-block rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg"
							>
								#{t}
							</span>
						{/each}
					</dd>
				{/if}
				{#if inspectedGlyph.notes}
					<dt class="col-span-2 mt-2 border-t border-border pt-2 text-fg-subtle">Notes</dt>
					<dd class="col-span-2 -mt-1 text-fg whitespace-pre-wrap">
						{inspectedGlyph.notes}
					</dd>
				{/if}
			</dl>
		</div>
		<footer
			class="border-t border-border bg-surface-2/40 px-5 py-2 text-[10px] text-fg-subtle"
		>
			<span class="font-mono">←/→</span> step ·
			{#if (project.masters?.length ?? 0) > 0}
				<span class="font-mono">m</span> masters ·
			{/if}
			<span class="font-mono">esc</span> close
		</footer>
	</div>
{/if}

<style>
	/* Print specimen — designers expect a single-click PDF specimen
	   from a foundry page. Cmd+P (or the Specimen button) produces a
	   clean sheet without the app chrome.

	   The page is paginated by the browser; we keep section boundaries
	   soft (page-break-inside: avoid) so a glyph grid or waterfall
	   isn't sliced mid-block. The inspector modal is positioned fixed
	   and would inherit the viewport on print, so it's force-hidden. */
	@media print {
		[data-print-hide] {
			display: none !important;
		}
		[data-print-only] {
			display: block !important;
		}
		/* Modal/backdrop layers should never appear on the printed sheet
		   regardless of state — they're position:fixed and would land on
		   every page. */
		[role='dialog'][aria-modal='true'],
		[aria-label='Close inspector'] {
			display: none !important;
		}
		@page {
			margin: 18mm 14mm;
		}
		:global(html),
		:global(body) {
			background: white !important;
			color: black !important;
		}
		/* Tailwind utility classes that resolve to themed colors override
		   the page reset above, so force the most common surface tokens
		   back to black-on-white for the printed sheet. The SVGs inherit
		   currentColor so this also resets the glyph fills. */
		:global(.text-fg),
		:global(.text-fg-muted),
		:global(.text-fg-subtle),
		:global(.text-accent) {
			color: black !important;
		}
		:global(.bg-canvas),
		:global(.bg-surface),
		:global(.bg-surface-2),
		:global(.bg-surface-2\/40),
		:global(.bg-surface-2\/60) {
			background: transparent !important;
		}
		:global(.border-border),
		:global(.border-accent) {
			border-color: black !important;
		}
		section {
			page-break-inside: avoid;
			break-inside: avoid;
		}
		/* Headlines keep with the next section so a label doesn't orphan
		   at the bottom of a page. */
		h1,
		h2,
		h3 {
			page-break-after: avoid;
			break-after: avoid;
		}
	}
</style>
