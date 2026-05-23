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

	let { data } = $props();
	const project = $derived(data.project);
	// Pass the project's default palette so color/gradient layers
	// render in the glyph tiles. When no palette exists, tiles fall
	// back to monochrome outlines.
	const palette = $derived(defaultPalette(project.palettes));

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

	// Glyph grid: only show drawn glyphs (skip empty placeholders),
	// sorted by codepoint for a stable order.
	const drawnGlyphs = $derived(
		Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint)
	);

	const ascender = $derived(project.metrics.ascender);
	const descender = $derived(project.metrics.descender);

	// Live typesetting — visitor types any text, we render it inline
	// using the project's own SVG paths. Kerning pairs from the
	// project apply automatically so visitors see the font as the
	// designer intended (not as system-fallback substitutes).
	let typeText = $state('Type something here');
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
	// Resolve a glyph in the context of a chosen master — overrides win,
	// project glyph is the fallback. Mirrors the export pipeline's lookup
	// so what visitors preview matches what they'd download. Hoisted up
	// here so the typeset + waterfall + master-compare rows all share it.
	const resolveGlyphForMaster = (cp: number, masterId: string | undefined) => {
		if (masterId) {
			const m = project.masters?.find((x) => x.id === masterId);
			const ov = m?.glyphs?.[cp];
			if (ov && ov.contours.length > 0) return ov;
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
			const next = featureSubMaps.get(f.feature)?.get(name);
			if (next) name = next;
		}
		if (name === g.name) return g;
		return glyphByName.get(name) ?? g;
	};
	const toggleFeature = (tag: string) => {
		const next = new Set(activeFeatures);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		activeFeatures = next;
	};

	// Inspector — derived view of the currently-inspected glyph.
	const inspectedGlyph = $derived(
		inspectedIndex !== null ? (drawnGlyphs[inspectedIndex] ?? null) : null
	);
	const inspectedBounds = $derived(
		inspectedGlyph ? glyphBounds(inspectedGlyph.contours) : null
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
	const openInspector = (cp: number) => {
		const idx = drawnGlyphs.findIndex((g) => g.codepoint === cp);
		if (idx >= 0) inspectedIndex = idx;
	};
	const closeInspector = () => (inspectedIndex = null);
	const stepInspector = (delta: number) => {
		if (inspectedIndex === null) return;
		const n = drawnGlyphs.length;
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
			const base = resolveGlyphForMaster(cp, tryMasterId);
			const g = applyFeatures(base);
			if (!g || g.contours.length === 0) {
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
				char: ch,
				path: contoursToSvgPath(g.contours),
				advance: g.advanceWidth,
				x,
				colorPlan
			});
			x += g.advanceWidth + tryTracking;
			if (i + 1 < codepoints.length) {
				const nextCp = codepoints[i + 1].codePointAt(0) ?? 0;
				const kv = kerningLookup.get(`${cp},${nextCp}`);
				if (kv !== undefined) x += kv;
			}
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
		masterId: string | undefined = undefined
	): { glyphs: typeof typeset.glyphs; totalWidth: number } => {
		const out: typeof typeset.glyphs = [];
		let x = 0;
		const codepoints = [...text];
		for (let i = 0; i < codepoints.length; i++) {
			const ch = codepoints[i];
			const cp = ch.codePointAt(0) ?? 0;
			const g = resolveGlyphForMaster(cp, masterId);
			if (!g || g.contours.length === 0) {
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ id: `${i}-${cp}`, char: ch, path: '', advance: w, x, colorPlan: [] });
				x += w;
				continue;
			}
			out.push({
				id: `${i}-${cp}`,
				char: ch,
				path: contoursToSvgPath(g.contours),
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
		masterId: string | undefined
	): { lines: LaidOutLine[]; totalHeight: number } => {
		const words = text.split(/\s+/).filter(Boolean);
		// Per-word layout — codepoints + kerning, no space prefix.
		const wordRows = words.map((w) => computeRow(w, masterId));
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
		if (project.features.kern) out.push({ tag: 'kern', label: 'Kerning' });
		if (project.features.liga) out.push({ tag: 'liga', label: 'Standard ligatures' });
		const disabled = new Set(project.features.disabledAutoFeatures ?? []);
		const autoOn = project.features.autoFeatures !== false;
		if (autoOn) {
			for (const f of detectFeatures(project.glyphs)) {
				if (disabled.has(f.feature)) continue;
				out.push({ tag: f.feature, label: featureLabel(f.feature), count: f.subs.length });
			}
		}
		return out;
	});

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
	     og:image points at the prerendered /og.png (Font Studio brand
	     image). A project-specific dynamic OG would need a server-side
	     project store which doesn't exist today — IndexedDB lives client-
	     side. The brand image is better than no image for unfurl preview. -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={shareDesc} />
	<meta property="og:site_name" content="Font Studio" />
	<meta property="og:image" content="/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={shareDesc} />
	<meta name="twitter:image" content="/og.png" />
</svelte:head>

<div class="mx-auto max-w-4xl px-6 py-8">
	<!-- Read-only banner — clarifies what the route is for. -->
	<div
		class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase text-fg-muted"
	>
		<Eye class="size-3" />
		<span>Shared view · read-only</span>
	</div>

	<header class="mb-8 flex items-start justify-between gap-4">
		<div>
			<h1
				class="text-[36px] leading-tight tracking-tight text-fg"
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
		<div class="flex shrink-0 flex-col items-end gap-2">
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
		<div class="mb-6 rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger-strong">
			Download failed: {downloadError}
		</div>
	{/if}

	<!-- Live typeset preview. Renders typed text using the project's
	     own SVG paths + kerning data, so visitors see the WIP font
	     as the designer intended. Master/size/tracking controls give
	     designers a real foundry-style "tester" — they can audition
	     the type at the size and rhythm they actually need. -->
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Try it</span>
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
			<div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
				<span class="text-fg-subtle">Features</span>
				{#each detectedFeatures as f (f.feature)}
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
			<div class="flex flex-wrap gap-1.5">
				{#each sharedFeatures as f (f.tag)}
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

	<!-- Drawn glyph grid. Counts give context for the work-in-progress
	     state without spilling into editor chrome. -->
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Glyphs</span>
			<span class="font-mono normal-case text-fg-subtle" data-numeric>
				{drawnGlyphs.length} drawn · {Object.keys(project.glyphs).length} total
			</span>
		</h2>
		{#if drawnGlyphs.length === 0}
			<p class="rounded border border-border bg-surface-2/40 p-6 text-center text-[13px] text-fg-muted">
				No glyphs drawn yet.
			</p>
		{:else}
			<div class="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
				{#each drawnGlyphs as g (g.codepoint)}
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

	<div class="mt-10">
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
					· {inspectedIndex !== null ? inspectedIndex + 1 : '?'}/{drawnGlyphs.length}
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
						d={contoursToSvgPath(inspectedGlyph.contours)}
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
					<!-- Anchors as small markers -->
					{#each inspectedGlyph.anchors ?? [] as a (a.name)}
						<g transform="translate({a.x} {a.y})">
							<circle r={24} fill="currentColor" class="text-accent" />
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
					{inspectedGlyph.contours.length}
				</dd>
				<dt class="text-fg-subtle">Anchors</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{anchorCount}</dd>
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
