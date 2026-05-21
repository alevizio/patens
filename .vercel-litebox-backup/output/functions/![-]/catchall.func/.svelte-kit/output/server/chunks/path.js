//#region src/lib/font/path.ts
/** Round all coordinates to integer font units (required for clean rendering). */
var roundToFontUnits = (commands) => commands.map((c) => {
	if (c.type === "M" || c.type === "L") return {
		...c,
		x: Math.round(c.x),
		y: Math.round(c.y)
	};
	if (c.type === "Q") return {
		...c,
		x1: Math.round(c.x1),
		y1: Math.round(c.y1),
		x: Math.round(c.x),
		y: Math.round(c.y)
	};
	if (c.type === "C") return {
		...c,
		x1: Math.round(c.x1),
		y1: Math.round(c.y1),
		x2: Math.round(c.x2),
		y2: Math.round(c.y2),
		x: Math.round(c.x),
		y: Math.round(c.y)
	};
	return c;
});
/** Sample N points along a contour for bbox/area calculations. */
var sampleContour = (commands, stepsPerCurve = 16) => {
	const out = [];
	let cx = 0, cy = 0;
	for (const c of commands) if (c.type === "M" || c.type === "L") {
		out.push({
			x: c.x,
			y: c.y
		});
		cx = c.x;
		cy = c.y;
	} else if (c.type === "Q") {
		for (let i = 1; i <= stepsPerCurve; i++) {
			const t = i / stepsPerCurve;
			const mt = 1 - t;
			out.push({
				x: mt * mt * cx + 2 * mt * t * c.x1 + t * t * c.x,
				y: mt * mt * cy + 2 * mt * t * c.y1 + t * t * c.y
			});
		}
		cx = c.x;
		cy = c.y;
	} else if (c.type === "C") {
		for (let i = 1; i <= stepsPerCurve; i++) {
			const t = i / stepsPerCurve;
			const mt = 1 - t;
			out.push({
				x: mt * mt * mt * cx + 3 * mt * mt * t * c.x1 + 3 * mt * t * t * c.x2 + t * t * t * c.x,
				y: mt * mt * mt * cy + 3 * mt * mt * t * c.y1 + 3 * mt * t * t * c.y2 + t * t * t * c.y
			});
		}
		cx = c.x;
		cy = c.y;
	}
	return out;
};
var contourBounds = (commands) => {
	const pts = sampleContour(commands, 16);
	if (pts.length === 0) return {
		minX: 0,
		minY: 0,
		maxX: 0,
		maxY: 0
	};
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const p of pts) {
		if (p.x < minX) minX = p.x;
		if (p.x > maxX) maxX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.y > maxY) maxY = p.y;
	}
	return {
		minX,
		minY,
		maxX,
		maxY
	};
};
var glyphBounds = (contours) => {
	if (contours.length === 0) return {
		minX: 0,
		minY: 0,
		maxX: 0,
		maxY: 0
	};
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const c of contours) {
		const b = contourBounds(c.commands);
		if (b.minX < minX) minX = b.minX;
		if (b.maxX > maxX) maxX = b.maxX;
		if (b.minY < minY) minY = b.minY;
		if (b.maxY > maxY) maxY = b.maxY;
	}
	return {
		minX: isFinite(minX) ? minX : 0,
		minY: isFinite(minY) ? minY : 0,
		maxX: isFinite(maxX) ? maxX : 0,
		maxY: isFinite(maxY) ? maxY : 0
	};
};
/** Convert one contour to an SVG path string for previews. Y is NOT flipped here. */
var contourToSvgPath = (commands) => {
	const out = [];
	for (const c of commands) if (c.type === "M") out.push(`M ${c.x} ${c.y}`);
	else if (c.type === "L") out.push(`L ${c.x} ${c.y}`);
	else if (c.type === "Q") out.push(`Q ${c.x1} ${c.y1} ${c.x} ${c.y}`);
	else if (c.type === "C") out.push(`C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`);
	else if (c.type === "Z") out.push("Z");
	return out.join(" ");
};
var contoursToSvgPath = (contours) => contours.map((c) => contourToSvgPath(c.commands)).join(" ");
//#endregion
export { glyphBounds as n, roundToFontUnits as r, contoursToSvgPath as t };
