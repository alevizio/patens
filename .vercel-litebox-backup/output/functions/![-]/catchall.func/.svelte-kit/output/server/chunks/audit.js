import { w as resolveVerticalMetrics } from "./project.js";
import { n as glyphBounds } from "./path.js";
//#region src/lib/font/peer-audit.ts
/**
* Peer-consistency audit.
*
* Existing audits check per-glyph rules (open contour, naming, advance overflow)
* and project-level invariants (vertical metrics consistency, control-set
* coverage). This module adds a *relational* layer: glyphs are grouped by
* structural class (round caps, vertical-stem caps, ascenders, descenders,
* round lowercase, figures), and each member's key dimensions are compared
* against the group's mean. Outliers — glyphs whose advance, top/bottom Y, or
* sidebearings drift unexpectedly far from their peers — are surfaced as audit
* issues.
*
* This catches the kind of slip-of-the-pen drift that a designer working alone
* commonly misses: an O that's a few units shorter than the other round caps,
* a tabular 5 with a different advance than the rest of the digits, a g
* descender that doesn't reach as far as p or q.
*/
/**
* Structural peer groups. Each glyph in a group is expected to share key
* dimensions with the others (with optical-compensation tolerance handled by
* the threshold logic below). Groups are intentionally conservative — letters
* are paired only with peers that genuinely *should* match.
*/
var PEER_GROUPS = [
	{
		id: "caps-rounds",
		label: "Round capitals (O C G Q)",
		codepoints: [
			79,
			67,
			71,
			81
		],
		checks: [
			"capTop",
			"baseline",
			"sidebearings",
			"advance"
		]
	},
	{
		id: "caps-stems",
		label: "Vertical-stem capitals (H I L M N E F)",
		codepoints: [
			72,
			73,
			76,
			77,
			78,
			69,
			70
		],
		checks: ["capTop", "baseline"]
	},
	{
		id: "caps-diagonals",
		label: "Diagonal capitals (A V W X Y K)",
		codepoints: [
			65,
			86,
			87,
			88,
			89,
			75
		],
		checks: ["capTop", "baseline"]
	},
	{
		id: "lower-rounds",
		label: "Round lowercase (o c e)",
		codepoints: [
			111,
			99,
			101
		],
		checks: [
			"xHeight",
			"baseline",
			"sidebearings",
			"advance"
		]
	},
	{
		id: "lower-stems",
		label: "Vertical-stem lowercase (n m h i l)",
		codepoints: [
			110,
			109,
			104,
			105,
			108
		],
		checks: ["xHeight", "baseline"]
	},
	{
		id: "lower-ascenders",
		label: "Ascenders (b d h k l)",
		codepoints: [
			98,
			100,
			104,
			107,
			108
		],
		checks: ["capTop", "baseline"]
	},
	{
		id: "lower-descenders",
		label: "Descenders (g p q y)",
		codepoints: [
			103,
			112,
			113,
			121
		],
		checks: ["baseline"]
	},
	{
		id: "figures",
		label: "Figures 0–9 (tabular consistency)",
		codepoints: [
			48,
			49,
			50,
			51,
			52,
			53,
			54,
			55,
			56,
			57
		],
		checks: [
			"advance",
			"capTop",
			"baseline"
		]
	}
];
/**
* Minimum threshold for a check to be considered an outlier, regardless of the
* group's standard deviation. Prevents micro-deviations on uniform groups from
* generating noise, while still flagging cases where every value happens to be
* near-identical except one.
*/
var minThresholdForCheck = (check, upm) => {
	const k = upm / 1e3;
	switch (check) {
		case "advance": return 5 * k;
		case "capTop":
		case "xHeight":
		case "baseline": return 6 * k;
		case "sidebearings": return 8 * k;
		case "bboxHeight": return 6 * k;
	}
};
var dimensionForCheck = (g, check) => {
	if (check === "advance") return g.advanceWidth;
	if (check === "sidebearings") return (g.leftSidebearing + g.rightSidebearing) / 2;
	if (g.contours.length === 0) return null;
	const b = glyphBounds(g.contours);
	if (check === "capTop" || check === "xHeight") return b.maxY;
	if (check === "baseline") return b.minY;
	if (check === "bboxHeight") return b.maxY - b.minY;
	return null;
};
var checkLabel = (check) => {
	switch (check) {
		case "advance": return "advance width";
		case "capTop": return "top";
		case "xHeight": return "top";
		case "baseline": return "baseline reach";
		case "sidebearings": return "sidebearings (mean)";
		case "bboxHeight": return "bbox height";
	}
};
/**
* Run peer audit across every PEER_GROUP. Returns standard AuditIssue records
* so the existing audit pipeline (preflightProject, audit page UI) can consume
* them without further changes.
*/
var auditPeers = (project) => {
	const issues = [];
	const upm = project.metrics.unitsPerEm;
	for (const group of PEER_GROUPS) {
		const items = [];
		for (const cp of group.codepoints) {
			const g = project.glyphs[cp];
			if (g && g.contours.length > 0) items.push({
				cp,
				g
			});
		}
		if (items.length < 3) continue;
		for (const check of group.checks) {
			const values = [];
			for (const item of items) {
				const v = dimensionForCheck(item.g, check);
				if (v !== null && Number.isFinite(v)) values.push({
					cp: item.cp,
					val: v
				});
			}
			if (values.length < 3) continue;
			const mean = values.reduce((s, x) => s + x.val, 0) / values.length;
			const variance = values.reduce((s, x) => s + (x.val - mean) ** 2, 0) / values.length;
			const std = Math.sqrt(variance);
			const threshold = Math.max(std * 2, minThresholdForCheck(check, upm));
			for (const item of values) {
				const deviation = item.val - mean;
				const absDev = Math.abs(deviation);
				if (absDev <= threshold) continue;
				const direction = deviation > 0 ? "+" : "";
				const severity = absDev > threshold * 2 ? "warn" : "info";
				const name = project.glyphs[item.cp]?.name ?? "?";
				const char = item.cp > 32 && item.cp < 65536 ? `"${String.fromCodePoint(item.cp)}" ` : "";
				issues.push({
					codepoint: item.cp,
					severity,
					code: `peer-${group.id}-${check}`,
					message: `${char}${name}: ${checkLabel(check)} ${Math.round(item.val)} drifts ${direction}${Math.round(deviation)}u from ${group.label} mean ${Math.round(mean)} (σ${Math.round(std)}, ${values.length} peers).`
				});
			}
		}
	}
	return issues;
};
//#endregion
//#region src/lib/font/audit.ts
var auditGlyph = (glyph, project) => {
	const issues = [];
	const cp = glyph.codepoint;
	const drawn = glyph.contours.length > 0;
	const composite = !!(glyph.components && glyph.components.length > 0);
	if (!drawn && !composite && cp !== 32) issues.push({
		codepoint: cp,
		severity: "info",
		code: "empty",
		message: "No outlines yet"
	});
	if (drawn) {
		const b = glyphBounds(glyph.contours);
		if (b.maxY > project.metrics.ascender + 50) issues.push({
			codepoint: cp,
			severity: "warn",
			code: "extends-above-ascender",
			message: `Top of glyph (${Math.round(b.maxY)}) is above ascender (${project.metrics.ascender})`
		});
		if (b.minY < project.metrics.descender - 50) issues.push({
			codepoint: cp,
			severity: "warn",
			code: "extends-below-descender",
			message: `Bottom of glyph (${Math.round(b.minY)}) is below descender (${project.metrics.descender})`
		});
		if (glyph.advanceWidth <= 0) issues.push({
			codepoint: cp,
			severity: "error",
			code: "zero-advance",
			message: "Advance width is 0"
		});
		else if (b.maxX > glyph.advanceWidth + 5) issues.push({
			codepoint: cp,
			severity: "warn",
			code: "overflows-advance",
			message: `Glyph extends past advance width (${Math.round(b.maxX)} vs ${glyph.advanceWidth})`
		});
		const openContours = glyph.contours.filter((c) => !c.closed);
		if (openContours.length > 0) issues.push({
			codepoint: cp,
			severity: "error",
			code: "open-contour",
			message: `${openContours.length} open contour${openContours.length === 1 ? "" : "s"}`
		});
	}
	if (composite) for (const ref of glyph.components ?? []) {
		const base = project.glyphs[ref.baseCodepoint];
		if (!base || base.contours.length === 0 && (!base.components || base.components.length === 0)) issues.push({
			codepoint: cp,
			severity: "warn",
			code: "composite-missing-base",
			message: `References U+${ref.baseCodepoint.toString(16).toUpperCase().padStart(4, "0")} which has no outlines`
		});
	}
	if (glyph.notes && /(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes)) issues.push({
		codepoint: cp,
		severity: "info",
		code: "notes-todo",
		message: "Notes contain TODO/FIXME — open work item."
	});
	if (glyph.flagged) issues.push({
		codepoint: cp,
		severity: "info",
		code: "flagged-for-review",
		message: "Flagged for review — ⇧F to clear once addressed."
	});
	const NAME_RE = /^[A-Za-z._][A-Za-z0-9._-]*$/;
	if (!glyph.name.trim()) issues.push({
		codepoint: cp,
		severity: "error",
		code: "glyph-name-empty",
		message: "Glyph name is empty"
	});
	else if (!NAME_RE.test(glyph.name)) issues.push({
		codepoint: cp,
		severity: "warn",
		code: "glyph-name-invalid",
		message: `Name "${glyph.name}" contains characters disallowed in OpenType post table (allowed: A-Z a-z 0-9 . _ -, must start with letter or .)`
	});
	else if (glyph.name.length > 63) issues.push({
		codepoint: cp,
		severity: "warn",
		code: "glyph-name-too-long",
		message: `Name "${glyph.name.slice(0, 30)}…" exceeds 63 chars (OpenType post table limit)`
	});
	return issues;
};
var auditProject = (project) => {
	const out = [];
	for (const g of Object.values(project.glyphs)) out.push(...auditGlyph(g, project));
	return out;
};
/**
* Per-glyph contour + point-count compatibility across all masters.
* Variable-font interpolation requires every master to match exactly.
*/
var auditCompatibility = (project) => {
	if (!project.masters || project.masters.length === 0) return [];
	const issues = [];
	const masters = [{
		name: "Default",
		glyphs: project.glyphs
	}, ...project.masters.map((m) => ({
		name: m.name,
		glyphs: m.glyphs
	}))];
	const codepoints = /* @__PURE__ */ new Set();
	for (const m of masters) for (const cp of Object.keys(m.glyphs)) codepoints.add(Number(cp));
	for (const cp of codepoints) {
		const drawn = masters.map((m) => ({
			name: m.name,
			glyph: m.glyphs[cp]
		})).filter((v) => v.glyph?.contours && v.glyph.contours.length > 0);
		if (drawn.length === 0) continue;
		const counts = drawn.map((d) => d.glyph.contours.length);
		if (new Set(counts).size > 1) {
			issues.push({
				codepoint: cp,
				severity: "error",
				code: "master-contour-count",
				message: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}: contour count differs across masters (${counts.join(" / ")})`
			});
			continue;
		}
		for (let ci = 0; ci < counts[0]; ci++) {
			const pointCounts = drawn.map((d) => d.glyph.contours[ci]?.commands.length ?? 0);
			if (new Set(pointCounts).size > 1) issues.push({
				codepoint: cp,
				severity: "error",
				code: "master-point-count",
				message: `U+${cp.toString(16).toUpperCase().padStart(4, "0")} contour ${ci}: point count differs across masters (${pointCounts.join(" / ")})`
			});
		}
	}
	return issues;
};
/**
* Project-level pre-flight checks aligned with FontBakery's check-universal
* and Google Fonts' naming/metrics guidance. Run before export.
*/
var preflightProject = (project) => {
	const issues = [];
	if (!project.metadata.familyName.trim()) issues.push({
		codepoint: 0,
		severity: "error",
		code: "naming-family",
		message: "Family name is empty"
	});
	if (!project.metadata.styleName.trim()) issues.push({
		codepoint: 0,
		severity: "error",
		code: "naming-style",
		message: "Style name is empty"
	});
	if (!project.metadata.version.trim()) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "naming-version",
		message: "Version is empty (defaulting to 1.000)"
	});
	if (project.metadata.familyName.length > 31) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "naming-family-long",
		message: "Family name longer than 31 characters may break legacy app menus"
	});
	if (/[^A-Za-z0-9 -]/.test(project.metadata.familyName)) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "naming-family-chars",
		message: "Family name contains special characters — some apps reject anything beyond letters/digits/space"
	});
	const vm = resolveVerticalMetrics(project.metrics);
	if (vm.typoAscender !== vm.hheaAscender) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "metrics-asc-mismatch",
		message: `OS/2 typoAscender (${vm.typoAscender}) does not match hhea ascender (${vm.hheaAscender})`
	});
	if (vm.typoDescender !== vm.hheaDescender) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "metrics-desc-mismatch",
		message: `OS/2 typoDescender (${vm.typoDescender}) does not match hhea descender (${vm.hheaDescender})`
	});
	if (vm.typoLineGap !== vm.hheaLineGap) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "metrics-gap-mismatch",
		message: `OS/2 typoLineGap (${vm.typoLineGap}) does not match hhea lineGap (${vm.hheaLineGap})`
	});
	if (!vm.useTypoMetrics) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "metrics-use-typo-off",
		message: "USE_TYPO_METRICS flag is off — line spacing will vary across platforms"
	});
	if (vm.winAscent < vm.typoAscender) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "metrics-win-clip-top",
		message: `winAscent (${vm.winAscent}) is below typoAscender — glyphs may clip on Windows`
	});
	if (vm.winDescent < Math.abs(vm.typoDescender)) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "metrics-win-clip-bottom",
		message: `winDescent (${vm.winDescent}) is below |typoDescender| — descenders may clip on Windows`
	});
	if (project.metrics.unitsPerEm < 1e3 || project.metrics.unitsPerEm > 16384) issues.push({
		codepoint: 0,
		severity: "warn",
		code: "upm-unusual",
		message: `UPM ${project.metrics.unitsPerEm} is outside the typical 1000–2048 range`
	});
	const missingControl = [
		78,
		79,
		110,
		111,
		72,
		97,
		101,
		115,
		99,
		112,
		118,
		121
	].filter((cp) => (project.glyphs[cp]?.contours.length ?? 0) === 0);
	if (missingControl.length > 0) {
		const labels = missingControl.map((cp) => String.fromCodePoint(cp)).join(" ");
		issues.push({
			codepoint: 0,
			severity: "info",
			code: "control-glyphs-missing",
			message: `Control set incomplete (${missingControl.length}/12): ${labels} — these set proportion + texture for the whole family`
		});
	}
	let anchorless = 0;
	for (const g of Object.values(project.glyphs)) if (g.contours.length > 0 && g.codepoint >= 65 && g.codepoint <= 122) {
		if ((g.anchors ?? []).length === 0) anchorless++;
	}
	if (anchorless > 0) issues.push({
		codepoint: 0,
		severity: "info",
		code: "anchors-missing",
		message: `${anchorless} Latin base glyphs have no anchors — composites with marks will use fixed offsets instead of proper positioning`
	});
	const digits = [];
	for (let cp = 48; cp <= 57; cp++) {
		const g = project.glyphs[cp];
		if (g && g.contours.length > 0) digits.push(g.advanceWidth);
	}
	if (digits.length >= 2) {
		const min = Math.min(...digits);
		const max = Math.max(...digits);
		if (max - min > 2) issues.push({
			codepoint: 0,
			severity: "info",
			code: "figures-non-tabular",
			message: `Digits 0–9 have varying advance widths (${min}–${max}) — proportional figures. For data tables, run "Tabularise 0–9" on the Spacing tab.`
		});
	}
	const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
	if (drawn < 26) issues.push({
		codepoint: 0,
		severity: "info",
		code: "glyph-count-low",
		message: `Only ${drawn} glyphs drawn — most apps expect at least full A–Z + a–z + 0–9 + punctuation (~95 glyphs) for a usable font`
	});
	const brief = project.brief ?? {};
	if (!brief.intent?.trim() && drawn >= 12) issues.push({
		codepoint: 0,
		severity: "info",
		code: "brief-no-intent",
		message: "No brief.intent set. Even one sentence about who this is for and at what size keeps later decisions honest."
	});
	if (!brief.designNotes?.trim() && drawn >= 50) issues.push({
		codepoint: 0,
		severity: "info",
		code: "brief-no-design-notes",
		message: "No design-notes essay yet. Foundries that explain their decisions (KLIM, Hoefler, Commercial Type) get studied — write 2–3 paragraphs while the choices are still fresh."
	});
	const kernCount = project.kerning.length;
	const classCount = project.classes?.length ?? 0;
	if (kernCount > 100 && classCount === 0) issues.push({
		codepoint: 0,
		severity: "info",
		code: "kerning-no-classes",
		message: `${kernCount} flat kerning pairs and 0 kerning classes — consider grouping accented variants (e.g. @A_left = [A Á Â Ä À]) to consolidate and stay maintainable.`
	});
	const sbClassCount = project.sidebearingClasses?.length ?? 0;
	if (drawn >= 26 && sbClassCount === 0) issues.push({
		codepoint: 0,
		severity: "info",
		code: "sidebearings-no-classes",
		message: "No sidebearing classes yet. Grouping vertical stems / rounds / diagonals lets you tune spacing systematically before reaching for kerning pairs."
	});
	if ((project.masters?.length ?? 0) > 0) {
		const compatIssues = auditCompatibility(project);
		issues.push(...compatIssues);
	}
	if ((project.axes?.length ?? 0) > 0) {
		for (const a of project.axes ?? []) if (a.minimum > a.default || a.default > a.maximum) issues.push({
			codepoint: 0,
			severity: "error",
			code: "axis-range-invalid",
			message: `Axis '${a.tag}' has min/default/max out of order (${a.minimum} / ${a.default} / ${a.maximum})`
		});
		for (const m of project.masters ?? []) for (const [tag, val] of Object.entries(m.location)) {
			const axis = (project.axes ?? []).find((a) => a.tag === tag);
			if (!axis) issues.push({
				codepoint: 0,
				severity: "warn",
				code: "master-orphan-axis",
				message: `Master '${m.name}' references undefined axis '${tag}'`
			});
			else if (val < axis.minimum || val > axis.maximum) issues.push({
				codepoint: 0,
				severity: "warn",
				code: "master-out-of-range",
				message: `Master '${m.name}' value ${val} for '${tag}' is outside axis range ${axis.minimum}..${axis.maximum}`
			});
		}
		for (const inst of project.instances ?? []) for (const tag of Object.keys(inst.location)) if (!(project.axes ?? []).some((a) => a.tag === tag)) issues.push({
			codepoint: 0,
			severity: "warn",
			code: "instance-orphan-axis",
			message: `Instance '${inst.styleName}' references undefined axis '${tag}'`
		});
		if ((project.instances?.length ?? 0) === 0) issues.push({
			codepoint: 0,
			severity: "info",
			code: "no-instances",
			message: "Variable font has no named instances — OS font menus may only show \"Regular\". Add at least Regular + Bold on the Designspace tab."
		});
	}
	for (const cls of project.classes ?? []) {
		if (!cls.name.startsWith("@")) issues.push({
			codepoint: 0,
			severity: "warn",
			code: "class-name-format",
			message: `Kerning class '${cls.name}' should start with '@'`
		});
		if (cls.members.length === 0) issues.push({
			codepoint: 0,
			severity: "info",
			code: "class-empty",
			message: `Kerning class '${cls.name}' has no members`
		});
		for (const cp of cls.members) if (!project.glyphs[cp]) {
			issues.push({
				codepoint: cp,
				severity: "warn",
				code: "class-missing-member",
				message: `Kerning class '${cls.name}' references missing glyph U+${cp.toString(16).toUpperCase().padStart(4, "0")}`
			});
			break;
		}
	}
	const classNames = new Set((project.classes ?? []).map((c) => c.name));
	for (const pair of project.kerning) for (const side of [pair.left, pair.right]) if (typeof side === "string") {
		if (!classNames.has(side)) issues.push({
			codepoint: 0,
			severity: "warn",
			code: "pair-orphan-class",
			message: `Kerning pair references undefined class '${side}'`
		});
	} else if (!project.glyphs[side]) issues.push({
		codepoint: side,
		severity: "warn",
		code: "pair-missing-glyph",
		message: `Kerning pair references missing glyph U+${side.toString(16).toUpperCase().padStart(4, "0")}`
	});
	issues.push(...auditPeers(project));
	return sortBySeverity(issues);
};
var SEVERITY_ORDER = {
	error: 0,
	warn: 1,
	info: 2
};
var sortBySeverity = (issues) => [...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
//#endregion
export { sortBySeverity as a, preflightProject as i, auditGlyph as n, auditProject as r, auditCompatibility as t };
