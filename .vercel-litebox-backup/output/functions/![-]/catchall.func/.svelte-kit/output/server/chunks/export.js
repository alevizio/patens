import { n as glyphBounds, r as roundToFontUnits } from "./path.js";
import opentype from "opentype.js";
//#region src/lib/font/notdef.ts
var buildNotdefContours = (metrics) => {
	const top = metrics.capHeight;
	const left = 60;
	const right = 540;
	return [{
		closed: true,
		winding: "ccw",
		commands: [
			{
				type: "M",
				x: left,
				y: 0
			},
			{
				type: "L",
				x: left,
				y: top
			},
			{
				type: "L",
				x: right,
				y: top
			},
			{
				type: "L",
				x: right,
				y: 0
			},
			{ type: "Z" }
		]
	}, {
		closed: true,
		winding: "cw",
		commands: [
			{
				type: "M",
				x: left + 80,
				y: 60
			},
			{
				type: "L",
				x: right - 80,
				y: 60
			},
			{
				type: "L",
				x: right - 80,
				y: top - 60
			},
			{
				type: "L",
				x: left + 80,
				y: top - 60
			},
			{ type: "Z" }
		]
	}];
};
//#endregion
//#region src/lib/font/export.ts
/**
* Build an opentype.js Font from a Project.
* Used by both the live preview pipeline and the OTF/TTF exporter.
*
* Future escape hatch: if opentype.js can't write a feature we need,
* lazy-load Pyodide + fontTools and run that step there.
*/
var applyCommandsToPath = (path, commands) => {
	for (const c of commands) switch (c.type) {
		case "M":
			path.moveTo(c.x, c.y);
			break;
		case "L":
			path.lineTo(c.x, c.y);
			break;
		case "Q":
			path.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
			break;
		case "C":
			path.curveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
			break;
		case "Z":
			path.close();
			break;
	}
};
var contoursToOpenTypePath = (contours) => {
	const path = new opentype.Path();
	for (const contour of contours) applyCommandsToPath(path, roundToFontUnits(contour.commands));
	return path;
};
/**
* Resolve effective contours for a glyph, including composite components.
*
* For composites with two components (typical base + mark pattern), we look
* for matching anchors: an anchor named 'top' on the first component aligns
* with an anchor named '_top' on the second component (Glyphs / UFO
* convention). When a match is found it overrides the stored xy offset.
*/
var effectiveContoursWithMap = (glyph, glyphs, depth = 0) => {
	if (depth > 4) return glyph.contours;
	if (glyph.contours.length > 0) return glyph.contours;
	if (!glyph.components || glyph.components.length === 0) return [];
	const components = glyph.components;
	const translations = components.map((c) => ({
		dx: c.offsetX,
		dy: c.offsetY
	}));
	if (components.length >= 2) {
		const base = glyphs[components[0].baseCodepoint];
		if (base) for (let i = 1; i < components.length; i++) {
			const mark = glyphs[components[i].baseCodepoint];
			if (!mark) continue;
			const anchorPair = findAnchorPair(base.anchors, mark.anchors);
			if (anchorPair) translations[i] = {
				dx: anchorPair.baseX - anchorPair.markX,
				dy: anchorPair.baseY - anchorPair.markY
			};
		}
	}
	const out = [];
	for (let i = 0; i < components.length; i++) {
		const ref = components[i];
		const t = translations[i];
		const base = glyphs[ref.baseCodepoint];
		if (!base) continue;
		const baseContours = effectiveContoursWithMap(base, glyphs, depth + 1);
		for (const c of baseContours) out.push({
			...c,
			commands: c.commands.map((cmd) => translate(cmd, t.dx, t.dy))
		});
	}
	return out;
};
/**
* Find a pair of anchors where the base has 'X' and the mark has '_X'
* (Glyphs / UFO convention).
*/
var findAnchorPair = (baseAnchors, markAnchors) => {
	if (!baseAnchors || !markAnchors) return null;
	for (const m of markAnchors) {
		if (!m.name.startsWith("_")) continue;
		const base = baseAnchors.find((b) => b.name === m.name.slice(1));
		if (base) return {
			baseX: base.x,
			baseY: base.y,
			markX: m.x,
			markY: m.y
		};
	}
	return null;
};
var translate = (c, dx, dy) => {
	if (c.type === "M" || c.type === "L") return {
		...c,
		x: c.x + dx,
		y: c.y + dy
	};
	if (c.type === "Q") return {
		...c,
		x1: c.x1 + dx,
		y1: c.y1 + dy,
		x: c.x + dx,
		y: c.y + dy
	};
	if (c.type === "C") return {
		...c,
		x1: c.x1 + dx,
		y1: c.y1 + dy,
		x2: c.x2 + dx,
		y2: c.y2 + dy,
		x: c.x + dx,
		y: c.y + dy
	};
	return c;
};
/** Compute advance width: explicit if set, otherwise bbox + sidebearings. */
var effectiveAdvanceWidth = (glyph, contours) => {
	if (glyph.advanceWidth > 0) return glyph.advanceWidth;
	if (contours.length === 0) return Math.max(50, glyph.leftSidebearing + glyph.rightSidebearing);
	const b = glyphBounds(contours);
	return Math.max(50, Math.round(b.maxX + glyph.rightSidebearing));
};
var buildFont = (project, opts = {}) => {
	const { metrics, metadata } = project;
	let activeGlyphs = project.glyphs;
	let styleName = metadata.styleName || "Regular";
	if (opts.masterId) {
		const master = (project.masters ?? []).find((m) => m.id === opts.masterId);
		if (master) {
			activeGlyphs = master.glyphs;
			styleName = opts.styleSuffix ?? master.name;
		}
	}
	const notdefPath = contoursToOpenTypePath(buildNotdefContours(metrics));
	const glyphs = [new opentype.Glyph({
		name: ".notdef",
		unicode: 0,
		advanceWidth: 600,
		path: notdefPath
	})];
	const indexByCodepoint = /* @__PURE__ */ new Map();
	indexByCodepoint.set(0, 0);
	const codepoints = Object.keys(activeGlyphs).map((s) => Number(s)).sort((a, b) => a - b);
	for (const cp of codepoints) {
		const g = activeGlyphs[cp];
		const eff = effectiveContoursWithMap(g, activeGlyphs);
		const advanceWidth = effectiveAdvanceWidth(g, eff);
		const path = contoursToOpenTypePath(eff);
		const otGlyph = new opentype.Glyph({
			name: g.name || `uni${cp.toString(16).toUpperCase().padStart(4, "0")}`,
			unicode: cp,
			advanceWidth,
			path
		});
		indexByCodepoint.set(cp, glyphs.length);
		glyphs.push(otGlyph);
	}
	const font = new opentype.Font({
		familyName: metadata.familyName || "Untitled",
		styleName,
		unitsPerEm: metrics.unitsPerEm,
		ascender: metrics.ascender,
		descender: metrics.descender,
		designer: metadata.designer || "",
		designerURL: "",
		manufacturer: metadata.designer || "",
		manufacturerURL: "",
		license: metadata.license || "",
		licenseURL: "",
		version: metadata.version || "1.000",
		copyright: metadata.copyright || "",
		glyphs
	});
	if (project.features.kern) {
		const pairs = {};
		for (const k of project.kerning) {
			if (typeof k.left === "string" || typeof k.right === "string") continue;
			const li = indexByCodepoint.get(k.left);
			const ri = indexByCodepoint.get(k.right);
			if (li === void 0 || ri === void 0) continue;
			pairs[`${li},${ri}`] = k.value;
		}
		font.kerningPairs = pairs;
	}
	const os2 = font.tables?.os2;
	if (os2) os2.fsType = metadata.fsType ?? 0;
	return {
		font,
		indexByCodepoint,
		glyphCount: glyphs.length
	};
};
//#endregion
export { buildFont as t };
