import { C as isClassRef } from "./project.js";
//#region src/lib/font/fea.ts
var STANDARD_LIGATURES = [
	{
		result: "fi",
		parts: ["f", "i"]
	},
	{
		result: "fl",
		parts: ["f", "l"]
	},
	{
		result: "ffi",
		parts: [
			"f",
			"f",
			"i"
		]
	},
	{
		result: "ffl",
		parts: [
			"f",
			"f",
			"l"
		]
	}
];
var psNameForCodepoint = (project, cp) => {
	return project.glyphs[cp]?.name ?? null;
};
/** Render a KerningSide as a .fea reference (glyph name or @class). */
var sideToFea = (side, project) => {
	if (isClassRef(side)) return side;
	return psNameForCodepoint(project, side);
};
var autoFeaSource = (project) => {
	const lines = [];
	lines.push("# Auto-generated from project state. Click \"Customize\" to take over.");
	lines.push("languagesystem DFLT dflt;");
	lines.push("languagesystem latn dflt;");
	lines.push("");
	const classes = project.classes ?? [];
	if (classes.length > 0) {
		for (const c of classes) {
			const names = c.members.map((cp) => psNameForCodepoint(project, cp)).filter((n) => !!n);
			if (names.length === 0) continue;
			lines.push(`${c.name} = [${names.join(" ")}];`);
		}
		lines.push("");
	}
	if (project.features.liga) {
		lines.push("feature liga {");
		for (const lig of STANDARD_LIGATURES) {
			const partNames = lig.parts.map((ch) => psNameForCodepoint(project, ch.codePointAt(0)));
			const resultName = psNameForCodepoint(project, lig.result.codePointAt(0));
			if (partNames.every((n) => n) && resultName) lines.push(`    sub ${partNames.join(" ")} by ${resultName};`);
		}
		lines.push("} liga;");
		lines.push("");
	}
	if (project.features.kern && project.kerning.length > 0) {
		lines.push("feature kern {");
		for (const pair of project.kerning) {
			const left = sideToFea(pair.left, project);
			const right = sideToFea(pair.right, project);
			if (left && right) lines.push(`    pos ${left} ${right} ${pair.value};`);
		}
		lines.push("} kern;");
		lines.push("");
	}
	const isMarkGlyph = (cp) => cp >= 768 && cp <= 879;
	const markAnchorsByBaseName = /* @__PURE__ */ new Map();
	const baseAnchorsByName = /* @__PURE__ */ new Map();
	for (const g of Object.values(project.glyphs)) {
		const ps = psNameForCodepoint(project, g.codepoint);
		if (!ps) continue;
		for (const a of g.anchors ?? []) if (a.name.startsWith("_")) {
			const base = a.name.slice(1);
			const arr = markAnchorsByBaseName.get(base) ?? [];
			arr.push({
				name: a.name,
				gName: ps,
				x: a.x,
				y: a.y
			});
			markAnchorsByBaseName.set(base, arr);
		} else if (!isMarkGlyph(g.codepoint)) {
			const arr = baseAnchorsByName.get(a.name) ?? [];
			arr.push({
				name: a.name,
				gName: ps,
				x: a.x,
				y: a.y
			});
			baseAnchorsByName.set(a.name, arr);
		}
	}
	const anchorNames = [...baseAnchorsByName.keys()].filter((n) => markAnchorsByBaseName.has(n));
	if (anchorNames.length > 0) {
		for (const name of anchorNames) {
			const marks = markAnchorsByBaseName.get(name) ?? [];
			for (const m of marks) lines.push(`markClass ${m.gName} <anchor ${m.x} ${m.y}> @MC_${name};`);
		}
		lines.push("");
		lines.push("feature mark {");
		for (const name of anchorNames) {
			const bases = baseAnchorsByName.get(name) ?? [];
			for (const b of bases) lines.push(`    pos base ${b.gName} <anchor ${b.x} ${b.y}> mark @MC_${name};`);
		}
		lines.push("} mark;");
		lines.push("");
	}
	return lines.join("\n");
};
//#endregion
export { autoFeaSource as t };
