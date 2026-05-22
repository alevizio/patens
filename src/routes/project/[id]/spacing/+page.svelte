<script lang="ts">
	import { page } from '$app/state';
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { SCRIPT_PACKS } from '$lib/font/charsets';
	import { isClassRef, type KerningSide } from '$lib/font/types';
	import { contoursToSvgPath, glyphBounds } from '$lib/font/path';
	import { detectStemWidths } from '$lib/font/stem-detect';
	import { measureSpacing, suggestSpacingFromReference } from '$lib/font/spacing';
	import type { SpacingMeasurement } from '$lib/font/spacing';
	import { sampleGlyphSilhouette } from '$lib/font/silhouette';
	import { suggestKerning } from '$lib/font/kerning-suggest';
	import { CANONICAL_LATIN_PAIRS } from '$lib/ai/kerning-suggest-core';
	import {
		suggestSidebearingClasses,
		type SidebearingMeasurement,
		type SuggestedSidebearingClass
	} from '$lib/font/sb-classes';
	import Panel from '$lib/ui/Panel.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Globe from '@lucide/svelte/icons/globe';
	import Group from '@lucide/svelte/icons/group';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Loader from '@lucide/svelte/icons/loader-2';
	import { settings } from '$lib/stores/settings.svelte';
	import {
		requestKerningProposal,
		buildPairsToEvaluate,
		sideLabel as kerningSideLabel,
		type KerningProposal,
		type KerningSuggestion
	} from '$lib/ai/kerning-suggest';
	import { AnthropicError } from '$lib/ai/anthropic';

	// Must be declared up here, before any $state/$derived that closes over it.
	// Previously sat at ~line 145, which put it in TDZ when the earlier
	// $derived helpers tried to evaluate during component init → silently
	// failed → /spacing route would not finish mounting, so tab clicks landing
	// there appeared to "do nothing".
	const project = $derived(projectStore.project);

	const COMMON_PAIRS: [string, string][] = [
		['A', 'V'], ['A', 'T'], ['A', 'W'], ['A', 'Y'],
		['T', 'a'], ['T', 'o'], ['T', 'e'], ['T', 'r'],
		['V', 'a'], ['V', 'o'], ['V', 'e'],
		['W', 'a'], ['W', 'o'], ['W', 'e'],
		['L', 'T'], ['L', 'V'], ['L', 'Y'],
		['P', 'a'], ['P', 'o'], ['P', 'e'],
		['F', 'a'], ['F', 'o'], ['Y', 'o'], ['Y', 'a']
	];

	// URL ?left=X / ?right=Y seeds let other surfaces deep-link the spacing
	// page to a specific pair context (e.g. the editor's Kerning panel
	// passing the current glyph). Only honoured when the query value is a
	// single printable character — guards against junk URLs setting bad
	// state.
	const initChar = (key: string, fallback: string): string => {
		const q = page.url.searchParams.get(key);
		if (q && [...q].length === 1 && (q.codePointAt(0) ?? 0) > 0x20) return q;
		return fallback;
	};
	let leftChar = $state(initChar('left', 'A'));
	let rightChar = $state(initChar('right', 'V'));

	// ---------- Sidebearing classes ----------
	let newSbName = $state('');
	let newSbMembers = $state('');
	const parseMemberCodepoints = (s: string): number[] => {
		const result: number[] = [];
		for (const ch of s) {
			const cp = ch.codePointAt(0);
			if (cp && cp > 0x20) result.push(cp);
		}
		return Array.from(new Set(result));
	};
	const createSbClass = () => {
		const cps = parseMemberCodepoints(newSbMembers);
		if (cps.length === 0) {
			toast.warn('Add at least one character.');
			return;
		}
		projectStore.addSidebearingClass(newSbName, cps);
		newSbName = '';
		newSbMembers = '';
	};

	// font5.md: spacing as "stable text color across repeated patterns of stems,
	// rounds, diagonals, punctuation, and figures." These presets cover the
	// classic four-axis split.
	const SB_PRESETS: Array<{ name: string; chars: string }> = [
		{ name: 'Vertical stems (upper)', chars: 'HILMNEFTKBDPR' },
		{ name: 'Vertical stems (lower)', chars: 'hilmnbdpqkfr' },
		{ name: 'Rounds (upper)', chars: 'OCGQUS' },
		{ name: 'Rounds (lower)', chars: 'oceqsbdp' },
		{ name: 'Diagonals', chars: 'AVWXYKMN' },
		{ name: 'Figures', chars: '0123456789' }
	];
	const insertPreset = (preset: (typeof SB_PRESETS)[number]) => {
		newSbName = preset.name;
		newSbMembers = preset.chars;
	};
	const sbClassAvg = (members: number[]): { lsb: number; rsb: number } => {
		if (!project || members.length === 0) return { lsb: 0, rsb: 0 };
		let lsb = 0;
		let rsb = 0;
		let n = 0;
		for (const cp of members) {
			const g = project.glyphs[cp];
			if (!g) continue;
			lsb += g.leftSidebearing;
			rsb += g.rightSidebearing;
			n++;
		}
		return n > 0 ? { lsb: Math.round(lsb / n), rsb: Math.round(rsb / n) } : { lsb: 0, rsb: 0 };
	};
	let pairsOnlyDrawn = $state(true);
	const visiblePairs = $derived.by(() => {
		if (!pairsOnlyDrawn || !project) return COMMON_PAIRS;
		return COMMON_PAIRS.filter(([l, r]) => {
			const left = project.glyphs[l.codePointAt(0) ?? 0];
			const right = project.glyphs[r.codePointAt(0) ?? 0];
			return left?.contours.length && right?.contours.length;
		});
	});
	let pendingValue = $state(0);
	let newClassName = $state('@A_left');
	let newClassMembers = $state('A Á Â Ä À Å Ã');

	// ---------- Spacing playground ----------
	let playgroundText = $state('Hamburgefonts AVATAR To We La Pa\nQuick brown fox jumps over');
	let playgroundSize = $state(72);
	let playgroundLineHeight = $state(1.15);
	let playgroundTracking = $state(0); // em-based, scaled to 1000ths
	let playgroundKern = $state(true);
	let playgroundLiga = $state(true);
	let referenceFont = $state('');
	const REFERENCE_PRESETS = [
		{ id: '', label: 'Off' },
		{ id: 'Inter', label: 'Inter' },
		{ id: 'Helvetica Neue, Helvetica, Arial', label: 'Helvetica' },
		{ id: 'Georgia, Times, serif', label: 'Georgia' },
		{ id: 'ui-monospace, Menlo, monospace', label: 'Mono' },
		{ id: '-apple-system, system-ui, sans-serif', label: 'System UI' }
	];
	// briefReferenceFamilies declared below alongside the rest of the
	// $deriveds — moved out of the playground block to fix declaration order.
	const playgroundFeatures = $derived(
		`'kern' ${playgroundKern ? 1 : 0}, 'liga' ${playgroundLiga ? 1 : 0}`
	);

	// ---------- Auto-space (silhouette-area suggester) ----------
	// Uses the deterministic spacing.ts algorithm (HTLetterSpacer-style
	// area-normalised method). References: 'H' for caps, 'n' for lowercase.
	// Suggestions are NEVER auto-applied — the user reviews + confirms.
	type AutoSpaceSuggestion = {
		codepoint: number;
		char: string;
		category: 'uppercase' | 'lowercase';
		currentLsb: number;
		currentRsb: number;
		suggestedLsb: number;
		suggestedRsb: number;
		confidence: number;
	};
	let autoSpaceSuggestions = $state<AutoSpaceSuggestion[]>([]);
	let autoSpaceRunning = $state(false);
	let autoSpaceLastRun = $state<string | null>(null);

	const runAutoSpace = () => {
		if (!project || autoSpaceRunning) return;
		autoSpaceRunning = true;
		try {
			const metrics = project.metrics;
			const refH = project.glyphs[0x0048]; // H
			const refN = project.glyphs[0x006e]; // n
			const haveH = refH && refH.contours.length > 0;
			const haveN = refN && refN.contours.length > 0;
			if (!haveH && !haveN) {
				toast.error(
					'Auto-space needs a reference glyph drawn first — H for uppercase, n for lowercase.'
				);
				return;
			}

			// Measure references in their respective zones.
			let refMeasurementCaps: SpacingMeasurement | null = null;
			if (haveH) {
				refMeasurementCaps = measureSpacing(refH.contours, {
					bottom: 0,
					top: metrics.capHeight
				});
			}
			let refMeasurementLower: SpacingMeasurement | null = null;
			if (haveN) {
				refMeasurementLower = measureSpacing(refN.contours, {
					bottom: 0,
					top: metrics.xHeight
				});
			}

			const next: AutoSpaceSuggestion[] = [];
			for (const g of Object.values(project.glyphs)) {
				if (g.contours.length === 0) continue;
				if (g.codepoint === 0x0048 || g.codepoint === 0x006e) continue; // skip refs
				// Categorise by codepoint range — basic Latin only.
				let category: 'uppercase' | 'lowercase' | null = null;
				if (g.codepoint >= 0x0041 && g.codepoint <= 0x005a) category = 'uppercase';
				else if (g.codepoint >= 0x0061 && g.codepoint <= 0x007a) category = 'lowercase';
				if (!category) continue;
				const ref = category === 'uppercase' ? refMeasurementCaps : refMeasurementLower;
				const refGlyph = category === 'uppercase' ? refH : refN;
				if (!ref || !refGlyph) continue;
				const zoneTop = category === 'uppercase' ? metrics.capHeight : metrics.xHeight;
				const m = measureSpacing(g.contours, { bottom: 0, top: zoneTop });
				if (!m) continue;
				const suggestion = suggestSpacingFromReference(m, {
					measurement: ref,
					leftSidebearing: refGlyph.leftSidebearing,
					rightSidebearing: refGlyph.rightSidebearing
				});
				// Skip suggestions that match current sidebearings within 1 fu — no
				// point asking the user to confirm a no-op.
				if (
					Math.abs(suggestion.leftSidebearing - g.leftSidebearing) < 1 &&
					Math.abs(suggestion.rightSidebearing - g.rightSidebearing) < 1
				) {
					continue;
				}
				next.push({
					codepoint: g.codepoint,
					char: String.fromCodePoint(g.codepoint),
					category,
					currentLsb: g.leftSidebearing,
					currentRsb: g.rightSidebearing,
					suggestedLsb: suggestion.leftSidebearing,
					suggestedRsb: suggestion.rightSidebearing,
					confidence: suggestion.confidence
				});
			}
			next.sort((a, b) => a.codepoint - b.codepoint);
			autoSpaceSuggestions = next;
			autoSpaceLastRun = new Date().toLocaleTimeString();
			toast.success(`Auto-space: ${next.length} suggestion${next.length === 1 ? '' : 's'}.`);
		} catch (err) {
			toast.error('Auto-space failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			autoSpaceRunning = false;
		}
	};

	const applyAutoSpace = (only?: AutoSpaceSuggestion[]) => {
		const toApply = only ?? autoSpaceSuggestions;
		if (!project || toApply.length === 0) return;
		for (const s of toApply) {
			projectStore.updateGlyph(s.codepoint, (gg) => {
				const bboxW = Math.max(
					0,
					gg.advanceWidth - gg.leftSidebearing - gg.rightSidebearing
				);
				return {
					...gg,
					leftSidebearing: s.suggestedLsb,
					rightSidebearing: s.suggestedRsb,
					advanceWidth: s.suggestedLsb + bboxW + s.suggestedRsb
				};
			});
		}
		toast.success(
			`Applied auto-space to ${toApply.length} glyph${toApply.length === 1 ? '' : 's'}.`
		);
		autoSpaceSuggestions = autoSpaceSuggestions.filter((s) => !toApply.includes(s));
	};

	const dismissAutoSpaceSuggestion = (sug: AutoSpaceSuggestion) => {
		autoSpaceSuggestions = autoSpaceSuggestions.filter((s) => s !== sug);
	};

	// ---------- Auto-kern (silhouette-distance pair suggester) ----------
	// Walks the canonical Latin problem-pair list and computes a kerning
	// delta for each pair where both glyphs are drawn. Reference pair:
	// HH when the left glyph is uppercase, nn when lowercase. Same review
	// pattern as Auto-space — never auto-applied.
	type AutoKernSuggestion = {
		left: number;
		right: number;
		label: string; // e.g. "AV"
		current: number;
		suggested: number;
		naturalGap: number;
		targetGap: number;
		confidence: number;
	};
	let autoKernSuggestions = $state<AutoKernSuggestion[]>([]);
	let autoKernRunning = $state(false);
	let autoKernLastRun = $state<string | null>(null);

	const runAutoKern = () => {
		if (!project || autoKernRunning) return;
		autoKernRunning = true;
		try {
			const metrics = project.metrics;
			const refH = project.glyphs[0x0048];
			const refN = project.glyphs[0x006e];
			const haveH = refH && refH.contours.length > 0;
			const haveN = refN && refN.contours.length > 0;
			if (!haveH && !haveN) {
				toast.error(
					'Auto-kern needs a reference pair: draw H (caps) or n (lowercase) first.'
				);
				return;
			}

			// Pre-compute silhouettes for the references over the full y-range.
			const SAMPLES = 128;
			const yBottom = metrics.descender;
			const yTop = metrics.ascender;
			const sampleZone = { samples: SAMPLES };
			const refHSilhouette = haveH
				? sampleGlyphSilhouette(refH.contours, yBottom, yTop, sampleZone)
				: null;
			const refNSilhouette = haveN
				? sampleGlyphSilhouette(refN.contours, yBottom, yTop, sampleZone)
				: null;

			// Cache per-glyph silhouettes since CANONICAL_LATIN_PAIRS reuses
			// the same glyph across many pairs.
			const silCache = new Map<number, ReturnType<typeof sampleGlyphSilhouette>>();
			const getSil = (cp: number) => {
				let s = silCache.get(cp);
				if (s) return s;
				const g = project.glyphs[cp];
				if (!g || g.contours.length === 0) return null;
				s = sampleGlyphSilhouette(g.contours, yBottom, yTop, sampleZone);
				silCache.set(cp, s);
				return s;
			};

			const next: AutoKernSuggestion[] = [];
			for (const [left, right] of CANONICAL_LATIN_PAIRS) {
				const gL = project.glyphs[left];
				const gR = project.glyphs[right];
				if (!gL || !gR || gL.contours.length === 0 || gR.contours.length === 0) continue;
				const silL = getSil(left);
				const silR = getSil(right);
				if (!silL || !silR) continue;
				// Reference: HH if the left is uppercase, nn otherwise.
				const isUppercaseLeft = left >= 0x0041 && left <= 0x005a;
				const refSil = isUppercaseLeft ? refHSilhouette : refNSilhouette;
				const refGlyph = isUppercaseLeft ? refH : refN;
				if (!refSil || !refGlyph) continue;
				const suggestion = suggestKerning(
					{ silhouette: silL, advanceWidth: gL.advanceWidth },
					{ silhouette: silR, advanceWidth: gR.advanceWidth },
					{
						left: { silhouette: refSil, advanceWidth: refGlyph.advanceWidth },
						right: { silhouette: refSil, advanceWidth: refGlyph.advanceWidth }
					}
				);
				if (!suggestion) continue;
				// Find existing kerning value (if any).
				const existing = project.kerning.find(
					(k) => k.left === left && k.right === right
				);
				const current = existing?.value ?? 0;
				// Skip suggestions within 2 fu of current — no point asking the
				// user to confirm tiny adjustments below typical typographic
				// noise.
				if (Math.abs(suggestion.delta - current) < 2) continue;
				next.push({
					left,
					right,
					label: String.fromCodePoint(left) + String.fromCodePoint(right),
					current,
					suggested: suggestion.delta,
					naturalGap: suggestion.naturalGap,
					targetGap: suggestion.targetGap,
					confidence: suggestion.confidence
				});
			}
			// Sort by absolute delta from current — biggest changes first.
			next.sort((a, b) => Math.abs(b.suggested - b.current) - Math.abs(a.suggested - a.current));
			autoKernSuggestions = next;
			autoKernLastRun = new Date().toLocaleTimeString();
			toast.success(`Auto-kern: ${next.length} suggestion${next.length === 1 ? '' : 's'}.`);
		} catch (err) {
			toast.error('Auto-kern failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			autoKernRunning = false;
		}
	};

	const applyAutoKern = (only?: AutoKernSuggestion[]) => {
		const toApply = only ?? autoKernSuggestions;
		if (!project || toApply.length === 0) return;
		for (const s of toApply) {
			projectStore.upsertKerningPair({
				left: s.left,
				right: s.right,
				value: s.suggested
			});
		}
		toast.success(
			`Applied auto-kern to ${toApply.length} pair${toApply.length === 1 ? '' : 's'}.`
		);
		autoKernSuggestions = autoKernSuggestions.filter((s) => !toApply.includes(s));
	};

	const dismissAutoKernSuggestion = (sug: AutoKernSuggestion) => {
		autoKernSuggestions = autoKernSuggestions.filter((s) => s !== sug);
	};

	// ---------- Audit-kern (collision detector) ----------
	// Walks existing kerning pairs PLUS the canonical Latin pair list and
	// computes the visible gap after kerning is applied. Flags pairs whose
	// gap drops below `threshold * UPM` — by default 1% UPM = 10 fu in a
	// 1000-UPM font. Severity tiers:
	//   - collision (gap ≤ 0): ink overlap, fix immediately
	//   - tight (gap < threshold/2): visually crowded
	//   - close (gap < threshold): worth a look
	type AuditFinding = {
		left: number;
		right: number;
		label: string;
		kerning: number;
		naturalGap: number;
		visibleGap: number;
		severity: 'collision' | 'tight' | 'close';
	};
	let auditFindings = $state<AuditFinding[]>([]);
	let auditRunning = $state(false);
	let auditLastRun = $state<string | null>(null);
	let auditThresholdPct = $state(1.0); // % of UPM

	const runAuditKern = () => {
		if (!project || auditRunning) return;
		auditRunning = true;
		try {
			const metrics = project.metrics;
			const upm = metrics.unitsPerEm;
			const threshold = Math.round((upm * auditThresholdPct) / 100);
			const SAMPLES = 128;
			const silCache = new Map<number, ReturnType<typeof sampleGlyphSilhouette>>();
			const getSil = (cp: number) => {
				let s = silCache.get(cp);
				if (s) return s;
				const g = project.glyphs[cp];
				if (!g || g.contours.length === 0) return null;
				s = sampleGlyphSilhouette(g.contours, metrics.descender, metrics.ascender, {
					samples: SAMPLES
				});
				silCache.set(cp, s);
				return s;
			};

			// Collect candidate pairs: existing kerning + canonical Latin.
			// Skip class-references (they need a different model).
			const seen = new Set<string>();
			const candidates: Array<[number, number, number]> = []; // [L, R, kernValue]
			for (const k of project.kerning) {
				if (typeof k.left === 'string' || typeof k.right === 'string') continue;
				const key = `${k.left}/${k.right}`;
				if (seen.has(key)) continue;
				seen.add(key);
				candidates.push([k.left, k.right, k.value]);
			}
			for (const [l, r] of CANONICAL_LATIN_PAIRS) {
				const key = `${l}/${r}`;
				if (seen.has(key)) continue;
				seen.add(key);
				candidates.push([l, r, 0]); // not kerned yet
			}

			const findings: AuditFinding[] = [];
			for (const [l, r, kern] of candidates) {
				const gL = project.glyphs[l];
				const gR = project.glyphs[r];
				if (!gL || !gR || gL.contours.length === 0 || gR.contours.length === 0) continue;
				const silL = getSil(l);
				const silR = getSil(r);
				if (!silL || !silR) continue;
				// Compute natural gap inline (pairGap formula).
				let naturalGap: number | null = null;
				for (let i = 0; i < silL.length; i++) {
					const lr = silL[i].right;
					const rl = silR[i].left;
					if (lr === null || rl === null) continue;
					const gap = gL.advanceWidth + rl - lr;
					if (naturalGap === null || gap < naturalGap) naturalGap = gap;
				}
				if (naturalGap === null) continue;
				const visibleGap = naturalGap + kern;
				if (visibleGap >= threshold) continue;
				const severity: AuditFinding['severity'] =
					visibleGap <= 0
						? 'collision'
						: visibleGap < threshold / 2
							? 'tight'
							: 'close';
				findings.push({
					left: l,
					right: r,
					label: String.fromCodePoint(l) + String.fromCodePoint(r),
					kerning: kern,
					naturalGap,
					visibleGap,
					severity
				});
			}
			// Sort: collision first, then by visibleGap ascending (worst first).
			findings.sort((a, b) => {
				const sev = { collision: 0, tight: 1, close: 2 } as const;
				if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
				return a.visibleGap - b.visibleGap;
			});
			auditFindings = findings;
			auditLastRun = new Date().toLocaleTimeString();
			toast.success(
				`Audit: ${findings.length} pair${findings.length === 1 ? '' : 's'} below ${threshold} fu.`
			);
		} catch (err) {
			toast.error('Audit failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			auditRunning = false;
		}
	};

	const auditPairFix = (f: AuditFinding) => {
		if (!project) return;
		// Set the kern so the visible gap lands at `threshold` exactly.
		const upm = project.metrics.unitsPerEm;
		const threshold = Math.round((upm * auditThresholdPct) / 100);
		const targetKern = Math.round(threshold - f.naturalGap);
		projectStore.upsertKerningPair({
			left: f.left,
			right: f.right,
			value: targetKern
		});
		toast.success(`Fixed ${f.label} → kern ${targetKern} fu (gap now ≈ ${threshold}).`);
		auditFindings = auditFindings.filter((x) => x !== f);
	};

	const dismissAuditFinding = (f: AuditFinding) => {
		auditFindings = auditFindings.filter((x) => x !== f);
	};

	// ---------- Sidebearing-class suggester ----------
	// Clusters drawn Latin glyphs whose current LSB or RSB values agree
	// within a tolerance AND share a category. Each cluster is a candidate
	// sidebearing class — adopting it lets the designer drive spacing for
	// the whole group through one slider.
	let sbClassSuggestions = $state<SuggestedSidebearingClass[]>([]);
	let sbClassRunning = $state(false);
	let sbClassLastRun = $state<string | null>(null);
	let sbClassTolerance = $state(10);

	const runSbClassSuggest = () => {
		if (!project || sbClassRunning) return;
		sbClassRunning = true;
		try {
			const existingMembers = new Set<number>();
			for (const cls of project.sidebearingClasses ?? []) {
				for (const m of cls.members) existingMembers.add(m);
			}
			const measurements: SidebearingMeasurement[] = [];
			for (const g of Object.values(project.glyphs)) {
				if (g.contours.length === 0) continue;
				// Skip glyphs already in a sidebearing class — they're spoken for.
				if (existingMembers.has(g.codepoint)) continue;
				let category: SidebearingMeasurement['category'] | null = null;
				if (g.codepoint >= 0x0041 && g.codepoint <= 0x005a) category = 'uppercase';
				else if (g.codepoint >= 0x0061 && g.codepoint <= 0x007a) category = 'lowercase';
				else if (g.codepoint >= 0x0030 && g.codepoint <= 0x0039) category = 'figure';
				if (!category) continue;
				measurements.push({
					codepoint: g.codepoint,
					category,
					leftSidebearing: g.leftSidebearing,
					rightSidebearing: g.rightSidebearing
				});
			}
			const next = suggestSidebearingClasses(measurements, {
				tolerance: sbClassTolerance,
				minMembers: 2
			});
			sbClassSuggestions = next;
			sbClassLastRun = new Date().toLocaleTimeString();
			toast.success(
				`Sidebearing classes: ${next.length} cluster${next.length === 1 ? '' : 's'}.`
			);
		} catch (err) {
			toast.error(
				'Sidebearing-class suggest failed: ' + (err instanceof Error ? err.message : String(err))
			);
		} finally {
			sbClassRunning = false;
		}
	};

	const adoptSbClassSuggestion = (sug: SuggestedSidebearingClass) => {
		if (!project) return;
		const sideLabel = sug.side === 'left' ? 'L' : 'R';
		const baseName = `${sug.category}-${sug.value}${sideLabel}`;
		projectStore.addSidebearingClass(baseName, sug.members);
		toast.success(
			`Adopted ${baseName} (${sug.members.length} glyph${sug.members.length === 1 ? '' : 's'}).`
		);
		sbClassSuggestions = sbClassSuggestions.filter((s) => s !== sug);
	};

	const dismissSbClassSuggestion = (sug: SuggestedSidebearingClass) => {
		sbClassSuggestions = sbClassSuggestions.filter((s) => s !== sug);
	};

	// ---------- Sidebearing analyzer ----------
	type AnalyzerCategory = 'uppercase' | 'lowercase' | 'figure' | 'all';
	let analyzerCategory = $state<AnalyzerCategory>('lowercase');

	const analyzerGlyphs = $derived.by(() => {
		if (!project) return [];
		const all = Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint);
		switch (analyzerCategory) {
			case 'uppercase':
				return all.filter((g) => g.codepoint >= 0x0041 && g.codepoint <= 0x005a);
			case 'lowercase':
				return all.filter((g) => g.codepoint >= 0x0061 && g.codepoint <= 0x007a);
			case 'figure':
				return all.filter((g) => g.codepoint >= 0x0030 && g.codepoint <= 0x0039);
			case 'all':
				return all;
		}
	});

	const analyzerMax = $derived(
		analyzerGlyphs.reduce(
			(m, g) => Math.max(m, g.leftSidebearing, g.rightSidebearing),
			60
		)
	);

	const cpOf = (s: string) => s.codePointAt(0) ?? 0;

	// Pull the family names the user added in the Brief — they're auto-loaded
	// from Google Fonts at project load, so they're available here for free.
	const briefReferenceFamilies = $derived(
		(project?.brief?.references ?? [])
			.map((r) => r.name.trim())
			.filter((n) => n.length > 0)
	);

	// ---------- Kerning class auto-suggest ----------
	// Find every base glyph (Latin A-Z or a-z that's drawn) and group its
	// composite descendants. One @Base_left class per base means a single
	// kerning rule covers every accented variant. Saves dozens of pairs.
	type ClassSuggestion = { name: string; members: number[]; basis: string };
	const classSuggestions = $derived.by(() => {
		if (!project) return [] as ClassSuggestion[];
		const out: ClassSuggestion[] = [];
		const existingNames = new Set((project.classes ?? []).map((c) => c.name));
		for (let cp = 0x0041; cp <= 0x007a; cp++) {
			// Latin only; skip [ \ ] ^ _ ` between Z and a
			if (cp > 0x005a && cp < 0x0061) continue;
			const base = project.glyphs[cp];
			if (!base) continue;
			const descendants = Object.values(project.glyphs).filter((g) =>
				(g.components ?? []).some((c) => c.baseCodepoint === cp)
			);
			// Suggest when there's at least one composite descendant — the class
			// is useful even before the base glyph is drawn.
			if (descendants.length === 0) continue;
			const members = [cp, ...descendants.map((d) => d.codepoint)];
			const char = String.fromCodePoint(cp);
			const className = `@${char === char.toUpperCase() ? char : char + '_lc'}_left`;
			if (existingNames.has(className)) continue;
			out.push({
				name: className,
				members,
				basis: `${char} + ${descendants.length} composite variant${descendants.length === 1 ? '' : 's'}`
			});
		}
		return out.slice(0, 12);
	});

	const acceptClassSuggestion = (sug: ClassSuggestion) => {
		projectStore.upsertKerningClass({ name: sug.name, members: sug.members });
		toast.success(`Added ${sug.name} (${sug.members.length} members)`);
	};

	// Expand class refs on either side of the current kerning pair into a
	// grid of all member-pair renderings — so the designer can see at a glance
	// whether the class kern looks right for every member.
	const classExpansionPairs = $derived.by(() => {
		if (!project) return [] as Array<{ l: string; r: string }>;
		const left = parseSide(leftChar);
		const right = parseSide(rightChar);
		const leftIsClass = isClassRef(left);
		const rightIsClass = isClassRef(right);
		if (!leftIsClass && !rightIsClass) return [];
		const resolve = (side: KerningSide): string[] => {
			if (isClassRef(side)) {
				const cls = (project.classes ?? []).find((c) => c.name === side);
				return (cls?.members ?? []).map((cp) => String.fromCodePoint(cp));
			}
			return [String.fromCodePoint(side)];
		};
		const lefts = resolve(left);
		const rights = resolve(right);
		const out: Array<{ l: string; r: string }> = [];
		for (const l of lefts) {
			for (const r of rights) {
				out.push({ l, r });
				if (out.length >= 48) return out; // sanity cap
			}
		}
		return out;
	});

	/** Parse a "side" input — leading @ → class ref, else first char → codepoint */
	const parseSide = (s: string): KerningSide => {
		const trimmed = s.trim();
		if (trimmed.startsWith('@')) return trimmed;
		return cpOf(trimmed);
	};

	const currentValue = $derived.by(() => {
		return projectStore.getKerningValue(parseSide(leftChar), parseSide(rightChar));
	});

	$effect(() => {
		pendingValue = currentValue;
	});

	const applyKerning = (value: number) => {
		projectStore.upsertKerningPair({
			left: parseSide(leftChar),
			right: parseSide(rightChar),
			value: Math.round(value)
		});
		pendingValue = value;
	};

	const removeKerning = (left: KerningSide, right: KerningSide) => {
		projectStore.upsertKerningPair({ left, right, value: 0 });
	};

	const sideLabel = (side: KerningSide): string => {
		if (isClassRef(side)) return side;
		return String.fromCodePoint(side);
	};

	let bulkText = $state('');
	let bulkResult = $state<string | null>(null);

	const makeFiguresTabular = () => {
		if (!project) return;
		const digits = Array.from({ length: 10 }, (_, i) => 0x0030 + i)
			.map((cp) => project.glyphs[cp])
			.filter((g) => g && g.contours.length > 0);
		if (digits.length === 0) {
			toast.warn('No figures (0–9) drawn yet.');
			return;
		}
		const targetAdvance = Math.max(...digits.map((g) => g.advanceWidth));
		for (const g of digits) {
			const extra = targetAdvance - g.advanceWidth;
			const lsb = g.leftSidebearing + Math.round(extra / 2);
			const rsb = g.rightSidebearing + (extra - Math.round(extra / 2));
			projectStore.updateGlyph(g.codepoint, (gg) => ({
				...gg,
				advanceWidth: targetAdvance,
				leftSidebearing: lsb,
				rightSidebearing: rsb
			}));
		}
		toast.success(`Set ${digits.length} figures to advance ${targetAdvance} units (centred).`);
	};

	const setAllSidebearings = (which: 'left' | 'right' | 'both', value: number, category: 'all' | 'upper' | 'lower' | 'figure') => {
		if (!project) return;
		const inRange = (cp: number): boolean => {
			switch (category) {
				case 'upper':
					return cp >= 0x0041 && cp <= 0x005a;
				case 'lower':
					return cp >= 0x0061 && cp <= 0x007a;
				case 'figure':
					return cp >= 0x0030 && cp <= 0x0039;
				case 'all':
					return true;
			}
		};
		const targets = Object.values(project.glyphs).filter(
			(g) => g.contours.length > 0 && inRange(g.codepoint)
		);
		if (targets.length === 0) {
			toast.warn('No drawn glyphs in this category.');
			return;
		}
		for (const g of targets) {
			projectStore.updateGlyph(g.codepoint, (gg) => {
				const next = { ...gg };
				if (which === 'left' || which === 'both') next.leftSidebearing = value;
				if (which === 'right' || which === 'both') next.rightSidebearing = value;
				next.advanceWidth = next.leftSidebearing + (gg.advanceWidth - gg.leftSidebearing - gg.rightSidebearing) + next.rightSidebearing;
				return next;
			});
		}
		toast.success(`Updated ${targets.length} glyph${targets.length === 1 ? '' : 's'}.`);
	};

	let bulkSbCategory = $state<'all' | 'upper' | 'lower' | 'figure'>('lower');
	let bulkSbWhich = $state<'left' | 'right' | 'both'>('both');
	let bulkSbValue = $state(40);

	// ---------- AI kerning suggestion ----------
	let kerningSuggestRunning = $state(false);
	let kerningSuggestError = $state<string | null>(null);
	let kerningSuggestProposal = $state<KerningProposal | null>(null);
	// Per-pair "applied" tracking so the UI can show which suggestions have
	// been committed without losing the original proposal list.
	let kerningAppliedKeys = $state<Set<string>>(new Set());

	const kerningPairsToEvaluate = $derived.by(() =>
		project ? buildPairsToEvaluate(project) : []
	);

	const runKerningSuggest = async () => {
		if (!project || kerningSuggestRunning) return;
		if (kerningPairsToEvaluate.length === 0) {
			kerningSuggestError =
				'No pairs to evaluate. Draw at least the AV / To / Yo letters or add pairs manually below.';
			return;
		}
		kerningSuggestRunning = true;
		kerningSuggestError = null;
		kerningSuggestProposal = null;
		kerningAppliedKeys = new Set();
		try {
			const proposal = await requestKerningProposal(
				kerningPairsToEvaluate,
				project
			);
			kerningSuggestProposal = proposal;
		} catch (e) {
			kerningSuggestError =
				e instanceof AnthropicError
					? e.message
					: e instanceof Error
						? e.message
						: 'Failed to suggest kerning.';
		} finally {
			kerningSuggestRunning = false;
		}
	};

	const suggestionKey = (s: { left: KerningSide; right: KerningSide }): string =>
		`${typeof s.left === 'number' ? `cp:${s.left}` : `cls:${s.left}`}::${
			typeof s.right === 'number' ? `cp:${s.right}` : `cls:${s.right}`
		}`;

	const applyKerningSuggestion = (s: KerningSuggestion) => {
		if (!project) return;
		projectStore.upsertKerningPair({
			left: s.left,
			right: s.right,
			value: s.value
		});
		kerningAppliedKeys = new Set([...kerningAppliedKeys, suggestionKey(s)]);
	};

	const applyAllHighConfidence = () => {
		if (!kerningSuggestProposal) return;
		let applied = 0;
		for (const s of kerningSuggestProposal.pairs) {
			if (s.confidence !== 'high') continue;
			if (kerningAppliedKeys.has(suggestionKey(s))) continue;
			applyKerningSuggestion(s);
			applied++;
		}
		if (applied > 0)
			toast.success(`Applied ${applied} high-confidence kerning suggestion${applied === 1 ? '' : 's'}.`);
	};

	const discardKerningSuggestion = () => {
		kerningSuggestProposal = null;
		kerningSuggestError = null;
		kerningAppliedKeys = new Set();
	};

	// ---------- Stem rhythm strip ----------
	type RhythmSet = 'lower-stems' | 'upper-stems';
	const RHYTHM_SETS: Record<RhythmSet, { label: string; codepoints: number[] }> = {
		'lower-stems': {
			label: 'Lowercase stems',
			codepoints: [0x006e, 0x0068, 0x006d, 0x0062, 0x0064, 0x006b, 0x006c, 0x0069, 0x0070, 0x0071, 0x0075, 0x0072]
		},
		'upper-stems': {
			label: 'Uppercase stems',
			codepoints: [0x0048, 0x004e, 0x0049, 0x004c, 0x0046, 0x0045, 0x0054, 0x004b, 0x004d, 0x0050, 0x0042, 0x0044, 0x0052]
		}
	};
	let rhythmSet = $state<RhythmSet>('lower-stems');
	let rhythmStemWidths = $state<Map<number, number>>(new Map());

	const rhythmDrawn = $derived.by(() => {
		if (!project) return [];
		return RHYTHM_SETS[rhythmSet].codepoints
			.map((cp) => project.glyphs[cp])
			.filter((g) => g && g.contours.length > 0);
	});

	const measureRhythmStems = async () => {
		if (!project) return;
		const next = new Map<number, number>();
		for (const g of rhythmDrawn) {
			try {
				const ms = await detectStemWidths(
					g.contours,
					glyphBounds(g.contours),
					g.advanceWidth,
					{ capHeight: project.metrics.capHeight, xHeight: project.metrics.xHeight }
				);
				// Median width across all detected runs (excluding very narrow ones)
				const allWidths = ms.flatMap((m) => m.runs.map((r) => r.width)).filter((w) => w >= 40);
				if (allWidths.length === 0) continue;
				allWidths.sort((a, b) => a - b);
				const median = allWidths[Math.floor(allWidths.length / 2)];
				next.set(g.codepoint, median);
			} catch {
				/* skip glyph */
			}
		}
		rhythmStemWidths = next;
	};

	// Auto-measure when the set or drawn glyphs change
	// Plain `let` (not $state) — only read+written inside the $effect below to
	// dedupe re-measures; making it reactive risks the read-then-write cycle
	// that crashed audit's mount (see commit bc7399d).
	let rhythmKey = '';
	$effect(() => {
		const k = `${rhythmSet}:${rhythmDrawn.map((g) => `${g.codepoint}:${g.updatedAt}`).join('|')}`;
		if (k === rhythmKey) return;
		rhythmKey = k;
		if (rhythmDrawn.length > 0) measureRhythmStems();
		else rhythmStemWidths = new Map();
	});

	const rhythmMedianStem = $derived.by(() => {
		const widths = [...rhythmStemWidths.values()];
		if (widths.length === 0) return 0;
		widths.sort((a, b) => a - b);
		return widths[Math.floor(widths.length / 2)];
	});
	const importBulkKerning = () => {
		if (!bulkText.trim()) return;
		const lines = bulkText
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		let added = 0;
		let skipped = 0;
		for (const line of lines) {
			// Accept either whitespace or comma separators: "A V -50" or "A,V,-50"
			const parts = line.split(/[\s,]+/);
			if (parts.length < 3) {
				skipped++;
				continue;
			}
			const value = Number(parts[parts.length - 1]);
			if (!Number.isFinite(value)) {
				skipped++;
				continue;
			}
			const leftRaw = parts[0];
			const rightRaw = parts.slice(1, -1).join('');
			const left: KerningSide = leftRaw.startsWith('@')
				? leftRaw
				: (leftRaw.codePointAt(0) ?? 0);
			const right: KerningSide = rightRaw.startsWith('@')
				? rightRaw
				: (rightRaw.codePointAt(0) ?? 0);
			if (!left || !right) {
				skipped++;
				continue;
			}
			projectStore.upsertKerningPair({ left, right, value: Math.round(value) });
			added++;
		}
		bulkResult = `${added} added${skipped > 0 ? `, ${skipped} skipped` : ''}.`;
		if (added > 0) bulkText = '';
	};

	const addClass = () => {
		const name = newClassName.trim();
		if (!name.startsWith('@')) {
			toast.warn('Class name must start with @ (e.g. @A_left)');
			return;
		}
		const members = newClassMembers
			.trim()
			.split(/\s+/)
			.map((s) => s.codePointAt(0) ?? 0)
			.filter((cp) => cp > 0);
		if (members.length === 0) return;
		projectStore.upsertKerningClass({ name, members });
		newClassName = '@class';
		newClassMembers = '';
	};
</script>

<div class="h-full overflow-auto">
<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
	<header>
		<h1 class="text-xl font-semibold tracking-tight">Spacing &amp; kerning</h1>
		<p class="text-sm text-fg-muted">
			Per-glyph sidebearings are edited in the glyph editor. Set kerning pairs here.
		</p>
	</header>

	<!-- Auto-space — silhouette-area suggester. Uses 'H' as the cap
	     reference and 'n' as the lowercase reference; computes a target
	     sidebearing per glyph that makes its visible whitespace match
	     the reference. The user always reviews and applies. -->
	<Panel>
		<div class="mb-3 flex items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Auto-space
			</h2>
			<span
				class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
			>
				Local
			</span>
			{#if autoSpaceLastRun}
				<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
					last run · {autoSpaceLastRun}
				</span>
			{/if}
		</div>
		<p class="mb-3 text-[12px] leading-snug text-fg-muted">
			Silhouette-area sidebearings, normalised against
			<span class="font-mono">H</span> (caps) and
			<span class="font-mono">n</span> (lowercase). Pure-local algorithm — no API
			calls, sub-millisecond per glyph. Suggestions are never auto-applied; review and
			confirm.
		</p>

		<div class="flex flex-wrap items-center gap-2">
			<Button density="sm" onclick={runAutoSpace} loading={autoSpaceRunning}>
				{#snippet icon()}<Wand class="size-3.5" />{/snippet}
				{autoSpaceRunning ? 'Computing…' : 'Compute suggestions'}
			</Button>
			{#if autoSpaceSuggestions.length > 0}
				<Button density="sm" variant="primary" onclick={() => applyAutoSpace()}>
					{#snippet icon()}<Check class="size-3.5" />{/snippet}
					Apply all ({autoSpaceSuggestions.length})
				</Button>
				<Button
					density="sm"
					variant="secondary"
					onclick={() => (autoSpaceSuggestions = [])}
				>
					Clear
				</Button>
			{/if}
		</div>

		{#if autoSpaceSuggestions.length > 0}
			<div class="mt-4 overflow-hidden rounded-md border border-border">
				<table class="w-full text-[12px]">
					<thead>
						<tr class="border-b border-border bg-surface-2/40 text-fg-subtle">
							<th class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase">
								Glyph
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								LSB
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								→ LSB
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								RSB
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								→ RSB
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Conf
							</th>
							<th class="px-2 py-1.5"></th>
						</tr>
					</thead>
					<tbody>
						{#each autoSpaceSuggestions as s (s.codepoint)}
							{@const dLsb = s.suggestedLsb - s.currentLsb}
							{@const dRsb = s.suggestedRsb - s.currentRsb}
							<tr class="border-b border-border last:border-b-0">
								<td class="px-3 py-1.5">
									<span class="mr-2 font-mono text-[14px] text-fg">{s.char}</span>
									<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
										U+{s.codepoint.toString(16).toUpperCase().padStart(4, '0')}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-muted" data-numeric>
									{s.currentLsb}
								</td>
								<td
									class="px-2 py-1.5 text-right font-mono text-fg {dLsb < 0
										? 'text-warn-strong'
										: dLsb > 0
											? 'text-accent-strong'
											: ''}"
									data-numeric
								>
									{s.suggestedLsb}
									<span class="ml-1 text-[10px] text-fg-subtle">
										{dLsb > 0 ? '+' : ''}{dLsb}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-muted" data-numeric>
									{s.currentRsb}
								</td>
								<td
									class="px-2 py-1.5 text-right font-mono text-fg {dRsb < 0
										? 'text-warn-strong'
										: dRsb > 0
											? 'text-accent-strong'
											: ''}"
									data-numeric
								>
									{s.suggestedRsb}
									<span class="ml-1 text-[10px] text-fg-subtle">
										{dRsb > 0 ? '+' : ''}{dRsb}
									</span>
								</td>
								<td
									class="px-2 py-1.5 text-right font-mono text-[11px] {s.confidence < 0.3
										? 'text-warn-strong'
										: s.confidence < 0.6
											? 'text-fg-muted'
											: 'text-success-strong'}"
									data-numeric
								>
									{(s.confidence * 100).toFixed(0)}%
								</td>
								<td class="px-2 py-1.5 text-right">
									<div class="flex justify-end gap-1">
										<button
											type="button"
											onclick={() => applyAutoSpace([s])}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-success-strong"
											aria-label="Apply this suggestion"
											title="Apply"
										>
											<Check class="size-3.5" />
										</button>
										<button
											type="button"
											onclick={() => dismissAutoSpaceSuggestion(s)}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-warn-strong"
											aria-label="Skip this suggestion"
											title="Skip"
										>
											<X class="size-3.5" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Panel>

	<!-- Auto-kern — silhouette-distance pair suggester. Walks the canonical
	     Latin problem-pair list (AV, To, Yo, Pa, …) and proposes a
	     kerning value derived from the visible-gap formula, normalised
	     against HH (caps) or nn (lowercase). -->
	<Panel>
		<div class="mb-3 flex items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Auto-kern
			</h2>
			<span
				class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
			>
				Local
			</span>
			{#if autoKernLastRun}
				<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
					last run · {autoKernLastRun}
				</span>
			{/if}
		</div>
		<p class="mb-3 text-[12px] leading-snug text-fg-muted">
			Silhouette-distance pair kerning over the canonical Latin problem set —
			<span class="font-mono">AV · To · Yo · Pa · Ta · …</span>. Target gap matches
			<span class="font-mono">HH</span> for cap-led pairs and
			<span class="font-mono">nn</span> for lowercase. Suggestions are never
			auto-applied.
		</p>

		<div class="flex flex-wrap items-center gap-2">
			<Button density="sm" onclick={runAutoKern} loading={autoKernRunning}>
				{#snippet icon()}<Wand class="size-3.5" />{/snippet}
				{autoKernRunning ? 'Computing…' : 'Compute suggestions'}
			</Button>
			{#if autoKernSuggestions.length > 0}
				<Button density="sm" variant="primary" onclick={() => applyAutoKern()}>
					{#snippet icon()}<Check class="size-3.5" />{/snippet}
					Apply all ({autoKernSuggestions.length})
				</Button>
				<Button
					density="sm"
					variant="secondary"
					onclick={() => (autoKernSuggestions = [])}
				>
					Clear
				</Button>
			{/if}
		</div>

		{#if autoKernSuggestions.length > 0}
			<div class="mt-4 overflow-hidden rounded-md border border-border">
				<table class="w-full text-[12px]">
					<thead>
						<tr class="border-b border-border bg-surface-2/40 text-fg-subtle">
							<th class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase">
								Pair
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Now
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Suggested
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Gap
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Conf
							</th>
							<th class="px-2 py-1.5"></th>
						</tr>
					</thead>
					<tbody>
						{#each autoKernSuggestions as s (s.left + '/' + s.right)}
							{@const delta = s.suggested - s.current}
							<tr class="border-b border-border last:border-b-0">
								<td class="px-3 py-1.5">
									<span class="font-mono text-[14px] text-fg">{s.label}</span>
									<span class="ml-2 font-mono text-[10px] text-fg-subtle" data-numeric>
										U+{s.left.toString(16).toUpperCase().padStart(4, '0')}
										/ U+{s.right.toString(16).toUpperCase().padStart(4, '0')}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-muted" data-numeric>
									{s.current}
								</td>
								<td
									class="px-2 py-1.5 text-right font-mono text-fg {delta < 0
										? 'text-warn-strong'
										: delta > 0
											? 'text-accent-strong'
											: ''}"
									data-numeric
									title="Natural gap: {Math.round(s.naturalGap)} fu · Target gap: {Math.round(s.targetGap)} fu"
								>
									{s.suggested}
									<span class="ml-1 text-[10px] text-fg-subtle">
										{delta > 0 ? '+' : ''}{delta}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-subtle" data-numeric>
									{Math.round(s.naturalGap)}→{Math.round(s.targetGap)}
								</td>
								<td
									class="px-2 py-1.5 text-right font-mono text-[11px] {s.confidence < 0.3
										? 'text-warn-strong'
										: s.confidence < 0.6
											? 'text-fg-muted'
											: 'text-success-strong'}"
									data-numeric
								>
									{(s.confidence * 100).toFixed(0)}%
								</td>
								<td class="px-2 py-1.5 text-right">
									<div class="flex justify-end gap-1">
										<button
											type="button"
											onclick={() => applyAutoKern([s])}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-success-strong"
											aria-label="Apply this suggestion"
											title="Apply"
										>
											<Check class="size-3.5" />
										</button>
										<button
											type="button"
											onclick={() => dismissAutoKernSuggestion(s)}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-warn-strong"
											aria-label="Skip this suggestion"
											title="Skip"
										>
											<X class="size-3.5" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Panel>

	<!-- Audit-kern — collision detector. Walks existing pairs + canonical
	     Latin and flags any whose visible gap (natural + applied kern)
	     drops below `threshold * UPM`. Three severity tiers. Each finding
	     has a one-click "Fix to threshold" that sets the kern to land the
	     gap exactly at the threshold value. -->
	<Panel>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Audit kerning
			</h2>
			<span
				class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
			>
				Local
			</span>
			{#if auditLastRun}
				<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
					last run · {auditLastRun}
				</span>
			{/if}
			<label class="ml-auto inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
				Threshold
				<input
					type="number"
					bind:value={auditThresholdPct}
					min="0.1"
					max="5"
					step="0.1"
					class="w-14 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg outline-none focus:border-accent"
				/>
				<span class="font-mono text-[10px] text-fg-subtle">% UPM</span>
			</label>
		</div>
		<p class="mb-3 text-[12px] leading-snug text-fg-muted">
			Flags pairs whose visible gap (natural gap + applied kern) drops below
			the threshold. Three tiers — <span class="text-danger-strong">collision</span>
			(ink overlap), <span class="text-warn-strong">tight</span>, and
			<span class="text-fg-muted">close</span>. One-click fix sets the kern
			so the gap lands at the threshold.
		</p>

		<div class="flex flex-wrap items-center gap-2">
			<Button density="sm" onclick={runAuditKern} loading={auditRunning}>
				{#snippet icon()}<Wand class="size-3.5" />{/snippet}
				{auditRunning ? 'Checking…' : 'Run audit'}
			</Button>
			{#if auditFindings.length > 0}
				<Button
					density="sm"
					variant="secondary"
					onclick={() => (auditFindings = [])}
				>
					Clear
				</Button>
			{/if}
		</div>

		{#if auditFindings.length > 0}
			<div class="mt-4 overflow-hidden rounded-md border border-border">
				<table class="w-full text-[12px]">
					<thead>
						<tr class="border-b border-border bg-surface-2/40 text-fg-subtle">
							<th class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase">
								Pair
							</th>
							<th class="px-2 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase">
								Severity
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Kern
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Natural
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Visible
							</th>
							<th class="px-2 py-1.5"></th>
						</tr>
					</thead>
					<tbody>
						{#each auditFindings as f (f.left + '/' + f.right)}
							<tr class="border-b border-border last:border-b-0">
								<td class="px-3 py-1.5">
									<span class="font-mono text-[14px] text-fg">{f.label}</span>
									<span class="ml-2 font-mono text-[10px] text-fg-subtle" data-numeric>
										U+{f.left.toString(16).toUpperCase().padStart(4, '0')}
										/ U+{f.right.toString(16).toUpperCase().padStart(4, '0')}
									</span>
								</td>
								<td class="px-2 py-1.5">
									<span
										class="font-mono text-[10px] font-medium tracking-wider uppercase {f.severity ===
										'collision'
											? 'text-danger-strong'
											: f.severity === 'tight'
												? 'text-warn-strong'
												: 'text-fg-muted'}"
									>
										{f.severity}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-muted" data-numeric>
									{f.kerning}
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-muted" data-numeric>
									{Math.round(f.naturalGap)}
								</td>
								<td
									class="px-2 py-1.5 text-right font-mono {f.severity === 'collision'
										? 'text-danger-strong'
										: f.severity === 'tight'
											? 'text-warn-strong'
											: 'text-fg'}"
									data-numeric
								>
									{Math.round(f.visibleGap)}
								</td>
								<td class="px-2 py-1.5 text-right">
									<div class="flex justify-end gap-1">
										<button
											type="button"
											onclick={() => auditPairFix(f)}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-success-strong"
											aria-label="Fix to threshold"
											title="Set kern so visible gap = threshold"
										>
											<Check class="size-3.5" />
										</button>
										<button
											type="button"
											onclick={() => dismissAuditFinding(f)}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-warn-strong"
											aria-label="Dismiss"
											title="Skip"
										>
											<X class="size-3.5" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Panel>

	<!-- Sidebearing-class suggester. Clusters drawn glyphs whose current
	     sidebearings sit within a tolerance and share a category. Each
	     cluster becomes a candidate sidebearing class — one click adopts. -->
	<Panel>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Suggest sidebearing classes
			</h2>
			<span
				class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
			>
				Local
			</span>
			{#if sbClassLastRun}
				<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
					last run · {sbClassLastRun}
				</span>
			{/if}
			<label class="ml-auto inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
				Tolerance
				<input
					type="number"
					bind:value={sbClassTolerance}
					min="1"
					max="50"
					step="1"
					class="w-14 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg outline-none focus:border-accent"
				/>
				<span class="font-mono text-[10px] text-fg-subtle">fu</span>
			</label>
		</div>
		<p class="mb-3 text-[12px] leading-snug text-fg-muted">
			Clusters glyphs whose current sidebearings agree within tolerance and
			share a category (uppercase / lowercase / figure). Glyphs already in a
			class are skipped. Adopting a cluster collapses many per-glyph
			sidebearings into one class slider — fewer numbers to maintain.
		</p>

		<div class="flex flex-wrap items-center gap-2">
			<Button density="sm" onclick={runSbClassSuggest} loading={sbClassRunning}>
				{#snippet icon()}<Group class="size-3.5" />{/snippet}
				{sbClassRunning ? 'Clustering…' : 'Find clusters'}
			</Button>
			{#if sbClassSuggestions.length > 0}
				<Button
					density="sm"
					variant="secondary"
					onclick={() => (sbClassSuggestions = [])}
				>
					Clear
				</Button>
			{/if}
		</div>

		{#if sbClassSuggestions.length > 0}
			<div class="mt-4 overflow-hidden rounded-md border border-border">
				<table class="w-full text-[12px]">
					<thead>
						<tr class="border-b border-border bg-surface-2/40 text-fg-subtle">
							<th class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase">
								Cluster
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Value
							</th>
							<th class="px-2 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase">
								Spread
							</th>
							<th class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase">
								Members
							</th>
							<th class="px-2 py-1.5"></th>
						</tr>
					</thead>
					<tbody>
						{#each sbClassSuggestions as s, i (i)}
							<tr class="border-b border-border last:border-b-0">
								<td class="px-3 py-1.5">
									<span class="font-mono text-[11px] text-fg">
										{s.category}
									</span>
									<span
										class="ml-1 font-mono text-[10px] tracking-wider text-fg-subtle uppercase"
									>
										{s.side}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg" data-numeric>
									{s.value}
								</td>
								<td class="px-2 py-1.5 text-right font-mono text-fg-subtle" data-numeric>
									±{Math.ceil(s.spread / 2)}
								</td>
								<td class="px-3 py-1.5 font-mono text-[13px] text-fg">
									{s.members.map((cp) => String.fromCodePoint(cp)).join(' ')}
									<span
										class="ml-1.5 font-mono text-[10px] text-fg-subtle"
										data-numeric
									>
										· {s.members.length}
									</span>
								</td>
								<td class="px-2 py-1.5 text-right">
									<div class="flex justify-end gap-1">
										<button
											type="button"
											onclick={() => adoptSbClassSuggestion(s)}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-success-strong"
											aria-label="Adopt as sidebearing class"
											title="Adopt as new class"
										>
											<Check class="size-3.5" />
										</button>
										<button
											type="button"
											onclick={() => dismissSbClassSuggestion(s)}
											class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-warn-strong"
											aria-label="Skip"
											title="Skip"
										>
											<X class="size-3.5" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				AI kerning suggestions
			</h2>
			<span
				class="rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-warn-strong uppercase"
			>
				Experimental
			</span>
		</div>
		<p class="mb-3 text-[12px] leading-snug text-fg-muted">
			Ask Claude for kerning values across your existing pairs plus the
			canonical problem pairs (AV/To/We/Yo/Pa/Ta/&hellip;) for any drawn
			glyphs. Suggestions are typographic priors, not measurements — review
			before applying.
		</p>

		<div class="flex flex-wrap items-center gap-2">
			<Button
				density="sm"
				onclick={runKerningSuggest}
				disabled={!settings.hasKey || kerningPairsToEvaluate.length === 0}
				loading={kerningSuggestRunning}
			>
				{#snippet icon()}<Wand class="size-3.5" />{/snippet}
				Suggest values for {kerningPairsToEvaluate.length} pair{kerningPairsToEvaluate.length === 1 ? '' : 's'}
			</Button>
			{#if !settings.hasKey}
				<span class="text-[11px] text-fg-muted">
					Set an Anthropic API key in Settings first.
				</span>
			{/if}
		</div>

		{#if kerningSuggestError}
			<div class="mt-3 flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger-strong">
				<span class="flex-1">{kerningSuggestError}</span>
				<button
					type="button"
					onclick={runKerningSuggest}
					disabled={kerningSuggestRunning || kerningPairsToEvaluate.length === 0}
					class="shrink-0 rounded border border-danger/40 px-2 py-0.5 text-[11px] font-medium hover:border-danger hover:bg-danger/15 disabled:opacity-50"
				>
					Retry
				</button>
			</div>
		{/if}

		{#if kerningSuggestProposal}
			<div class="mt-4 flex flex-col gap-3">
				{#if kerningSuggestProposal.reasoning}
					<p class="text-[12px] leading-snug text-fg-muted">
						{kerningSuggestProposal.reasoning}
					</p>
				{/if}

				<div class="flex flex-wrap items-center gap-2">
					<Button density="sm" onclick={applyAllHighConfidence}>
						{#snippet icon()}<Check class="size-3.5" />{/snippet}
						Apply all high-confidence
					</Button>
					<Button density="sm" variant="ghost" onclick={discardKerningSuggestion}>
						{#snippet icon()}<X class="size-3.5" />{/snippet}
						Discard
					</Button>
				</div>

				<div class="grid gap-1.5">
					{#each kerningSuggestProposal.pairs as s (suggestionKey(s))}
						{@const applied = kerningAppliedKeys.has(suggestionKey(s))}
						<div
							class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[12px]"
						>
							<div
								class="flex w-12 items-center justify-center rounded font-mono text-[16px] tracking-tight"
								style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
							>
								{kerningSideLabel(s.left)}{kerningSideLabel(s.right)}
							</div>
							<div class="flex flex-1 items-center gap-3">
								<span
									class="font-mono text-[13px] {s.value < 0
										? 'text-fg'
										: s.value > 0
											? 'text-fg-muted'
											: 'text-fg-subtle'}"
									data-numeric
								>
									{s.value > 0 ? '+' : ''}{s.value}
								</span>
								<span
									class="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider {s.confidence ===
									'high'
										? 'bg-success/15 text-success-strong'
										: s.confidence === 'medium'
											? 'bg-warn/15 text-warn-strong'
											: 'bg-fg/10 text-fg-muted'}"
								>
									{s.confidence}
								</span>
							</div>
							{#if applied}
								<span
									class="inline-flex items-center gap-1 text-[11px] text-success-strong"
								>
									<Check class="size-3" /> Applied
								</span>
							{:else}
								<button
									type="button"
									onclick={() => applyKerningSuggestion(s)}
									class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg hover:border-accent hover:text-accent-strong"
								>
									Apply
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Spacing playground
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Type anything, scrub the size, toggle features. This is the fastest way to
			feel your rhythm and find awkward pairs.
		</p>
		<div class="mb-3 grid grid-cols-[1fr_180px_auto] items-center gap-3">
			<input
				bind:value={playgroundText}
				class="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
				placeholder="Type to test spacing…"
			/>
			<label class="flex items-center gap-2 text-[11px] text-fg-muted">
				Size
				<input
					type="range"
					min={24}
					max={200}
					step={2}
					bind:value={playgroundSize}
					class="h-1 flex-1 accent-accent"
				/>
				<span class="w-8 text-right font-mono text-fg" data-numeric>{playgroundSize}</span>
			</label>
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => (playgroundKern = !playgroundKern)}
					class="rounded-md border px-2 py-1 font-mono text-[11px] {playgroundKern
						? 'border-accent bg-accent-soft text-accent-strong'
						: 'border-border bg-surface-2 text-fg-muted hover:border-fg-subtle'}"
					title="Toggle kerning"
				>
					kern
				</button>
				<button
					type="button"
					onclick={() => (playgroundLiga = !playgroundLiga)}
					class="rounded-md border px-2 py-1 font-mono text-[11px] {playgroundLiga
						? 'border-accent bg-accent-soft text-accent-strong'
						: 'border-border bg-surface-2 text-fg-muted hover:border-fg-subtle'}"
					title="Toggle ligatures"
				>
					liga
				</button>
			</div>
		</div>
		<div class="mb-3 grid grid-cols-2 gap-3">
			<label class="flex items-center gap-2 text-[11px] text-fg-muted">
				Line height
				<input
					type="range"
					min={0.8}
					max={2}
					step={0.05}
					bind:value={playgroundLineHeight}
					class="h-1 flex-1 accent-accent"
				/>
				<span class="w-10 text-right font-mono text-fg" data-numeric>
					{playgroundLineHeight.toFixed(2)}
				</span>
			</label>
			<label class="flex items-center gap-2 text-[11px] text-fg-muted">
				Tracking
				<input
					type="range"
					min={-50}
					max={200}
					step={5}
					bind:value={playgroundTracking}
					class="h-1 flex-1 accent-accent"
				/>
				<span class="w-12 text-right font-mono text-fg" data-numeric>
					{playgroundTracking > 0 ? '+' : ''}{playgroundTracking}
				</span>
			</label>
		</div>
		<div
			class="preview-font min-h-[160px] whitespace-pre-wrap rounded-lg border border-border bg-canvas p-6"
			style="font-size: {playgroundSize}px; line-height: {playgroundLineHeight}; letter-spacing: {playgroundTracking / 1000}em; font-feature-settings: {playgroundFeatures};"
		>
			{playgroundText || 'Type above…'}
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-1.5">
			<span class="text-[11px] font-medium text-fg-muted">Compare with:</span>
			{#each REFERENCE_PRESETS as opt (opt.id)}
				<button
					type="button"
					onclick={() => (referenceFont = opt.id)}
					class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {referenceFont ===
					opt.id
						? 'bg-accent-soft text-accent-strong'
						: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
				>
					{opt.label}
				</button>
			{/each}
			{#each briefReferenceFamilies as name (name)}
				<button
					type="button"
					onclick={() => (referenceFont = name)}
					class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {referenceFont ===
					name
						? 'bg-accent-soft text-accent-strong'
						: 'border border-accent/30 text-accent-strong/80 hover:bg-accent-soft/40'}"
					title="From Brief — auto-loaded from Google Fonts"
				>
					{name}
				</button>
			{/each}
			<input
				bind:value={referenceFont}
				placeholder="Or any font family…"
				class="ml-2 rounded-md border border-border bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
			/>
		</div>
		{#if referenceFont}
			<div
				class="mt-2 min-h-[160px] whitespace-pre-wrap rounded-lg border border-dashed border-border-strong/50 bg-canvas/50 p-6 text-fg-muted"
				style="font-family: {referenceFont}, sans-serif; font-size: {playgroundSize}px; line-height: {playgroundLineHeight}; letter-spacing: {playgroundTracking / 1000}em; font-feature-settings: {playgroundFeatures};"
			>
				{playgroundText || `Reference: ${referenceFont}`}
			</div>
		{/if}
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Sidebearing analyzer
			</h2>
			<div class="flex items-center gap-1">
				{#each [{ id: 'lowercase', label: 'a–z' }, { id: 'uppercase', label: 'A–Z' }, { id: 'figure', label: '0–9' }, { id: 'all', label: 'All drawn' }] as opt (opt.id)}
					<button
						type="button"
						onclick={() => (analyzerCategory = opt.id as AnalyzerCategory)}
						class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {analyzerCategory ===
						opt.id
							? 'bg-accent-soft text-accent-strong'
							: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Bars show LSB and RSB to scale. Symmetric round glyphs (o, O, e) should
			look balanced; stems with serifs/finials typically lean asymmetric.
		</p>
		{#if analyzerGlyphs.length === 0}
			<p class="text-sm text-fg-muted">No drawn glyphs in this category yet.</p>
		{:else}
			<ul class="grid gap-1">
				{#each analyzerGlyphs as g (g.codepoint)}
					{@const lsbPct = (g.leftSidebearing / analyzerMax) * 100}
					{@const rsbPct = (g.rightSidebearing / analyzerMax) * 100}
					{@const asymmetric =
						Math.abs(g.leftSidebearing - g.rightSidebearing) >
						Math.max(20, Math.min(g.leftSidebearing, g.rightSidebearing) * 0.4)}
					<li
						class="grid grid-cols-[40px_1fr_30px_1fr_60px] items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-surface-2/40"
					>
						<a
							href="/project/{project?.id}/edit"
							onclick={() => projectStore.selectGlyph(g.codepoint)}
							class="preview-font text-center text-xl leading-none hover:text-accent"
							title="Open {g.name}"
						>
							{String.fromCodePoint(g.codepoint)}
						</a>
						<div class="flex h-2 justify-end overflow-hidden rounded-full bg-surface-2">
							<div
								class="h-full {asymmetric ? 'bg-warn' : 'bg-accent/70'}"
								style="width: {Math.max(2, lsbPct)}%;"
							></div>
						</div>
						<div class="text-center font-mono text-[10px] text-fg-subtle" data-numeric>
							{g.leftSidebearing}
						</div>
						<div class="flex h-2 overflow-hidden rounded-full bg-surface-2">
							<div
								class="h-full {asymmetric ? 'bg-warn' : 'bg-accent/70'}"
								style="width: {Math.max(2, rsbPct)}%;"
							></div>
						</div>
						<div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric>
							{g.rightSidebearing}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Group class="size-3" /> Sidebearing classes ({project?.sidebearingClasses?.length ?? 0})
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Group glyphs that should share LSB/RSB (e.g. H I L M N for vertical stems, O C G Q for rounds).
			Edits to a class propagate to every member, so spacing stays coherent before kerning starts.
		</p>
		{#if project?.sidebearingClasses && project.sidebearingClasses.length > 0}
			<ul class="mb-3 grid gap-2">
				{#each project.sidebearingClasses as cls (cls.id)}
					{@const avg = sbClassAvg(cls.members)}
					<li class="rounded-md border border-border bg-surface-2/40 px-3 py-2">
						<div class="mb-1.5 flex items-center justify-between gap-2">
							<input
								type="text"
								value={cls.name}
								onchange={(e) =>
									projectStore.renameSidebearingClass(cls.id, e.currentTarget.value)}
								class="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-fg outline-none focus:ring-1 focus:ring-accent"
							/>
							<button
								type="button"
								onclick={() => projectStore.removeSidebearingClass(cls.id)}
								class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
								aria-label="Delete class"
								title="Delete sidebearing class"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
						<div class="mb-2 flex flex-wrap gap-1">
							{#each cls.members as cp (cp)}
								{@const g = project.glyphs[cp]}
								<button
									type="button"
									onclick={() =>
										projectStore.updateSidebearingClassMembers(
											cls.id,
											cls.members.filter((m) => m !== cp)
										)}
									class="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg hover:bg-danger/10 hover:text-danger-strong"
									title="Remove {g?.name ?? cp.toString(16)}"
								>
									{#if cp > 0x20 && cp < 0x10000}
										{String.fromCodePoint(cp)}
									{:else}
										{g?.name ?? cp}
									{/if}
								</button>
							{/each}
						</div>
						<div class="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-[11px]">
							<span class="text-fg-muted">LSB</span>
							<input
								type="number"
								value={avg.lsb}
								onchange={(e) =>
									projectStore.setSidebearingClassValues(
										cls.id,
										Number(e.currentTarget.value),
										null
									)}
								class="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg outline-none focus:border-accent"
							/>
							<span class="text-fg-muted">RSB</span>
							<input
								type="number"
								value={avg.rsb}
								onchange={(e) =>
									projectStore.setSidebearingClassValues(
										cls.id,
										null,
										Number(e.currentTarget.value)
									)}
								class="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg outline-none focus:border-accent"
							/>
						</div>
						{#if cls.members.length > 0}
							{@const rhythm = cls.members
								.map((cp) =>
									cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : ''
								)
								.filter(Boolean)
								.flatMap((ch) => ['n', ch, 'o', ch])
								.join('')}
							<div
								class="preview-font mt-2 overflow-hidden rounded bg-canvas px-2 py-1.5 text-2xl leading-none text-fg"
								title="Rhythm proof — letters drawn from this class interleaved with n and o so you can eyeball whether spacing produces stable text color"
							>
								{rhythm}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<div class="grid grid-cols-[1fr_2fr_auto] gap-2">
			<Field label="Name">
				<Input density="sm" bind:value={newSbName} placeholder="Vertical stems" />
			</Field>
			<Field label="Members (paste characters)">
				<Input density="sm" bind:value={newSbMembers} placeholder="HILMN" />
			</Field>
			<Button density="sm" onclick={createSbClass} disabled={!newSbMembers.trim()}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Add class
			</Button>
		</div>
		<div class="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
			<span class="text-fg-subtle">Quick presets:</span>
			{#each SB_PRESETS as preset (preset.name)}
				<button
					type="button"
					onclick={() => insertPreset(preset)}
					class="rounded-full border border-border bg-surface px-2 py-0.5 text-fg-muted hover:border-accent hover:text-accent"
					title="Pre-fill: {preset.chars}"
				>
					{preset.name}
				</button>
			{/each}
		</div>
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Stem rhythm
			</h2>
			<div class="flex items-center gap-1">
				{#each Object.entries(RHYTHM_SETS) as [id, set] (id)}
					<button
						type="button"
						onclick={() => (rhythmSet = id as RhythmSet)}
						class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {rhythmSet ===
						id
							? 'bg-accent-soft text-accent-strong'
							: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
					>
						{set.label}
					</button>
				{/each}
			</div>
		</div>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Scans every drawn stem-bearing glyph and reports its median vertical-stem width.
			Stems should match within ~5 units across the set; outliers highlight in warn.
		</p>
		{#if rhythmDrawn.length === 0}
			<p class="text-sm text-fg-muted">No drawn glyphs in this set yet.</p>
		{:else}
			<div class="flex flex-wrap gap-4 rounded-lg border border-border bg-canvas p-4">
				{#each rhythmDrawn as g (g.codepoint)}
					{@const stem = rhythmStemWidths.get(g.codepoint) ?? 0}
					{@const diff = stem && rhythmMedianStem ? stem - rhythmMedianStem : 0}
					{@const isOutlier = stem > 0 && Math.abs(diff) > 5}
					<div class="flex flex-col items-center gap-1">
						<svg
							viewBox="0 {project?.metrics.descender ?? -200} {Math.max(g.advanceWidth, 200)} {(project?.metrics.ascender ?? 800) - (project?.metrics.descender ?? -200)}"
							width="60"
							height="80"
							preserveAspectRatio="xMidYMid meet"
							style="transform: scaleY(-1);"
							aria-label={g.name}
						>
							<path
								d={contoursToSvgPath(g.contours)}
								fill="currentColor"
								fill-rule="evenodd"
							/>
						</svg>
						<div class="flex flex-col items-center text-[10px]">
							<span class="font-mono text-fg">{String.fromCodePoint(g.codepoint)}</span>
							{#if stem > 0}
								<span
									class="font-mono {isOutlier ? 'text-warn' : 'text-fg-subtle'}"
									data-numeric
								>
									{stem}
									{#if isOutlier}({diff > 0 ? '+' : ''}{diff}){/if}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			{#if rhythmMedianStem > 0}
				<p class="mt-2 text-[11px] text-fg-subtle">
					Median stem width:
					<span class="font-mono text-fg" data-numeric>{rhythmMedianStem}</span> ·
					Outliers marked in warn ({rhythmDrawn.filter((g) => {
						const s = rhythmStemWidths.get(g.codepoint);
						return s && Math.abs(s - rhythmMedianStem) > 5;
					}).length} of {rhythmDrawn.length})
				</p>
			{/if}
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Kerning pair editor
		</h2>
		<div class="grid grid-cols-[1fr_1fr_1fr] gap-3">
			<Field label="Left glyph">
				<Input maxlength={2} bind:value={leftChar} class="text-center text-lg" />
			</Field>
			<Field label="Right glyph">
				<Input maxlength={2} bind:value={rightChar} class="text-center text-lg" />
			</Field>
			<Field label="Adjustment (units)">
				<Input
					type="number"
					value={pendingValue}
					onchange={(e) => applyKerning(Number(e.currentTarget.value))}
				/>
			</Field>
		</div>

		<div class="mt-5 rounded-lg border border-border bg-canvas p-6 text-center">
			<div class="preview-font text-7xl leading-none" style="letter-spacing: 0;">
				{leftChar}{rightChar}
			</div>
			<div class="mt-3 text-[11px] text-fg-subtle" data-numeric>
				kern({leftChar}, {rightChar}) = {currentValue}
			</div>
		</div>
		{#if classExpansionPairs.length > 0}
			<div class="mt-3 rounded-lg border border-accent/30 bg-accent-soft/15 px-4 py-3">
				<div class="mb-2 text-[10px] font-semibold tracking-wider text-accent uppercase">
					Class expansion ({classExpansionPairs.length} pair{classExpansionPairs.length === 1 ? '' : 's'})
				</div>
				<div
					class="preview-font flex flex-wrap gap-x-4 gap-y-1 leading-snug"
					style="font-size: 32px;"
				>
					{#each classExpansionPairs as p (p.l + p.r)}
						<span>{p.l}{p.r}</span>
					{/each}
				</div>
				<p class="mt-2 text-[10px] text-fg-subtle">
					The kerning value above applies to every pair shown. Scan for outliers — some
					members may need their own pair override.
				</p>
			</div>
		{/if}
		{#if !isClassRef(parseSide(leftChar)) && !isClassRef(parseSide(rightChar)) && leftChar.length === 1 && rightChar.length === 1}
			<div class="mt-3 rounded-lg border border-border bg-canvas px-6 py-4">
				<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					In context
				</div>
				<div class="preview-font mt-2 text-3xl leading-snug">
					{`H${leftChar}H${leftChar}${rightChar}H${rightChar}H`}
				</div>
				<div class="preview-font mt-1 text-3xl leading-snug">
					{`n${leftChar}n${leftChar}${rightChar}n${rightChar}n`}
				</div>
				<div class="preview-font mt-1 text-2xl leading-snug text-fg-muted">
					{`The ${leftChar}${rightChar}erage ${leftChar}${rightChar}ailable ${leftChar}${rightChar}ailable`}
				</div>
			</div>
		{/if}

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<span class="text-[11px] font-medium text-fg-muted">Nudge:</span>
			{#each [-30, -10, -5, 0, 5, 10, 30] as delta (delta)}
				<Button
					density="sm"
					variant="secondary"
					onclick={() => applyKerning(currentValue + delta)}
				>
					{delta > 0 ? '+' : ''}{delta}
				</Button>
			{/each}
		</div>
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Common pair suggestions
			</h2>
			<label class="flex items-center gap-1.5 text-[11px] text-fg-muted">
				<input type="checkbox" bind:checked={pairsOnlyDrawn} class="accent-accent" />
				Only pairs both drawn
			</label>
		</div>
		<div class="flex flex-wrap gap-1.5">
			{#each visiblePairs as [l, r] (l + r)}
				{@const existing = projectStore.getKerningValue(cpOf(l), cpOf(r))}
				{@const hasKern = existing !== 0}
				<button
					type="button"
					class="rounded-md border px-2 py-1 font-mono text-[12px] {hasKern
						? 'border-accent/40 bg-accent-soft text-accent-strong'
						: 'border-border bg-surface-2 hover:border-accent hover:bg-accent-soft'}"
					onclick={() => {
						leftChar = l;
						rightChar = r;
					}}
					title={hasKern ? `Current kern: ${existing}` : 'Click to load this pair'}
				>
					{l}{r}
					{#if hasKern}<span class="ml-1 text-[10px] text-fg-subtle" data-numeric>{existing}</span>{/if}
				</button>
			{/each}
			{#if visiblePairs.length === 0}
				<p class="text-[11px] text-fg-subtle">
					No common pairs match — draw a couple uppercase letters first, then come back.
				</p>
			{/if}
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Bulk spacing
		</h2>
		<div class="mb-4 grid gap-3 md:grid-cols-2">
			<div>
				<div class="mb-1.5 text-[11px] font-medium text-fg-muted">Tabular figures</div>
				<p class="mb-2 text-[11px] text-fg-subtle">
					Set every digit to the widest digit's advance, centred — required for
					data tables and most UI.
				</p>
				<Button density="sm" variant="secondary" onclick={makeFiguresTabular}>
					Tabularise 0–9
				</Button>
			</div>
			<div>
				<div class="mb-1.5 text-[11px] font-medium text-fg-muted">Apply sidebearing</div>
				<div class="grid grid-cols-[auto_auto_auto_1fr] items-center gap-1.5">
					<select
						bind:value={bulkSbWhich}
						aria-label="Which sidebearing to apply"
						class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none"
					>
						<option value="both">LSB + RSB</option>
						<option value="left">LSB</option>
						<option value="right">RSB</option>
					</select>
					<span class="text-[11px] text-fg-subtle">=</span>
					<input
						type="number"
						bind:value={bulkSbValue}
						aria-label="Sidebearing value in font units"
						class="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px] outline-none"
					/>
					<select
						bind:value={bulkSbCategory}
						aria-label="Glyph category to apply to"
						class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none"
					>
						<option value="upper">to A–Z</option>
						<option value="lower">to a–z</option>
						<option value="figure">to 0–9</option>
						<option value="all">to all drawn</option>
					</select>
				</div>
				<Button
					density="sm"
					variant="secondary"
					onclick={() => setAllSidebearings(bulkSbWhich, bulkSbValue, bulkSbCategory)}
					class="mt-2"
				>
					Apply
				</Button>
			</div>
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Bulk import kerning
		</h2>
		<p class="mb-2 text-[12px] text-fg-subtle">
			Paste pairs as <code>left right value</code> per line. Comma or whitespace
			separated. Use <code>@classname</code> for class refs. Existing pairs are overwritten.
		</p>
		<textarea
			bind:value={bulkText}
			rows="5"
			placeholder={`A V -60\nT a -40\n@upper_left o -20`}
			class="block w-full resize-y rounded-md border border-border bg-surface-2/40 px-3 py-2 font-mono text-[12px] text-fg outline-none focus:border-accent focus:bg-surface"
		></textarea>
		<div class="mt-2 flex items-center justify-between gap-3">
			<span class="text-[11px] text-fg-subtle">
				{#if bulkResult}{bulkResult}{/if}
			</span>
			<Button density="sm" onclick={importBulkKerning} disabled={!bulkText.trim()}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Import pairs
			</Button>
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Group class="size-3" /> Kerning classes ({project?.classes?.length ?? 0})
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Group glyphs that share a side (e.g. <code>@A_left = [A Á Â Ä À]</code>).
			Then use the class name (with <code>@</code>) as either side of a kerning pair —
			one rule covers all members.
		</p>
		{#if classSuggestions.length > 0}
			<div class="mb-4 rounded-md border border-accent/30 bg-accent-soft/20 p-3">
				<div class="mb-2 text-[11px] font-semibold text-accent">
					Suggested from composites ({classSuggestions.length})
				</div>
				<p class="mb-2 text-[11px] text-fg-muted">
					Each base letter with composite variants becomes one class — kerning the
					base then automatically covers every accented form.
				</p>
				<div class="flex flex-wrap gap-1.5">
					{#each classSuggestions as s (s.name)}
						<button
							type="button"
							onclick={() => acceptClassSuggestion(s)}
							class="rounded-md border border-accent/40 bg-surface px-2 py-1 text-[11px] font-medium text-accent-strong hover:bg-accent-soft"
							title={s.basis}
						>
							+ <span class="font-mono">{s.name}</span>
							<span class="ml-1 text-fg-muted">({s.members.length})</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
		{#if project && (project.classes ?? []).length > 0}
			<ul class="mb-3 grid gap-1">
				{#each project.classes ?? [] as cls (cls.name)}
					<li
						class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
					>
						<span class="font-mono text-[13px] font-medium text-accent">{cls.name}</span>
						<span class="text-[12px] text-fg-muted">
							{cls.members.map((cp) => String.fromCodePoint(cp)).join(' ')}
						</span>
						<button
							type="button"
							onclick={() => {
								leftChar = cls.name;
							}}
							class="ml-auto rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
						>
							Use as left
						</button>
						<button
							type="button"
							onclick={() => {
								rightChar = cls.name;
							}}
							class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
						>
							Use as right
						</button>
						<button
							type="button"
							onclick={() => projectStore.removeKerningClass(cls.name)}
							class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
							aria-label="Remove class {cls.name}"
							title="Remove class {cls.name}"
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="grid grid-cols-[1fr_2fr_auto] items-end gap-2 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">
			<Field label="Class name (must start with @)">
				<Input density="sm" bind:value={newClassName} placeholder="@A_left" />
			</Field>
			<Field label="Member glyphs (space-separated)">
				<Input density="sm" bind:value={newClassMembers} placeholder="A Á Â Ä À Å Ã" />
			</Field>
			<Button density="sm" onclick={addClass}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Add class
			</Button>
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Pairs in this font ({project?.kerning.length ?? 0})
		</h2>
		{#if !project?.kerning || project.kerning.length === 0}
			<p class="text-sm text-fg-muted">No kerning yet. Add a pair above.</p>
		{:else}
			<ul class="grid gap-1">
				{#each project.kerning as pair (`${pair.left}-${pair.right}`)}
					<li
						class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
					>
						<button
							type="button"
							class="flex items-center gap-1 text-2xl font-medium"
							onclick={() => {
								leftChar = sideLabel(pair.left);
								rightChar = sideLabel(pair.right);
							}}
						>
							<span class={isClassRef(pair.left) ? 'font-mono text-[14px] text-accent' : 'preview-font'}>
								{sideLabel(pair.left)}
							</span>
							<span class={isClassRef(pair.right) ? 'font-mono text-[14px] text-accent' : 'preview-font'}>
								{sideLabel(pair.right)}
							</span>
						</button>
						<span class="ml-auto font-mono text-sm text-fg-muted" data-numeric>
							{pair.value > 0 ? '+' : ''}{pair.value}
						</span>
						<button
							type="button"
							onclick={() => removeKerning(pair.left, pair.right)}
							class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
							aria-label="Remove pair"
							title="Remove kerning pair"
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Globe class="size-3" /> Script packs
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Extend the default Latin set with Greek, Cyrillic, or Vietnamese. Adding a pack
			creates empty glyph slots — your existing glyphs are untouched.
		</p>
		<div class="grid gap-2 md:grid-cols-3">
			{#each SCRIPT_PACKS as pack (pack.id)}
				{@const present = project?.glyphs[pack.glyphs[0]?.codepoint ?? 0] !== undefined}
				<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3">
					<div class="text-[13px] font-medium text-fg">{pack.label}</div>
					<div class="mb-2 text-[11px] text-fg-subtle">{pack.description}</div>
					<Button
						density="sm"
						variant={present ? 'ghost' : 'secondary'}
						onclick={() => projectStore.addScriptPack(pack)}
						disabled={present}
					>
						{#snippet icon()}<Plus class="size-3.5" />{/snippet}
						{present ? 'Already added' : `Add ${pack.glyphs.length} glyphs`}
					</Button>
				</div>
			{/each}
		</div>
	</Panel>
</div>
</div>
