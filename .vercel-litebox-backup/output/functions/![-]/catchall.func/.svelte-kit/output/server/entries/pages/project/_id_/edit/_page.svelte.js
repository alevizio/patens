import "../../../../../chunks/index-server.js";
import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import { t as toast } from "../../../../../chunks/toast2.svelte.js";
import { t as Icon } from "../../../../../chunks/Icon.js";
import { n as Circle_check, t as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { t as X } from "../../../../../chunks/x.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { n as glyphBounds, t as contoursToSvgPath } from "../../../../../chunks/path.js";
import { t as previewStore } from "../../../../../chunks/preview.svelte.js";
import { t as settings } from "../../../../../chunks/settings.svelte.js";
import { t as Pin } from "../../../../../chunks/pin.js";
import { n as Input, t as Field } from "../../../../../chunks/Field.js";
import { t as Plus } from "../../../../../chunks/plus.js";
import { i as Ruler, n as Circle_question_mark, r as Lock_open, t as Chevron_down } from "../../../../../chunks/chevron-down.js";
import { t as Eye } from "../../../../../chunks/eye.js";
import { t as Sliders_horizontal } from "../../../../../chunks/sliders-horizontal.js";
import { t as File_text } from "../../../../../chunks/file-text.js";
import { t as Lock } from "../../../../../chunks/lock.js";
import { a as sortBySeverity, n as auditGlyph } from "../../../../../chunks/audit.js";
import { t as Button } from "../../../../../chunks/Button.js";
import { t as Eye_off } from "../../../../../chunks/eye-off.js";
import { t as Trash_2 } from "../../../../../chunks/trash-2.js";
import { t as Pencil } from "../../../../../chunks/pencil.js";
import { t as Wand_sparkles } from "../../../../../chunks/wand-sparkles.js";
import { t as Copy } from "../../../../../chunks/copy.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
import { t as Rotate_ccw } from "../../../../../chunks/rotate-ccw.js";
import { getStroke } from "perfect-freehand";
import polygonClipping from "polygon-clipping";
import fitCurve from "fit-curve";
//#region src/lib/font/sketch-to-bezier.ts
/**
* Convert a freehand sketch into clean bezier contours.
*
* Pipeline:
*  1. perfect-freehand turns each stroke into an outline polygon
*  2. Douglas–Peucker simplification reduces polygon vertex count
*  3. Convert the simplified polygon to a closed BezierContour using
*     short cubic segments (smoothed by the simplification).
*
* This is intentionally simple — real Schneider-style bezier fitting would
* produce smoother curves but adds substantial complexity. We trade a bit
* of curve quality for predictability; the user can refine in the vector
* editor afterwards.
*/
var DEFAULT_STROKE = {
	size: 36,
	thinning: .55,
	smoothing: .55,
	streamline: .6,
	simplifyTolerance: 1.5
};
var DEFAULT_TRACE = {
	cubic: true,
	cubicMaxError: 60
};
var distSq = (a, b) => {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
};
var perpDistSq = (point, a, b) => {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	if (dx === 0 && dy === 0) return distSq(point, a);
	const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy);
	const px = a[0] + t * dx;
	const py = a[1] + t * dy;
	const ex = point[0] - px;
	const ey = point[1] - py;
	return ex * ex + ey * ey;
};
var douglasPeucker = (points, tolerance) => {
	if (points.length < 3) return points.slice();
	const tolSq = tolerance * tolerance;
	const keep = new Uint8Array(points.length);
	keep[0] = 1;
	keep[points.length - 1] = 1;
	const stack = [[0, points.length - 1]];
	while (stack.length > 0) {
		const [first, last] = stack.pop();
		let maxDist = 0;
		let idx = -1;
		for (let i = first + 1; i < last; i++) {
			const d = perpDistSq(points[i], points[first], points[last]);
			if (d > maxDist) {
				maxDist = d;
				idx = i;
			}
		}
		if (idx !== -1 && maxDist > tolSq) {
			keep[idx] = 1;
			stack.push([first, idx], [idx, last]);
		}
	}
	const out = [];
	for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
	return out;
};
var polygonToContour = (poly, winding = "ccw") => {
	if (poly.length === 0) return {
		closed: true,
		winding,
		commands: []
	};
	const commands = [{
		type: "M",
		x: poly[0][0],
		y: poly[0][1]
	}];
	for (let i = 1; i < poly.length; i++) commands.push({
		type: "L",
		x: poly[i][0],
		y: poly[i][1]
	});
	commands.push({ type: "Z" });
	return {
		closed: true,
		winding,
		commands
	};
};
/** Convert a closed polygon to a contour of cubic bezier curves via Schneider's algorithm. */
var polygonToCubicContour = (poly, winding = "ccw", maxError = 60) => {
	if (poly.length < 4) return polygonToContour(poly, winding);
	const pts = [...poly, poly[0]];
	let curves;
	try {
		curves = fitCurve(pts, maxError);
	} catch {
		return polygonToContour(poly, winding);
	}
	if (!curves || curves.length === 0) return polygonToContour(poly, winding);
	const commands = [{
		type: "M",
		x: curves[0][0][0],
		y: curves[0][0][1]
	}];
	for (const curve of curves) commands.push({
		type: "C",
		x1: curve[1][0],
		y1: curve[1][1],
		x2: curve[2][0],
		y2: curve[2][1],
		x: curve[3][0],
		y: curve[3][1]
	});
	commands.push({ type: "Z" });
	return {
		closed: true,
		winding,
		commands
	};
};
var strokeToOutlinePolygon = (stroke, style) => {
	if (stroke.points.length < 2) return null;
	const outline = getStroke(stroke.points.map((p) => [
		p.x,
		p.y,
		Math.min(Math.max(p.pressure, 0), 1)
	]), {
		size: style.size,
		thinning: style.thinning,
		smoothing: style.smoothing,
		streamline: style.streamline,
		simulatePressure: false,
		last: true
	});
	if (outline.length < 3) return null;
	const simplified = douglasPeucker(outline, style.simplifyTolerance);
	if (simplified.length < 3) return null;
	return simplified;
};
/**
* Convert all sketch strokes into vector contours, merging overlapping strokes
* with a polygon boolean union. The result is a clean silhouette for multi-stroke
* letters like H, A, X — each MultiPolygon ring becomes a separate contour with
* outer rings winding CCW and holes CW (CFF convention).
*
* When `trace.cubic` is true (default), each ring is fitted with Schneider's
* cubic-bezier algorithm producing smooth curves instead of polyline edges.
*/
var sketchToContours = (strokes, style = DEFAULT_STROKE, trace = DEFAULT_TRACE) => {
	const polys = [];
	for (const s of strokes) {
		const p = strokeToOutlinePolygon(s, style);
		if (p) polys.push(p);
	}
	if (polys.length === 0) return [];
	const ringToContour = (ring, winding) => trace.cubic ? polygonToCubicContour(ring, winding, trace.cubicMaxError) : polygonToContour(ring, winding);
	if (polys.length === 1) return [ringToContour(polys[0], "ccw")];
	let merged;
	try {
		const geoms = polys.map((p) => [p]);
		merged = polygonClipping.union(geoms[0], ...geoms.slice(1));
	} catch {
		return polys.map((p) => ringToContour(p, "ccw"));
	}
	const out = [];
	for (const poly of merged) for (let ringIdx = 0; ringIdx < poly.length; ringIdx++) {
		const ring = poly[ringIdx];
		if (ring.length < 4) continue;
		const last = ring[ring.length - 1];
		const first = ring[0];
		const cleaned = last[0] === first[0] && last[1] === first[1] ? ring.slice(0, -1) : ring.slice();
		out.push(ringToContour(cleaned, ringIdx === 0 ? "ccw" : "cw"));
	}
	return out;
};
/** Produce an SVG path for the live preview of a single sketch stroke (filled). */
var sketchOutlineSvg = (stroke, style = DEFAULT_STROKE) => {
	if (stroke.points.length === 0) return "";
	const outline = getStroke(stroke.points.map((p) => [
		p.x,
		p.y,
		Math.min(Math.max(p.pressure, 0), 1)
	]), {
		size: style.size,
		thinning: style.thinning,
		smoothing: style.smoothing,
		streamline: style.streamline,
		simulatePressure: false,
		last: false
	});
	if (outline.length < 3) return "";
	let d = `M ${outline[0][0]} ${outline[0][1]}`;
	for (let i = 1; i < outline.length; i++) d += ` L ${outline[i][0]} ${outline[i][1]}`;
	d += " Z";
	return d;
};
//#endregion
//#region src/lib/drawing/MetricsOverlay.svelte
function MetricsOverlay($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { metrics, advanceWidth, leftSidebearing, rightSidebearing, showGrid = false, showAnatomy = false } = $$props;
		const overshoot = derived(() => Math.round(metrics.capHeight * .02));
		const advance = derived(() => advanceWidth);
		const guideLines = derived(() => [
			{
				y: metrics.ascender,
				label: "asc",
				color: "var(--color-ascender)"
			},
			{
				y: metrics.capHeight,
				label: "cap",
				color: "var(--color-cap-height)"
			},
			{
				y: metrics.xHeight,
				label: "x",
				color: "var(--color-x-height)"
			},
			{
				y: 0,
				label: "base",
				color: "var(--color-baseline)"
			},
			{
				y: metrics.descender,
				label: "desc",
				color: "var(--color-descender)"
			}
		]);
		$$renderer.push(`<g class="pointer-events-none" data-overlay="metrics"><rect${attr("x", 0)}${attr("y", metrics.descender)}${attr("width", advance())}${attr("height", metrics.ascender - metrics.descender)} fill="var(--color-surface-2)" stroke="var(--color-border)" stroke-width="1.5" vector-effect="non-scaling-stroke"></rect>`);
		if (showGrid) {
			$$renderer.push("<!--[0-->");
			const step = 100;
			$$renderer.push(`<!--[-->`);
			const each_array = ensure_array_like(Array.from({ length: Math.floor(advance() / step) + 1 }));
			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				each_array[i];
				$$renderer.push(`<line${attr("x1", i * step)}${attr("x2", i * step)}${attr("y1", metrics.descender)}${attr("y2", metrics.ascender)} stroke="var(--color-grid)" stroke-width="1" vector-effect="non-scaling-stroke"></line>`);
			}
			$$renderer.push(`<!--]--><!--[-->`);
			const each_array_1 = ensure_array_like(Array.from({ length: Math.floor((metrics.ascender - metrics.descender) / step) + 1 }));
			for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
				each_array_1[i];
				$$renderer.push(`<line${attr("x1", 0)}${attr("x2", advance())}${attr("y1", metrics.descender + i * step)}${attr("y2", metrics.descender + i * step)} stroke="var(--color-grid)" stroke-width="1" vector-effect="non-scaling-stroke"></line>`);
			}
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (showAnatomy) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<rect${attr("x", -50)}${attr("y", metrics.capHeight)}${attr("width", advance() + 100)}${attr("height", overshoot())} fill="var(--color-cap-height)" opacity="0.06"></rect><rect${attr("x", -50)}${attr("y", metrics.xHeight)}${attr("width", advance() + 100)}${attr("height", overshoot())} fill="var(--color-x-height)" opacity="0.06"></rect><rect${attr("x", -50)}${attr("y", -overshoot())}${attr("width", advance() + 100)}${attr("height", overshoot())} fill="var(--color-baseline)" opacity="0.06"></rect><line${attr("x1", -50)}${attr("x2", advance() + 50)}${attr("y1", metrics.capHeight + overshoot())}${attr("y2", metrics.capHeight + overshoot())} stroke="var(--color-cap-height)" stroke-width="1" stroke-dasharray="1 4" vector-effect="non-scaling-stroke" opacity="0.5"></line><line${attr("x1", -50)}${attr("x2", advance() + 50)}${attr("y1", metrics.xHeight + overshoot())}${attr("y2", metrics.xHeight + overshoot())} stroke="var(--color-x-height)" stroke-width="1" stroke-dasharray="1 4" vector-effect="non-scaling-stroke" opacity="0.5"></line><line${attr("x1", -50)}${attr("x2", advance() + 50)}${attr("y1", -overshoot())}${attr("y2", -overshoot())} stroke="var(--color-baseline)" stroke-width="1" stroke-dasharray="1 4" vector-effect="non-scaling-stroke" opacity="0.5"></line>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--><!--[-->`);
		const each_array_2 = ensure_array_like(guideLines());
		for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
			let line = each_array_2[$$index_2];
			$$renderer.push(`<line${attr("x1", -50)}${attr("x2", advance() + 50)}${attr("y1", line.y)}${attr("y2", line.y)}${attr("stroke", line.color)} stroke-width="1.25"${attr("stroke-dasharray", line.label === "base" ? "none" : "4 4")} vector-effect="non-scaling-stroke" opacity="0.55"></line><text${attr("x", -12)}${attr("y", -line.y)} text-anchor="end" dominant-baseline="middle"${attr("fill", line.color)} font-size="11" font-family="ui-monospace, monospace" class="select-none" transform="scale(1, -1)" style="paint-order: stroke; stroke: var(--color-canvas); stroke-width: 3;">${escape_html(line.label)}</text>`);
		}
		$$renderer.push(`<!--]--><line${attr("x1", leftSidebearing)}${attr("x2", leftSidebearing)}${attr("y1", metrics.descender)}${attr("y2", metrics.ascender)} stroke="var(--color-border-strong)" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" opacity="0.7"></line><line${attr("x1", advance() - rightSidebearing)}${attr("x2", advance() - rightSidebearing)}${attr("y1", metrics.descender)}${attr("y2", metrics.ascender)} stroke="var(--color-border-strong)" stroke-width="1" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" opacity="0.7"></line><line${attr("x1", 0)}${attr("x2", 0)}${attr("y1", metrics.descender)}${attr("y2", metrics.ascender)} stroke="var(--color-border-strong)" stroke-width="1.25" vector-effect="non-scaling-stroke"></line><line${attr("x1", advance())}${attr("x2", advance())}${attr("y1", metrics.descender)}${attr("y2", metrics.ascender)} stroke="var(--color-border-strong)" stroke-width="1.25" vector-effect="non-scaling-stroke"></line></g>`);
	});
}
//#endregion
//#region src/lib/font/path-edit.ts
/** All on-curve points across all contours, with their command indices. */
var collectOnCurvePoints = (contours) => {
	const out = [];
	for (let ci = 0; ci < contours.length; ci++) {
		const cmds = contours[ci].commands;
		for (let pi = 0; pi < cmds.length; pi++) {
			const c = cmds[pi];
			if (c.type === "M" || c.type === "L" || c.type === "C" || c.type === "Q") out.push({
				contourIndex: ci,
				pointIndex: pi,
				x: c.x,
				y: c.y,
				cmdType: c.type,
				pointType: c.pointType
			});
		}
	}
	return out;
};
/** Adjacent segments connecting on-curve points (line approximation for hit-testing). */
var collectSegments = (contours) => {
	const out = [];
	for (let ci = 0; ci < contours.length; ci++) {
		const cmds = contours[ci].commands;
		const onCurve = [];
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i];
			if (c.type === "M" || c.type === "L" || c.type === "C" || c.type === "Q") onCurve.push({
				i,
				x: c.x,
				y: c.y
			});
		}
		if (onCurve.length < 2) continue;
		const closed = cmds[cmds.length - 1]?.type === "Z";
		for (let k = 0; k < onCurve.length - 1; k++) {
			const a = onCurve[k];
			const b = onCurve[k + 1];
			out.push({
				contourIndex: ci,
				startCmdIndex: a.i,
				endCmdIndex: b.i,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y
			});
		}
		if (closed) {
			const a = onCurve[onCurve.length - 1];
			const b = onCurve[0];
			out.push({
				contourIndex: ci,
				startCmdIndex: a.i,
				endCmdIndex: b.i,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y
			});
		}
	}
	return out;
};
/** Chaikin smoothing: each polygon edge becomes 2 edges, corners get rounded. */
var chaikinSmooth = (contours, iterations) => {
	if (iterations <= 0) return contours;
	let current = contours;
	for (let iter = 0; iter < iterations; iter++) current = current.map((c) => smoothContour(c));
	return current;
};
var smoothContour = (contour) => {
	const onCurve = [];
	for (const cmd of contour.commands) if (cmd.type === "M" || cmd.type === "L") onCurve.push({
		x: cmd.x,
		y: cmd.y
	});
	if (onCurve.length < 3) return contour;
	const closed = contour.commands[contour.commands.length - 1]?.type === "Z";
	const next = [];
	const pairCount = closed ? onCurve.length : onCurve.length - 1;
	for (let i = 0; i < pairCount; i++) {
		const a = onCurve[i];
		const b = onCurve[(i + 1) % onCurve.length];
		next.push({
			x: .75 * a.x + .25 * b.x,
			y: .75 * a.y + .25 * b.y
		});
		next.push({
			x: .25 * a.x + .75 * b.x,
			y: .25 * a.y + .75 * b.y
		});
	}
	if (!closed) next.push(onCurve[onCurve.length - 1]);
	const newCmds = [{
		type: "M",
		x: next[0].x,
		y: next[0].y
	}];
	for (let i = 1; i < next.length; i++) newCmds.push({
		type: "L",
		x: next[i].x,
		y: next[i].y
	});
	if (closed) newCmds.push({ type: "Z" });
	return {
		...contour,
		commands: newCmds
	};
};
//#endregion
//#region src/lib/drawing/VectorPointLayer.svelte
function VectorPointLayer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/** Screen pixels per font unit. Used to size handles consistently. */
		let { contours, pixelsPerUnit, metrics, snap, eventToFont, onChange } = $$props;
		let selectedSet = /* @__PURE__ */ new Set();
		const handleR = derived(() => Math.max(4, 5 / Math.max(pixelsPerUnit, .1)));
		const handleSmallR = derived(() => Math.max(3, 4 / Math.max(pixelsPerUnit, .1)));
		const segHit = derived(() => Math.max(6, 10 / Math.max(pixelsPerUnit, .1)));
		derived(() => Math.max(6, 12 / Math.max(pixelsPerUnit, .1)));
		const points = derived(() => collectOnCurvePoints(contours));
		const segments = derived(() => collectSegments(contours));
		const handles = derived(() => []);
		const refKey = (ref) => `${ref.contour}:${ref.index}`;
		const isSelected = (ref) => selectedSet.has(refKey(ref));
		const marqueeRect = derived(() => {
			return null;
		});
		$$renderer.push(`<g class="vector-point-layer"><rect${attr("x", -1e5)}${attr("y", -1e5)}${attr("width", 2e5)}${attr("height", 2e5)} fill="transparent" pointer-events="all" class="cursor-default" role="presentation"></rect><!--[-->`);
		const each_array = ensure_array_like(segments());
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let seg = each_array[$$index];
			$$renderer.push(`<line${attr("x1", seg.ax)}${attr("y1", -seg.ay)}${attr("x2", seg.bx)}${attr("y2", -seg.by)} stroke="transparent"${attr("stroke-width", segHit())} class="cursor-copy" role="button" tabindex="-1" aria-label="Insert point on segment"></line>`);
		}
		$$renderer.push(`<!--]--><!--[-->`);
		const each_array_1 = ensure_array_like(segments());
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let seg = each_array_1[$$index_1];
			$$renderer.push(`<line${attr("x1", seg.ax)}${attr("y1", -seg.ay)}${attr("x2", seg.bx)}${attr("y2", -seg.by)} stroke="var(--color-accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" opacity="0.6" pointer-events="none"></line>`);
		}
		$$renderer.push(`<!--]--><!--[-->`);
		const each_array_2 = ensure_array_like(handles());
		for (let hi = 0, $$length = each_array_2.length; hi < $$length; hi++) {
			let h = each_array_2[hi];
			$$renderer.push(`<line${attr("x1", h.anchorX)}${attr("y1", -h.anchorY)}${attr("x2", h.x)}${attr("y2", -h.y)} stroke="var(--color-fg-muted)" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity="0.7" pointer-events="none"></line><rect${attr("x", h.x - handleSmallR())}${attr("y", -h.y - handleSmallR())}${attr("width", handleSmallR() * 2)}${attr("height", handleSmallR() * 2)} fill="var(--color-surface)" stroke="var(--color-fg-muted)" stroke-width="1.5" vector-effect="non-scaling-stroke" class="cursor-grab" role="button" tabindex="-1" aria-label="Bezier handle"></rect>`);
		}
		$$renderer.push(`<!--]--><!--[-->`);
		const each_array_3 = ensure_array_like(points());
		for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
			let p = each_array_3[$$index_3];
			const sel = isSelected({
				contour: p.contourIndex,
				index: p.pointIndex
			});
			const smooth = p.pointType === "smooth";
			const fillColor = sel ? smooth ? "var(--color-success)" : "var(--color-accent)" : "var(--color-surface)";
			const strokeColor = smooth ? "var(--color-success)" : "var(--color-accent)";
			if (smooth) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<circle${attr("cx", p.x)}${attr("cy", -p.y)}${attr("r", handleR())}${attr("fill", fillColor)}${attr("stroke", strokeColor)} stroke-width="1.5" vector-effect="non-scaling-stroke" class="cursor-grab transition-[fill]" role="button"${attr("aria-label", `Smooth point ${stringify(p.pointIndex)} of contour ${stringify(p.contourIndex)} (Alt-click to make corner)`)} tabindex="0"></circle>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<rect${attr("x", p.x - handleR())}${attr("y", -p.y - handleR())}${attr("width", handleR() * 2)}${attr("height", handleR() * 2)}${attr("transform", `rotate(45 ${stringify(p.x)} ${stringify(-p.y)})`)}${attr("fill", fillColor)}${attr("stroke", strokeColor)} stroke-width="1.5" vector-effect="non-scaling-stroke" class="cursor-grab transition-[fill]" role="button"${attr("aria-label", `Corner point ${stringify(p.pointIndex)} of contour ${stringify(p.contourIndex)} (Alt-click to make smooth)`)} tabindex="0"></rect>`);
			}
			$$renderer.push(`<!--]-->`);
		}
		$$renderer.push(`<!--]-->`);
		if (marqueeRect()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<rect${attr("x", marqueeRect().x)}${attr("y", -(marqueeRect().y + marqueeRect().h))}${attr("width", marqueeRect().w)}${attr("height", marqueeRect().h)} fill="var(--color-accent-soft)" fill-opacity="0.2" stroke="var(--color-accent)" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"></rect>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></g>`);
	});
}
//#endregion
//#region src/lib/drawing/AnchorLayer.svelte
function AnchorLayer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { anchors, pixelsPerUnit, eventToFont, onChange } = $$props;
		const crossR = derived(() => Math.max(8, 10 / Math.max(pixelsPerUnit, .1)));
		const labelOffset = derived(() => Math.max(14, 16 / Math.max(pixelsPerUnit, .1)));
		const labelSize = derived(() => Math.max(10, 11 / Math.max(pixelsPerUnit, .1)));
		$$renderer.push(`<g class="anchor-layer"><!--[-->`);
		const each_array = ensure_array_like(anchors);
		for (let i = 0, $$length = each_array.length; i < $$length; i++) {
			let a = each_array[i];
			$$renderer.push(`<g class="anchor"><line${attr("x1", a.x - crossR())}${attr("y1", -a.y)}${attr("x2", a.x + crossR())}${attr("y2", -a.y)} stroke="var(--color-warn)" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"></line><line${attr("x1", a.x)}${attr("y1", -a.y - crossR())}${attr("x2", a.x)}${attr("y2", -a.y + crossR())} stroke="var(--color-warn)" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"></line><circle${attr("cx", a.x)}${attr("cy", -a.y)}${attr("r", crossR() * .85)} fill="var(--color-warn)" fill-opacity="0.15" stroke="var(--color-warn)" stroke-width="1.5" vector-effect="non-scaling-stroke" class="cursor-grab" role="button" tabindex="0"${attr("aria-label", `Anchor ${stringify(a.name)}`)}></circle><text${attr("x", a.x + labelOffset())}${attr("y", -a.y)} dominant-baseline="middle"${attr("font-size", labelSize())} font-family="ui-monospace, monospace" fill="var(--color-warn)" class="select-none" style="paint-order: stroke; stroke: var(--color-canvas); stroke-width: 3;" pointer-events="none">${escape_html(a.name)}</text></g>`);
		}
		$$renderer.push(`<!--]--></g>`);
	});
}
//#endregion
//#region src/lib/drawing/DrawingCanvas.svelte
function DrawingCanvas($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/** Optional reference glyph rendered behind the current one for proportion comparison. */
		/** Family Regular sibling's same-codepoint glyph rendered as a coloured ghost. */
		/** Optional onion-skin previous/next glyphs (rendered translucent flanking the current advance). */
		/** Snap dragged points to baseline / x-height / cap-height / asc / desc. */
		/** Show anchors on top of the glyph. */
		/** Bump this number to reset the view to auto-fit. */
		/** Called with the new sketch strokes array (replaces glyph.sketch). */
		/** Called when the user moves/adds/deletes points on the vector layer. */
		/** Called when the user drags an anchor. */
		/** Called with current zoom % whenever the view changes (100 = fit). */
		let { glyph, metrics, tool = "pencil", strokeStyle = DEFAULT_STROKE, showSketch = true, showVector = true, showGrid = false, showAnatomy = false, reference = null, familyReference = null, onionPrev = null, onionNext = null, snapToMetrics = true, showAnchors = true, resetSignal = 0, onSketchChange, onContoursChange, onAnchorsChange, onZoomChange } = $$props;
		let renderedWidth = 800;
		const advance = derived(() => Math.max(glyph.advanceWidth, 400));
		const padX = 100;
		const padY = 80;
		const autoViewW = derived(() => advance() + padX * 2);
		const autoViewH = derived(() => metrics.ascender - metrics.descender + padY * 2);
		const autoMinX = -padX;
		const autoMinY = derived(() => -(metrics.ascender + padY));
		let viewOverride = null;
		const view = derived(() => viewOverride ?? {
			minX: autoMinX,
			minY: autoMinY(),
			width: autoViewW(),
			height: autoViewH()
		});
		const viewBox = derived(() => `${view().minX} ${view().minY} ${view().width} ${view().height}`);
		const pixelsPerUnit = derived(() => renderedWidth / Math.max(view().width, 1));
		derived(() => ((view().width === 0 ? 0 : autoViewW() / view().width) * 100).toFixed(0));
		const eventToFont = (ev) => {
			return null;
		};
		$$renderer.push(`<svg${attr("viewBox", viewBox())}${attr_class(`h-full w-full select-none touch-none ${stringify(tool === "edit" ? "cursor-default" : "cursor-crosshair")}`)} role="img"${attr("aria-label", `Drawing canvas for glyph ${stringify(glyph.name)}`)}><g transform="scale(1, -1)">`);
		MetricsOverlay($$renderer, {
			metrics,
			advanceWidth: advance(),
			leftSidebearing: glyph.leftSidebearing,
			rightSidebearing: glyph.rightSidebearing,
			showGrid,
			showAnatomy
		});
		$$renderer.push(`<!---->`);
		if (glyph.referenceImage) {
			$$renderer.push("<!--[0-->");
			const ri = glyph.referenceImage;
			$$renderer.push(`<g pointer-events="none" transform="scale(1, -1)"><image${attr("href", ri.src)}${attr("x", ri.x)}${attr("y", -(ri.y + ri.height))}${attr("width", ri.width)}${attr("height", ri.height)}${attr("opacity", ri.opacity)} preserveAspectRatio="none"></image></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (reference && reference.contours.length > 0 && reference.codepoint !== glyph.codepoint) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g fill="var(--color-fg)" opacity="0.08" fill-rule="evenodd" pointer-events="none"><path${attr("d", contoursToSvgPath(reference.contours))}></path></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (familyReference && familyReference.contours.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g fill="var(--color-accent)" opacity="0.16" fill-rule="evenodd" pointer-events="none"><path${attr("d", contoursToSvgPath(familyReference.contours))}></path></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (onionPrev && onionPrev.contours.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g fill="var(--color-fg)" opacity="0.16" fill-rule="evenodd" pointer-events="none"${attr("transform", `translate(${stringify(-onionPrev.advanceWidth)} 0)`)}><path${attr("d", contoursToSvgPath(onionPrev.contours))}></path></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (onionNext && onionNext.contours.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g fill="var(--color-fg)" opacity="0.16" fill-rule="evenodd" pointer-events="none"${attr("transform", `translate(${stringify(advance())} 0)`)}><path${attr("d", contoursToSvgPath(onionNext.contours))}></path></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (showSketch && glyph.sketch) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g opacity="0.35" fill="var(--color-fg)"><!--[-->`);
			const each_array = ensure_array_like(glyph.sketch);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let s = each_array[$$index];
				$$renderer.push(`<path${attr("d", sketchOutlineSvg(s, strokeStyle))}></path>`);
			}
			$$renderer.push(`<!--]--></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (glyph.codepoint > 32 && glyph.codepoint < 65536 && glyph.contours.length === 0 && (!glyph.sketch || glyph.sketch.length === 0) && !glyph.referenceImage) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g transform="scale(1, -1)" pointer-events="none" aria-hidden="true"><text${attr("x", advance() / 2)}${attr("y", 0)} text-anchor="middle" dominant-baseline="alphabetic"${attr("font-size", metrics.capHeight)} fill="var(--color-fg)" opacity="0.18" style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;">${escape_html(String.fromCodePoint(glyph.codepoint))}</text></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (showVector && glyph.contours.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<g fill="var(--color-fg)" fill-rule="evenodd"><path${attr("d", contoursToSvgPath(glyph.contours))}></path></g>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></g>`);
		if (tool === "edit" && glyph.contours.length > 0 && onContoursChange) {
			$$renderer.push("<!--[0-->");
			VectorPointLayer($$renderer, {
				contours: glyph.contours,
				pixelsPerUnit: pixelsPerUnit(),
				metrics,
				snap: snapToMetrics,
				eventToFont,
				onChange: onContoursChange
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
		if (showAnchors && glyph.anchors && glyph.anchors.length > 0 && onAnchorsChange) {
			$$renderer.push("<!--[0-->");
			AnchorLayer($$renderer, {
				anchors: glyph.anchors,
				pixelsPerUnit: pixelsPerUnit(),
				eventToFont,
				onChange: onAnchorsChange
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></svg>`);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/chevron-right.svelte
function Chevron_right($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "chevron-right" },
		props,
		{ iconNode: [["path", { "d": "m9 18 6-6-6-6" }]] }
	]));
}
//#endregion
//#region src/lib/ui/Accordion.svelte
function Accordion($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/**
		* Accordion section — collapsible panel for the right-side sidebars.
		* Persists open/closed state per `id` in localStorage so the same panels
		* stay open across reloads, navigations, and project switches.
		*
		* Default open or closed is set via `defaultOpen`; explicit user toggles
		* always win over the default.
		*/
		/** Stable identifier — used as the localStorage key suffix. */
		/** Stable identifier — used as the localStorage key suffix. */
		/** Header label shown in the toggle row. */
		/** Optional icon component rendered before the label. */
		/** Optional trailing badge / count / chip rendered on the right. */
		/** Whether the panel should be open on first visit. */
		/** Body content (snippet). */
		/** Extra class on the body region. */
		let { id, label, icon, badge, defaultOpen = true, children, bodyClass = "" } = $$props;
		`${id}`;
		let open = defaultOpen;
		$$renderer.push(`<section class="border-b border-border"><button type="button" class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider text-fg-subtle uppercase transition-colors hover:bg-surface-2/40 hover:text-fg"${attr("aria-expanded", open)}${attr("title", open ? `Collapse ${label}` : `Expand ${label}`)}>`);
		if (open) {
			$$renderer.push("<!--[0-->");
			Chevron_down($$renderer, {
				class: "size-3 shrink-0 text-fg-subtle/70",
				"aria-hidden": "true"
			});
		} else {
			$$renderer.push("<!--[-1-->");
			Chevron_right($$renderer, {
				class: "size-3 shrink-0 text-fg-subtle/70",
				"aria-hidden": "true"
			});
		}
		$$renderer.push(`<!--]--> `);
		if (icon) {
			$$renderer.push("<!--[0-->");
			icon($$renderer);
			$$renderer.push(`<!---->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <span class="flex-1 truncate">${escape_html(label)}</span> `);
		if (badge) {
			$$renderer.push("<!--[0-->");
			badge($$renderer);
			$$renderer.push(`<!---->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></button> `);
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div${attr_class(`px-4 pb-4 ${stringify(bodyClass)}`)}>`);
			children($$renderer);
			$$renderer.push(`<!----></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></section>`);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/eraser.svelte
function Eraser($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "eraser" },
		props,
		{ iconNode: [["path", { "d": "M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" }], ["path", { "d": "m5.082 11.09 8.828 8.828" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/mouse-pointer-2.svelte
function Mouse_pointer_2($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "mouse-pointer-2" },
		props,
		{ iconNode: [["path", { "d": "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/grid-3x3.svelte
function Grid_3x3($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "grid-3x3" },
		props,
		{ iconNode: [
			["rect", {
				"width": "18",
				"height": "18",
				"x": "3",
				"y": "3",
				"rx": "2"
			}],
			["path", { "d": "M3 9h18" }],
			["path", { "d": "M3 15h18" }],
			["path", { "d": "M9 3v18" }],
			["path", { "d": "M15 3v18" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/maximize.svelte
function Maximize($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "maximize" },
		props,
		{ iconNode: [
			["path", { "d": "M8 3H5a2 2 0 0 0-2 2v3" }],
			["path", { "d": "M21 8V5a2 2 0 0 0-2-2h-3" }],
			["path", { "d": "M3 16v3a2 2 0 0 0 2 2h3" }],
			["path", { "d": "M16 21h3a2 2 0 0 0 2-2v-3" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/align-horizontal-space-around.svelte
function Align_horizontal_space_around($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "align-horizontal-space-around" },
		props,
		{ iconNode: [
			["rect", {
				"width": "6",
				"height": "10",
				"x": "9",
				"y": "7",
				"rx": "2"
			}],
			["path", { "d": "M4 22V2" }],
			["path", { "d": "M20 22V2" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/flag.svelte
function Flag($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "flag" },
		props,
		{ iconNode: [["path", { "d": "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/clipboard-paste.svelte
function Clipboard_paste($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "clipboard-paste" },
		props,
		{ iconNode: [
			["path", { "d": "M11 14h10" }],
			["path", { "d": "M16 4h2a2 2 0 0 1 2 2v1.344" }],
			["path", { "d": "m17 18 4-4-4-4" }],
			["path", { "d": "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113" }],
			["rect", {
				"x": "8",
				"y": "2",
				"width": "8",
				"height": "4",
				"rx": "1"
			}]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/chevron-left.svelte
function Chevron_left($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "chevron-left" },
		props,
		{ iconNode: [["path", { "d": "m15 18-6-6 6-6" }]] }
	]));
}
//#endregion
//#region src/lib/ui/EditorTour.svelte
function EditorTour($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const STEPS = [
			{
				title: "The glyph browser",
				body: "Every character in the font lives here. Click any tile to start editing it. Categories collapse, and the search filters as you type.",
				selector: "aside .grid",
				placement: "right"
			},
			{
				title: "Tool group",
				body: "Three tools: Pencil (P) sketches with pressure-sensitive strokes, Eraser (E) removes them, Edit (A) drags bezier points after you trace.",
				selector: "button[title*=\"Pencil\"]",
				placement: "bottom"
			},
			{
				title: "Layer toggles",
				body: "Anchors, onion-skin, sketch, vector, and grid are independent layers — toggle visibility without losing data.",
				selector: "button[title*=\"Toggle anchors\"]",
				placement: "bottom"
			},
			{
				title: "Trace to vector",
				body: "After sketching, this turns your strokes into clean cubic-bezier contours via boolean union + Schneider curve fitting. Press T for fast access.",
				selector: "button[title*=\"Trace to vector\"], button[title*=\"Trace\"]",
				placement: "top"
			},
			{
				title: "Live metrics window",
				body: "Type any string here to see it rendered in your font as you draw. This is how you verify spacing and texture in real time.",
				selector: "input[placeholder=\"Type to preview…\"]",
				placement: "top"
			},
			{
				title: "Live preview pane",
				body: "The current glyph rendered through @font-face. Updates in ~15ms after every edit. Glyph count + file size shown below.",
				selector: "aside h3:nth-of-type(1) ~ div, .preview-font",
				placement: "left"
			},
			{
				title: "Tabs along the top",
				body: "Spacing for kerning + classes + script packs. Designspace for variable fonts. Features for .fea source. AI for Claude-powered help. Preview for proofs. Export to ship.",
				selector: "nav button[type=\"button\"]",
				placement: "bottom"
			}
		];
		let { open, onclose } = $$props;
		let stepIdx = 0;
		const step = derived(() => STEPS[stepIdx]);
		const tooltipStyle = derived(() => {
			return "left: 50%; top: 50%; transform: translate(-50%, -50%);";
		});
		const highlightStyle = derived(() => {
			return "display: none;";
		});
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="pointer-events-none fixed inset-0 z-40 bg-fg/35 backdrop-blur-[2px]"></div> <div class="pointer-events-none fixed z-40 rounded-md border-2 border-accent shadow-[0_0_0_3px_var(--color-accent-soft)] transition-all duration-150"${attr_style(highlightStyle())}></div> <div class="pointer-events-auto fixed z-50 w-[360px] rounded-xl border border-border bg-surface p-4 shadow-xl"${attr_style(tooltipStyle())} role="dialog" aria-modal="false" aria-label="Editor tour"><div class="mb-2 flex items-start justify-between gap-3"><div><div class="text-[10px] font-semibold tracking-wider text-accent uppercase">Step ${escape_html(stepIdx + 1)} of ${escape_html(STEPS.length)}</div> <h3 class="mt-0.5 text-[15px] font-semibold text-fg">${escape_html(step()?.title)}</h3></div> <button type="button" class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Skip tour" title="Skip tour (Esc)">`);
			X($$renderer, { class: "size-4" });
			$$renderer.push(`<!----></button></div> <p class="mb-4 text-[13px] leading-relaxed text-fg-muted">${escape_html(step()?.body)}</p> <div class="flex items-center justify-between"><button type="button"${attr("disabled", stepIdx === 0, true)} class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent">`);
			Chevron_left($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----> Back</button> <button type="button" class="rounded-md px-2 py-1 text-[12px] font-medium text-fg-subtle hover:text-fg-muted">Skip tour</button> <button type="button" class="inline-flex items-center gap-1 rounded-md bg-fg px-3 py-1 text-[12px] font-medium text-canvas hover:bg-fg/90">${escape_html(stepIdx === STEPS.length - 1 ? "Done" : "Next")} `);
			if (stepIdx < STEPS.length - 1) {
				$$renderer.push("<!--[0-->");
				Chevron_right($$renderer, { class: "size-3.5" });
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></button></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/glyph/CompositeEditor.svelte
function CompositeEditor($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const glyph = derived(() => projectStore.selectedGlyph);
		const components = derived(() => glyph()?.components ?? []);
		const project = derived(() => projectStore.project);
		const labelFor = (cp) => {
			const g = project()?.glyphs[cp];
			if (g) {
				const char = cp > 32 && cp < 65536 ? String.fromCodePoint(cp) : "";
				return `${g.name}${char ? ` "${char}"` : ""}`;
			}
			return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
		};
		const previewLayers = derived(() => {
			if (!project() || components().length === 0) return [];
			const layers = [];
			components().forEach((comp, idx) => {
				const base = project().glyphs[comp.baseCodepoint];
				if (!base) return;
				const path = contoursToSvgPath(base.contours);
				layers.push({
					path,
					idx,
					offsetX: comp.offsetX,
					offsetY: comp.offsetY,
					anchors: base.anchors ?? []
				});
			});
			return layers;
		});
		const anchorMatches = derived(() => {
			const out = [];
			if (previewLayers().length < 2) return out;
			const base = previewLayers()[0];
			for (let i = 1; i < previewLayers().length; i++) {
				const mark = previewLayers()[i];
				for (const ba of base.anchors) {
					if (ba.name.startsWith("_")) continue;
					if (!mark.anchors.find((a) => a.name === `_${ba.name}`)) continue;
					out.push({
						name: ba.name,
						baseIdx: 0,
						markIdx: i,
						x: base.offsetX + ba.x,
						y: base.offsetY + ba.y
					});
				}
			}
			return out;
		});
		const metrics = derived(() => project()?.metrics);
		const previewViewBox = derived(() => {
			const asc = metrics()?.ascender ?? 800;
			const desc = metrics()?.descender ?? -200;
			const width = Math.max(...previewLayers().map((l) => l.offsetX + 1e3), 1e3);
			return `0 ${-asc} ${width} ${asc - desc}`;
		});
		if (glyph()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="border-b border-border p-4"><h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span>Composite</span> <button type="button" class="inline-flex h-5 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent" aria-label="Add component" title="Reference another glyph">`);
			Plus($$renderer, { class: "size-3" });
			$$renderer.push(`<!----> Add</button></h3> `);
			if (components().length === 0 && true) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="text-[11px] text-fg-subtle">No components. Compose this glyph from references (e.g. <code class="font-mono">a</code> + <code class="font-mono">U+0301</code>).</p>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (components().length > 0 && previewLayers().length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mb-2 overflow-hidden rounded-md border border-border bg-canvas"><svg${attr("viewBox", previewViewBox())} preserveAspectRatio="xMidYMid meet" class="h-32 w-full" style="transform: scaleY(-1);" aria-label="Composite preview"><!--[-->`);
				const each_array = ensure_array_like(previewLayers());
				for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
					let layer = each_array[$$index_1];
					$$renderer.push(`<g${attr("transform", `translate(${stringify(layer.offsetX)} ${stringify(layer.offsetY)})`)}><path${attr("d", layer.path)}${attr("fill", layer.idx === 0 ? "currentColor" : "var(--color-accent)")} fill-rule="evenodd"${attr("opacity", layer.idx === 0 ? 1 : .7)}></path><!--[-->`);
					const each_array_1 = ensure_array_like(layer.anchors);
					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let a = each_array_1[$$index];
						$$renderer.push(`<circle${attr("cx", a.x)}${attr("cy", a.y)} r="14" fill="var(--color-warn)" opacity="0.6"></circle>`);
					}
					$$renderer.push(`<!--]--></g>`);
				}
				$$renderer.push(`<!--]--><!--[-->`);
				const each_array_2 = ensure_array_like(anchorMatches());
				for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
					let m = each_array_2[$$index_2];
					$$renderer.push(`<circle${attr("cx", m.x)}${attr("cy", m.y)} r="22" fill="none" stroke="var(--color-success)" stroke-width="6" opacity="0.9"></circle>`);
				}
				$$renderer.push(`<!--]--></svg></div> `);
				if (anchorMatches().length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<p class="mb-2 text-[10px] text-success">${escape_html(anchorMatches().length)} anchor match${escape_html(anchorMatches().length === 1 ? "" : "es")}: ${escape_html(anchorMatches().map((m) => m.name).join(", "))}
					— GPOS mkmk will use these at export.</p>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (components().length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<ul class="mb-2 grid gap-1.5"><!--[-->`);
				const each_array_3 = ensure_array_like(components());
				for (let idx = 0, $$length = each_array_3.length; idx < $$length; idx++) {
					let comp = each_array_3[idx];
					$$renderer.push(`<li class="rounded-md border border-border bg-surface-2/40 p-2"><div class="mb-1.5 flex items-center justify-between gap-2"><span class="truncate text-[12px] font-medium text-fg">${escape_html(labelFor(comp.baseCodepoint))}</span> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove component" title="Remove component">`);
					Trash_2($$renderer, { class: "size-3" });
					$$renderer.push(`<!----></button></div> <div class="grid grid-cols-2 items-center gap-1.5"><label class="flex items-center gap-1 text-[10px] text-fg-subtle"><span>x</span> <input type="number"${attr("value", comp.offsetX)} class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"/></label> <label class="flex items-center gap-1 text-[10px] text-fg-subtle"><span>y</span> <input type="number"${attr("value", comp.offsetY)} class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"/></label></div> <div class="mt-1.5 flex justify-center gap-0.5"><button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent" title="Nudge left 10">←</button> <button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent" title="Nudge up 10">↑</button> <button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent" title="Nudge down 10">↓</button> <button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent" title="Nudge right 10">→</button></div></li>`);
				}
				$$renderer.push(`<!--]--></ul>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (components().length > 0 && glyph().contours.length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="mt-2 text-[10px] text-fg-subtle">Pure composite: outlines come from the referenced glyphs at export time.</p>`);
			} else if (components().length > 0) {
				$$renderer.push("<!--[1-->");
				$$renderer.push(`<p class="mt-2 text-[10px] text-warn">Has both contours and components — export will use contours only.</p>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/image.svelte
function Image($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "image" },
		props,
		{ iconNode: [
			["rect", {
				"width": "18",
				"height": "18",
				"x": "3",
				"y": "3",
				"rx": "2",
				"ry": "2"
			}],
			["circle", {
				"cx": "9",
				"cy": "9",
				"r": "2"
			}],
			["path", { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
		] }
	]));
}
//#endregion
//#region src/lib/glyph/ReferenceImagePanel.svelte
function ReferenceImagePanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const glyph = derived(() => projectStore.selectedGlyph);
		derived(() => projectStore.project?.metrics);
		let tracing = false;
		let traceThreshold = 128;
		let traceDarkIsInk = true;
		let traceFitMetrics = true;
		let traceReplace = true;
		let traceBrightness = 0;
		let traceContrast = 0;
		if (glyph()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="border-b border-border p-4"><h3 class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span class="inline-flex items-center gap-1.5">`);
			Image($$renderer, { class: "size-3" });
			$$renderer.push(`<!----> Reference</span> `);
			if (glyph().referenceImage) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove reference image" title="Remove reference image">`);
				Trash_2($$renderer, { class: "size-3" });
				$$renderer.push(`<!----></button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></h3> <input type="file" accept="image/*" class="hidden"/> `);
			if (!glyph().referenceImage) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button" class="block w-full rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 px-2 py-3 text-[11px] text-fg-muted hover:border-accent hover:text-accent">Upload or paste an image to trace</button> <p class="mt-2 text-[10px] text-fg-subtle">Drop an image, click here, or paste from clipboard. Fits height to the em-square.</p>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<label class="block text-[10px] text-fg-subtle">Opacity <input type="range"${attr("min", .05)}${attr("max", 1)}${attr("step", .05)}${attr("value", glyph().referenceImage.opacity)} class="mt-1 h-1 w-full accent-accent"/></label> <div class="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-fg-subtle"><label class="flex items-center gap-1">x <input type="number"${attr("value", glyph().referenceImage.x)} class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"/></label> <label class="flex items-center gap-1">y <input type="number"${attr("value", glyph().referenceImage.y)} class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"/></label> <label class="flex items-center gap-1">w <input type="number"${attr("value", glyph().referenceImage.width)} class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"/></label> <label class="flex items-center gap-1">h <input type="number"${attr("value", glyph().referenceImage.height)} class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"/></label></div> <button type="button" class="mt-2 w-full rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-fg-muted hover:border-accent hover:text-accent">Replace image</button> <div class="mt-3 rounded-md border border-dashed border-accent/40 bg-accent-soft/20 p-2"><div class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Auto trace</div> <label class="block text-[10px] text-fg-subtle">Threshold <input type="range"${attr("min", 20)}${attr("max", 235)}${attr("step", 5)}${attr("value", traceThreshold)} class="mt-1 h-1 w-full accent-accent"/> <span class="font-mono text-fg" data-numeric="">${escape_html(traceThreshold)}</span></label> <label class="mt-1 block text-[10px] text-fg-subtle">Brightness <input type="range"${attr("min", -100)}${attr("max", 100)}${attr("step", 5)}${attr("value", traceBrightness)} class="mt-1 h-1 w-full accent-accent"/> <span class="font-mono text-fg" data-numeric="">${escape_html(traceBrightness > 0 ? "+" : "")}${escape_html(traceBrightness)}</span></label> <label class="mt-1 block text-[10px] text-fg-subtle">Contrast <input type="range"${attr("min", -100)}${attr("max", 100)}${attr("step", 5)}${attr("value", traceContrast)} class="mt-1 h-1 w-full accent-accent"/> <span class="font-mono text-fg" data-numeric="">${escape_html(traceContrast > 0 ? "+" : "")}${escape_html(traceContrast)}</span></label> <label class="mt-1 flex items-center gap-1.5 text-[10px] text-fg-muted"><input type="checkbox"${attr("checked", traceDarkIsInk, true)} class="accent-accent"/> Dark pixels are ink</label> <label class="mt-1 flex items-center gap-1.5 text-[10px] text-fg-muted"><input type="checkbox"${attr("checked", traceReplace, true)} class="accent-accent"/> Replace existing contours</label> <label class="mt-1 flex items-center gap-1.5 text-[10px] text-fg-muted"><input type="checkbox"${attr("checked", traceFitMetrics, true)} class="accent-accent"/> Auto-fit advance + sidebearings</label> <button type="button"${attr("disabled", tracing, true)} class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-2 py-1.5 text-[11px] font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-60">`);
				Wand_sparkles($$renderer, { class: "size-3" });
				$$renderer.push(`<!----> ${escape_html("Trace to vector")}</button> <p class="mt-1 text-[10px] text-fg-subtle">Adds new contours on top of any existing ones. Refine in Edit (A).</p></div>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/camera.svelte
function Camera($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "camera" },
		props,
		{ iconNode: [["path", { "d": "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" }], ["circle", {
			"cx": "12",
			"cy": "13",
			"r": "3"
		}]] }
	]));
}
//#endregion
//#region src/lib/glyph/RevisionsPanel.svelte
function RevisionsPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const glyph = derived(() => projectStore.selectedGlyph);
		const metrics = derived(() => projectStore.project?.metrics);
		const revisions = derived(() => glyph()?.revisions ?? []);
		const formatTime = (iso) => {
			const then = new Date(iso).getTime();
			const diff = Date.now() - then;
			const min = Math.round(diff / 6e4);
			if (min < 1) return "just now";
			if (min < 60) return `${min}m`;
			const hr = Math.round(min / 60);
			if (hr < 24) return `${hr}h`;
			return new Date(iso).toLocaleDateString();
		};
		if (glyph()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="border-b border-border p-4"><h3 class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span class="inline-flex items-center gap-1.5">`);
			Camera($$renderer, { class: "size-3" });
			$$renderer.push(`<!----> Snapshots <span class="text-fg-subtle/70" data-numeric="">${escape_html(revisions().length)}/8</span></span> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="inline-flex h-5 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40" title="Capture the current state for later">Snap</button></h3> `);
			if (revisions().length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="text-[11px] text-fg-subtle">Capture iterations as you go — restore any of the last 8.</p>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<ul class="grid gap-1"><!--[-->`);
				const each_array = ensure_array_like(revisions());
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let r = each_array[$$index];
					$$renderer.push(`<li class="flex items-center gap-2 rounded-md border border-border bg-surface-2/40 px-2 py-1.5"><svg${attr("viewBox", `0 0 ${stringify(Math.max(r.advanceWidth, 100))} ${stringify((metrics()?.ascender ?? 800) - (metrics()?.descender ?? -200))}`)} width="32" height="32" preserveAspectRatio="xMidYMid meet" style="transform: scaleY(-1);" aria-hidden="true"><g${attr("transform", `translate(0 ${stringify(-(metrics()?.ascender ?? 800))})`)}><path${attr("d", contoursToSvgPath(r.contours))} fill="currentColor" fill-rule="evenodd"></path></g></svg> <span class="flex-1 truncate text-[11px] text-fg-muted" data-numeric="">${escape_html(formatTime(r.takenAt))}</span> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-accent/10 hover:text-accent" aria-label="Restore this snapshot" title="Restore">`);
					Rotate_ccw($$renderer, { class: "size-3" });
					$$renderer.push(`<!----></button> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Delete this snapshot" title="Delete">`);
					Trash_2($$renderer, { class: "size-3" });
					$$renderer.push(`<!----></button></li>`);
				}
				$$renderer.push(`<!--]--></ul>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/glyph/StemsPanel.svelte
function StemsPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const glyph = derived(() => projectStore.selectedGlyph);
		derived(() => projectStore.project?.metrics);
		let measurements = [];
		let measuring = false;
		if (glyph() && glyph().contours.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="border-b border-border p-4"><h3 class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span class="inline-flex items-center gap-1.5">`);
			Ruler($$renderer, { class: "size-3" });
			$$renderer.push(`<!----> Stems</span> <button type="button"${attr("disabled", measuring, true)} class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40" title="Re-measure">${escape_html("Re-scan")}</button></h3> `);
			if (measurements.length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="text-[11px] text-fg-subtle">Scanning the silhouette at x/cap-height slices…</p>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<ul class="grid gap-1"><!--[-->`);
				const each_array = ensure_array_like(measurements);
				for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
					let m = each_array[$$index_1];
					$$renderer.push(`<li class="flex items-center justify-between gap-2 text-[11px]"><span class="font-mono text-fg-subtle" data-numeric="">y=${escape_html(m.y)}</span> <span class="flex flex-wrap gap-1"><!--[-->`);
					const each_array_1 = ensure_array_like(m.runs);
					for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
						let r = each_array_1[i];
						$$renderer.push(`<span class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg" data-numeric=""${attr("title", `x=${stringify(r.x)}`)}>${escape_html(r.width)}</span>`);
					}
					$$renderer.push(`<!--]--></span></li>`);
				}
				$$renderer.push(`<!--]--></ul> <p class="mt-2 text-[10px] text-fg-subtle">Compare these widths across n, h, m, b, d, l for stem consistency.</p>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/glyph/MetricsInspector.svelte
function MetricsInspector($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const glyph = derived(() => projectStore.selectedGlyph);
		const metrics = derived(() => projectStore.project?.metrics);
		const bounds = derived(() => {
			if (!glyph() || glyph().contours.length === 0) return null;
			return glyphBounds(glyph().contours);
		});
		const pointCount = derived(() => {
			if (!glyph()) return 0;
			let n = 0;
			for (const c of glyph().contours) for (const cmd of c.commands) if (cmd.type === "M" || cmd.type === "L" || cmd.type === "C" || cmd.type === "Q") n++;
			return n;
		});
		const approxArea = derived(() => {
			if (!glyph()) return 0;
			let total = 0;
			for (const c of glyph().contours) {
				const pts = [];
				for (const cmd of c.commands) if (cmd.type === "M" || cmd.type === "L" || cmd.type === "C" || cmd.type === "Q") pts.push({
					x: cmd.x,
					y: cmd.y
				});
				if (pts.length < 3) continue;
				let a = 0;
				for (let i = 0; i < pts.length; i++) {
					const j = (i + 1) % pts.length;
					a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
				}
				total += Math.abs(a / 2);
			}
			return total;
		});
		const relTo = (val, ref) => {
			if (val === void 0 || ref === void 0 || ref === 0) return "—";
			const diff = val - ref;
			return `${diff > 0 ? "+" : ""}${diff}`;
		};
		const computeOvershoot = (b) => {
			if (!b || !metrics()) return null;
			return {
				above: b.maxY - metrics().capHeight,
				below: b.minY
			};
		};
		const overshoot = derived(() => computeOvershoot(bounds()));
		if (glyph()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="border-b border-border p-4"><h3 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Metrics inspector</h3> `);
			if (glyph().contours.length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<p class="text-[11px] text-fg-subtle">Draw or trace to see precise measurements.</p>`);
			} else if (!bounds() || !metrics()) {
				$$renderer.push("<!--[1-->");
				$$renderer.push(`<p class="text-[11px] text-fg-subtle">No bounds available.</p>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[11px]" data-numeric=""><dt class="text-fg-muted">LSB</dt> <dd class="text-right font-mono text-fg">${escape_html(glyph().leftSidebearing)}</dd> <dt class="text-fg-muted">RSB</dt> <dd class="text-right font-mono text-fg">${escape_html(glyph().rightSidebearing)}</dd> <dt class="text-fg-muted">Advance</dt> <dd class="text-right font-mono text-fg">${escape_html(glyph().advanceWidth)}</dd> <dt class="text-fg-muted">BBox W × H</dt> <dd class="text-right font-mono text-fg">${escape_html(Math.round(bounds().maxX - bounds().minX))} × ${escape_html(Math.round(bounds().maxY - bounds().minY))}</dd> <dt class="text-fg-muted">BBox top / bottom</dt> <dd class="text-right font-mono text-fg">${escape_html(Math.round(bounds().maxY))} / ${escape_html(Math.round(bounds().minY))}</dd> <dt class="text-fg-muted">vs cap height</dt> <dd class="text-right font-mono text-fg">${escape_html(relTo(Math.round(bounds().maxY), metrics().capHeight))}</dd> <dt class="text-fg-muted">vs x-height</dt> <dd class="text-right font-mono text-fg">${escape_html(relTo(Math.round(bounds().maxY), metrics().xHeight))}</dd> `);
				if (overshoot()) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<dt class="text-fg-muted" title="Positive = extends above cap height">Overshoot ↑</dt> <dd${attr_class(`text-right font-mono ${stringify(overshoot().above > 0 ? "text-success" : overshoot().above < 0 ? "text-warn" : "text-fg")}`)}>${escape_html(overshoot().above > 0 ? "+" : "")}${escape_html(overshoot().above)}</dd> <dt class="text-fg-muted" title="Negative = drops below baseline">Overshoot ↓</dt> <dd${attr_class(`text-right font-mono ${stringify(overshoot().below < 0 ? "text-success" : overshoot().below > 0 ? "text-warn" : "text-fg")}`)}>${escape_html(overshoot().below > 0 ? "+" : "")}${escape_html(overshoot().below)}</dd>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <dt class="text-fg-muted">Contours</dt> <dd class="text-right font-mono text-fg">${escape_html(glyph().contours.length)}</dd> <dt class="text-fg-muted">On-curve points</dt> <dd class="text-right font-mono text-fg">${escape_html(pointCount())}</dd> <dt class="text-fg-muted" title="Sum of |signed shoelace area|; relative density measure">~ ink area</dt> <dd class="text-right font-mono text-fg">${escape_html((approxArea() / 1e3).toFixed(1))}k u²</dd></dl> <p class="mt-2 text-[10px] text-fg-subtle">Overshoots: rounds + diagonals typically need a few units above/below the cap or
				baseline so they look optically equal to flats. 10–15u at 1000 UPM is common.</p>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/font/anatomy-tips.ts
var TIPS = {
	72: {
		headline: "Stem rhythm anchor",
		body: "Sets vertical-stem thickness and cap-height for the whole uppercase. Crossbar usually a touch above optical centre, slightly thinner than verticals."
	},
	79: {
		headline: "Overshoot + symmetry",
		body: "Round caps should reach ~2% past cap-height and below baseline so they appear aligned with flat caps. LSB and RSB equal."
	},
	86: {
		headline: "Diagonal weight comp",
		body: "Diagonals usually drawn slightly heavier than verticals to look equal. Watch the apex — sharpen or trap as needed to avoid clogging."
	},
	77: {
		headline: "Splay + apex",
		body: "Outer stems can be vertical or splayed. Apex can sit on baseline or hover. Each choice changes the whole sans/serif character."
	},
	87: {
		headline: "Crossing valleys",
		body: "Two V shapes share counters. Inner diagonals get reduced weight; valley apexes sit on baseline (usually)."
	},
	75: {
		headline: "Junction problem",
		body: "Where the diagonals meet the stem is the single hardest junction in the alphabet. Most designers ink-trap or split the strokes."
	},
	65: {
		headline: "Apex + crossbar",
		body: "Crossbar typically sits at or just below middle of cap-height. Apex can be sharp, flat, or notched. Diagonal weight matches V/W."
	},
	110: {
		headline: "Lowercase rhythm anchor",
		body: "Sets the entire lowercase texture: stem width, arch shape, terminal, sidebearings. Every other lowercase reads against n."
	},
	111: {
		headline: "Lowercase counter shape",
		body: "Round lowercase also overshoots x-height and baseline. Stress (where strokes thin) defines whether the family reads as humanist, geometric, or transitional."
	},
	97: {
		headline: "Double-storey or single?",
		body: "Two-storey reads as text-friendly; single-storey reads as display/geometric. The bowl-to-counter ratio in the upper half is decisive."
	},
	101: {
		headline: "Eye + crossbar",
		body: "Crossbar height controls the eye size. Lower it for openness at small sizes; raise it for elegance at display."
	},
	115: {
		headline: "Balanced spine",
		body: "The trickiest lowercase. Upper bowl slightly smaller than lower bowl so it looks balanced — the lower one carries more visual weight."
	},
	99: {
		headline: "Aperture",
		body: "How open the curve is at the right controls text clarity (open = legible at small sizes) vs. display elegance (closed)."
	},
	112: {
		headline: "Descender + stem",
		body: "Stem matches n/h/m. Bowl matches o's curve logic. Descender depth picks the line-spacing baseline for the whole family."
	},
	118: {
		headline: "Diagonal weight + apex",
		body: "Same comp as uppercase V at smaller scale. Lowercase apex usually flatter or notched to sit cleanly on baseline."
	},
	121: {
		headline: "Descender junction",
		body: "How the descender joins the diagonals (curved, straight, hooked) is a strong character cue."
	},
	102: {
		headline: "Terminal + hook",
		body: "Top terminal (ball, flat, ear) sets a lot of the family voice. Crossbar should align with the e/t crossbars."
	},
	103: {
		headline: "Single or double-storey",
		body: "Double-storey is the technical showpiece. Single-storey is friendlier and easier. Pick the one that matches a's storey count."
	},
	104: {
		headline: "Twin of n",
		body: "Stem + arch must exactly match n. Ascender depth matches b/d/k/l. Sidebearings: LSB matches n, RSB matches n."
	},
	66: {
		headline: "Two bowls",
		body: "Upper bowl is slightly smaller than lower — same optical-balance rule as lowercase s. Junction at the spine is delicate."
	},
	82: {
		headline: "Leg junction",
		body: "Leg can join the bowl, the spine, or split. Each choice rhymes (or doesn't) with K's junction."
	},
	83: {
		headline: "Spine balance",
		body: "Uppercase version of s. Upper curve a touch smaller than lower so the form sits visually."
	},
	48: {
		headline: "Disambiguate from O",
		body: "Narrower than O is the norm; some fonts add a slash (`zero` feature). Match figure height to numeral style (lining vs. oldstyle)."
	},
	49: {
		headline: "Set numeral width",
		body: "Often the narrowest figure — but in tabular figures, all digits use the same advance. Decide which the default is."
	},
	46: {
		headline: "Punctuation weight",
		body: "Decide square vs. round dot. Its weight propagates to colon, semicolon, ellipsis. Sits on baseline."
	},
	44: {
		headline: "Comma + quote rhyme",
		body: "Should rhyme with ‘quoteright’ — same shape, lowered to baseline. Tail length affects rhythm in dense paragraphs."
	}
};
var tipFor = (codepoint) => TIPS[codepoint] ?? null;
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/lightbulb.svelte
function Lightbulb($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "lightbulb" },
		props,
		{ iconNode: [
			["path", { "d": "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }],
			["path", { "d": "M9 18h6" }],
			["path", { "d": "M10 22h4" }]
		] }
	]));
}
//#endregion
//#region src/lib/stores/clipboard.svelte.ts
var MIME_TAG = "__fontstudio-glyph-v1__";
var memoryFallback = null;
var copyGlyphToClipboard = async (glyph) => {
	const payload = {
		tag: MIME_TAG,
		advanceWidth: glyph.advanceWidth,
		leftSidebearing: glyph.leftSidebearing,
		rightSidebearing: glyph.rightSidebearing,
		contours: JSON.parse(JSON.stringify(glyph.contours)),
		anchors: glyph.anchors ? JSON.parse(JSON.stringify(glyph.anchors)) : void 0,
		components: glyph.components ? JSON.parse(JSON.stringify(glyph.components)) : void 0,
		sourceName: glyph.name
	};
	memoryFallback = payload;
	try {
		await navigator.clipboard.writeText(JSON.stringify(payload));
		return true;
	} catch {
		return true;
	}
};
var readGlyphFromClipboard = async () => {
	try {
		const text = await navigator.clipboard.readText();
		const parsed = JSON.parse(text);
		if (parsed && parsed.tag === MIME_TAG) return parsed;
	} catch {}
	return memoryFallback;
};
//#endregion
//#region src/routes/project/[id]/edit/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let tool = "pencil";
		let strokeSize = DEFAULT_STROKE.size;
		let strokeThinning = DEFAULT_STROKE.thinning;
		let smoothness = 1;
		let cubicTrace = DEFAULT_TRACE.cubic;
		let cubicMaxError = DEFAULT_TRACE.cubicMaxError;
		let tourOpen = false;
		let skipEmptyNav = settings.editor.skipEmptyNav;
		let showAnatomy = settings.editor.showAnatomy;
		const glyph = derived(() => projectStore.selectedGlyph);
		const metrics = derived(() => projectStore.project?.metrics);
		let showSketch = true;
		let showVector = true;
		let showGrid = settings.editor.showGrid;
		let showReference = settings.editor.showReference;
		let showOnion = settings.editor.showOnion;
		let showAnchors = settings.editor.showAnchors;
		const familyReferenceGlyph = derived(() => {
			return null;
		});
		let snapToMetrics = true;
		let zoomPercent = 100;
		let resetSignal = 0;
		let metricsText = "Hamburgevons";
		let metricsSize = 96;
		const strokeStyle = derived(() => ({
			...DEFAULT_STROKE,
			size: strokeSize,
			thinning: strokeThinning
		}));
		const countPathPoints = (commands) => commands.filter((c) => c.type === "M" || c.type === "L" || c.type === "C" || c.type === "Q").length;
		let vfPreviewOpen = false;
		const hasMastersForGlyph = derived(() => (projectStore.project?.masters?.length ?? 0) > 0 && (projectStore.project?.axes?.length ?? 0) > 0);
		derived(() => {
			return null;
		});
		const mastersStripGlyphs = derived(() => {
			if (!projectStore.project || !glyph()) return [];
			const masters = projectStore.project.masters ?? [];
			if (masters.length === 0) return [];
			const defaultGlyph = projectStore.project.glyphs[glyph().codepoint];
			const baseSignature = defaultGlyph?.contours.length ? defaultGlyph.contours.map((c) => c.commands.length).join("/") : null;
			const out = [{
				id: void 0,
				name: "Default",
				glyph: defaultGlyph,
				compatible: true
			}];
			for (const m of masters) {
				const g = m.glyphs[glyph().codepoint];
				let compatible = true;
				if (baseSignature && g && g.contours.length > 0) compatible = g.contours.map((c) => c.commands.length).join("/") === baseSignature;
				out.push({
					id: m.id,
					name: m.name,
					glyph: g,
					compatible
				});
			}
			return out;
		});
		const usedByGlyphs = derived(() => {
			if (!projectStore.project || !glyph()) return [];
			return Object.values(projectStore.project.glyphs).filter((g) => (g.components ?? []).some((c) => c.baseCodepoint === glyph().codepoint));
		});
		const spacingSuggestion = derived(() => {
			if (!projectStore.project || !glyph() || glyph().contours.length === 0) return null;
			const cp = glyph().codepoint;
			const sameCategory = (other) => {
				if (cp >= 65 && cp <= 90) return other >= 65 && other <= 90;
				if (cp >= 97 && cp <= 122) return other >= 97 && other <= 122;
				if (cp >= 48 && cp <= 57) return other >= 48 && other <= 57;
				return false;
			};
			const myBounds = glyphBounds(glyph().contours);
			const myWidth = myBounds.maxX - myBounds.minX;
			if (myWidth <= 0) return null;
			const peers = Object.values(projectStore.project.glyphs).filter((g) => g.codepoint !== cp && g.contours.length > 0 && sameCategory(g.codepoint));
			if (peers.length === 0) return null;
			const closest = peers.map((g) => {
				const b = glyphBounds(g.contours);
				const w = b.maxX - b.minX;
				return {
					glyph: g,
					diff: Math.abs(w - myWidth)
				};
			}).sort((a, b) => a.diff - b.diff)[0];
			if (closest.glyph.leftSidebearing === glyph().leftSidebearing && closest.glyph.rightSidebearing === glyph().rightSidebearing) return null;
			return {
				peerName: closest.glyph.name,
				peerChar: String.fromCodePoint(closest.glyph.codepoint),
				lsb: closest.glyph.leftSidebearing,
				rsb: closest.glyph.rightSidebearing
			};
		});
		const copyableMetricSources = derived(() => {
			if (!projectStore.project || !glyph()) return [];
			return Object.values(projectStore.project.glyphs).filter((g) => g.codepoint !== glyph().codepoint && g.contours.length > 0).sort((a, b) => a.codepoint - b.codepoint);
		});
		const copyMetricsFrom = (codepoint) => {
			if (!projectStore.project || !glyph() || !codepoint) return;
			const src = projectStore.project.glyphs[codepoint];
			if (!src) return;
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				advanceWidth: src.advanceWidth,
				leftSidebearing: src.leftSidebearing,
				rightSidebearing: src.rightSidebearing
			}));
		};
		const glyphStats = derived(() => {
			if (!glyph() || glyph().contours.length === 0) return {
				contours: 0,
				points: 0,
				minX: 0,
				maxX: 0,
				minY: 0,
				maxY: 0,
				width: 0,
				height: 0
			};
			const b = glyphBounds(glyph().contours);
			const points = glyph().contours.reduce((n, c) => n + countPathPoints(c.commands), 0);
			return {
				contours: glyph().contours.length,
				points,
				minX: Math.round(b.minX),
				maxX: Math.round(b.maxX),
				minY: Math.round(b.minY),
				maxY: Math.round(b.maxY),
				width: Math.round(b.maxX - b.minX),
				height: Math.round(b.maxY - b.minY)
			};
		});
		const anatomyTip = derived(() => glyph() ? tipFor(glyph().codepoint) : null);
		const peerComparison = derived(() => {
			if (!projectStore.project || !glyph() || glyph().contours.length === 0) return null;
			const cp = glyph().codepoint;
			const sameCat = (other) => {
				if (cp >= 65 && cp <= 90) return other >= 65 && other <= 90;
				if (cp >= 97 && cp <= 122) return other >= 97 && other <= 122;
				if (cp >= 48 && cp <= 57) return other >= 48 && other <= 57;
				return false;
			};
			const peers = Object.values(projectStore.project.glyphs).filter((g) => g.codepoint !== cp && sameCat(g.codepoint) && g.contours.length > 0);
			if (peers.length < 2) return null;
			const adv = peers.map((g) => g.advanceWidth).sort((a, b) => a - b);
			const medianAdv = adv[Math.floor(adv.length / 2)];
			const diff = glyph().advanceWidth - medianAdv;
			return {
				medianAdv,
				diff,
				pct: Math.round(Math.abs(diff) / medianAdv * 100),
				peerCount: peers.length
			};
		});
		const CONTROL_GLYPHS = [
			110,
			111,
			72,
			79,
			97,
			101,
			115,
			99,
			112,
			118,
			121,
			102,
			103
		];
		const totalDrawn = derived(() => projectStore.project ? Object.values(projectStore.project.glyphs).filter((g) => g.contours.length > 0).length : 0);
		const controlMissing = derived(() => projectStore.project ? CONTROL_GLYPHS.filter((cp) => (projectStore.project.glyphs[cp]?.contours.length ?? 0) === 0) : []);
		const showControlHint = derived(() => totalDrawn() < 13 && controlMissing().length > 0);
		/**
		* Priority codepoints by use case. We surface up to 8 missing glyphs in
		* priority order — control glyphs first, then use-case-specific picks
		* derived from the Brief.
		*/
		const useCaseTargets = (uc) => {
			const digits = [
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
			];
			const corePunct = [
				46,
				44,
				58,
				59,
				33,
				63,
				39,
				34
			];
			const wrap = [
				40,
				41,
				45,
				8211,
				8212
			];
			switch (uc) {
				case "web-ui": return [...digits, ...corePunct];
				case "body-text": return [
					...corePunct,
					...wrap,
					...digits
				];
				case "data-tables": return [
					...digits,
					46,
					44,
					37,
					36
				];
				case "code": return [
					...digits,
					91,
					93,
					123,
					125,
					47,
					92,
					61
				];
				case "display": return [];
				default: return [...digits, ...corePunct];
			}
		};
		const suggestedNext = derived(() => {
			if (!projectStore.project) return [];
			const useCases = projectStore.project.brief?.useCases ?? [];
			const priority = [];
			for (const cp of CONTROL_GLYPHS) if ((projectStore.project.glyphs[cp]?.contours.length ?? 0) === 0) priority.push(cp);
			for (const uc of useCases) for (const cp of useCaseTargets(uc)) {
				if (priority.includes(cp)) continue;
				if ((projectStore.project.glyphs[cp]?.contours.length ?? 0) === 0) priority.push(cp);
			}
			return priority.slice(0, 10);
		});
		const showSuggestedNext = derived(() => totalDrawn() >= 1 && suggestedNext().length > 0 && totalDrawn() < 50);
		const briefIsEmpty = derived(() => {
			const b = projectStore.project?.brief;
			if (!b) return true;
			return !(b.intent?.trim() || b.audience?.trim() || (b.useCases?.length ?? 0) > 0 || b.differentiation?.trim() || (b.references?.length ?? 0) > 0);
		});
		const showBriefFirstHint = derived(() => totalDrawn() === 0 && briefIsEmpty());
		const referenceGlyph = derived(() => {
			if (!showReference || !glyph() || !projectStore.project) return null;
			const cp = glyph().codepoint;
			const candidates = [];
			if (cp >= 65 && cp <= 90) candidates.push(72, 79, 78);
			else if (cp >= 97 && cp <= 122) candidates.push(110, 111);
			else if (cp >= 48 && cp <= 57) candidates.push(48, 49);
			else if (cp === 32 || cp === 46) return null;
			else candidates.push(72, 110, 111);
			for (const c of candidates) {
				if (c === cp) continue;
				const g = projectStore.project.glyphs[c];
				if (g && g.contours.length > 0) return g;
			}
			return null;
		});
		const onionGlyphs = derived(() => {
			if (!showOnion || !glyph() || !projectStore.project) return {
				prev: null,
				next: null
			};
			const codepoints = Object.keys(projectStore.project.glyphs).map(Number).sort((a, b) => a - b);
			const idx = codepoints.indexOf(glyph().codepoint);
			if (idx === -1) return {
				prev: null,
				next: null
			};
			const findDrawn = (start, step) => {
				let i = start;
				while (i >= 0 && i < codepoints.length) {
					const g = projectStore.project.glyphs[codepoints[i]];
					if (g && g.contours.length > 0) return g;
					i += step;
				}
				return null;
			};
			return {
				prev: findDrawn(idx - 1, -1),
				next: findDrawn(idx + 1, 1)
			};
		});
		const charLabel = derived(() => glyph() ? glyph().codepoint > 32 && glyph().codepoint < 65536 ? String.fromCodePoint(glyph().codepoint) : glyph().codepoint === 32 ? "space" : glyph().name : "");
		const trace = () => {
			if (!glyph() || !glyph().sketch || glyph().sketch.length === 0) return;
			const raw = sketchToContours(glyph().sketch, strokeStyle(), {
				cubic: cubicTrace,
				cubicMaxError
			});
			const contours = cubicTrace ? raw : chaikinSmooth(raw, smoothness);
			const bounds = glyphBounds(contours);
			const advance = contours.length > 0 ? Math.max(Math.round(bounds.maxX + glyph().rightSidebearing), glyph().leftSidebearing + glyph().rightSidebearing + 50) : glyph().advanceWidth;
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				contours,
				status: contours.length > 0 ? "draft" : g.status,
				advanceWidth: advance
			}));
			if (contours.length > 0) tool = "edit";
		};
		const handleContoursChange = (contours) => {
			if (!glyph()) return;
			const cp = glyph().codepoint;
			projectStore.updateGlyph(cp, (g) => ({
				...g,
				contours,
				status: contours.length > 0 ? "draft" : g.sketch && g.sketch.length > 0 ? "sketch" : "empty"
			}));
		};
		const handleAnchorsChange = (anchors) => {
			if (!glyph()) return;
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				anchors
			}));
		};
		let deriveSourceCp = null;
		let deriveTransform = "flipH";
		const drawnSources = derived(() => {
			if (!projectStore.project || !glyph()) return [];
			return Object.values(projectStore.project.glyphs).filter((g) => g.codepoint !== glyph().codepoint && g.contours.length > 0).sort((a, b) => a.codepoint - b.codepoint);
		});
		const copyGlyph = async () => {
			if (!glyph()) return;
			await copyGlyphToClipboard(glyph());
			toast.success(`Copied "${glyph().name}" to clipboard`);
		};
		const pasteGlyph = async () => {
			if (!glyph()) return;
			const payload = await readGlyphFromClipboard();
			if (!payload) {
				toast.warn("Clipboard does not contain a Font Studio glyph.");
				return;
			}
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				contours: payload.contours,
				advanceWidth: payload.advanceWidth,
				leftSidebearing: payload.leftSidebearing,
				rightSidebearing: payload.rightSidebearing,
				anchors: payload.anchors ?? g.anchors,
				components: payload.components ?? g.components,
				status: payload.contours.length > 0 ? "draft" : g.status
			}));
			toast.success(`Pasted ${payload.contours.length} contour${payload.contours.length === 1 ? "" : "s"}`);
		};
		let autoCleaning = false;
		let simplifying = false;
		const autoSpace = () => {
			if (!glyph() || !projectStore.project || glyph().contours.length === 0) return;
			const bounds = glyphBounds(glyph().contours);
			const sb = projectStore.project.metrics.defaultSidebearing;
			const dx = Math.round(sb - bounds.minX);
			projectStore.updateGlyph(glyph().codepoint, (g) => {
				const shifted = dx === 0 ? g.contours : g.contours.map((c) => ({
					...c,
					commands: c.commands.map((cmd) => {
						if (cmd.type === "M" || cmd.type === "L") return {
							...cmd,
							x: cmd.x + dx
						};
						if (cmd.type === "Q") return {
							...cmd,
							x1: cmd.x1 + dx,
							x: cmd.x + dx
						};
						if (cmd.type === "C") return {
							...cmd,
							x1: cmd.x1 + dx,
							x2: cmd.x2 + dx,
							x: cmd.x + dx
						};
						return cmd;
					})
				}));
				const newBounds = glyphBounds(shifted);
				const width = newBounds.maxX - newBounds.minX;
				return {
					...g,
					contours: shifted,
					leftSidebearing: sb,
					rightSidebearing: sb,
					advanceWidth: Math.max(50, Math.round(sb * 2 + width))
				};
			});
		};
		const exportGlyphPng = () => {
			if (!glyph() || !metrics() || glyph().contours.length === 0) return;
			const bounds = glyphBounds(glyph().contours);
			const padX = 60;
			const padY = 60;
			const left = Math.min(0, bounds.minX) - padX;
			const right = Math.max(glyph().advanceWidth, bounds.maxX) + padX;
			const top = metrics().ascender + padY;
			const bottom = metrics().descender - padY;
			const width = right - left;
			const height = top - bottom;
			const px = 800;
			const scale = px / width;
			const c = document.createElement("canvas");
			c.width = Math.round(px);
			c.height = Math.round(height * scale);
			const ctx = c.getContext("2d");
			if (!ctx) return;
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, c.width, c.height);
			ctx.save();
			ctx.translate(-left * scale, top * scale);
			ctx.scale(scale, -scale);
			ctx.fillStyle = "black";
			ctx.fill(new Path2D(contoursToSvgPath(glyph().contours)), "evenodd");
			ctx.restore();
			c.toBlob((blob) => {
				if (!blob) return;
				const safeName = (glyph().name || "glyph").replace(/[^a-zA-Z0-9_-]/g, "_");
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${safeName}.png`;
				a.click();
				URL.revokeObjectURL(url);
				toast.success(`Exported ${safeName}.png`);
			}, "image/png");
		};
		const copyGlyphPath = async () => {
			if (!glyph() || glyph().contours.length === 0) return;
			const d = contoursToSvgPath(glyph().contours);
			try {
				await navigator.clipboard.writeText(d);
				toast.success(`Copied path (${d.length} chars)`);
			} catch {
				toast.error("Clipboard write failed.");
			}
		};
		const exportGlyphSvg = () => {
			if (!glyph() || !metrics() || glyph().contours.length === 0) return;
			const bounds = glyphBounds(glyph().contours);
			const padX = 40;
			const padY = 40;
			const left = Math.min(0, bounds.minX) - padX;
			const right = Math.max(glyph().advanceWidth, bounds.maxX) + padX;
			const top = metrics().ascender + padY;
			const bottom = metrics().descender - padY;
			const width = right - left;
			const height = top - bottom;
			const pathD = contoursToSvgPath(glyph().contours);
			const safeName = (glyph().name || "glyph").replace(/[^a-zA-Z0-9_-]/g, "_");
			const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${-top} ${width} ${height}" width="${width}" height="${height}">
	<g transform="scale(1, -1)">
		<path d="${pathD}" fill="black" fill-rule="evenodd" />
	</g>
</svg>
`;
			const blob = new Blob([svg], { type: "image/svg+xml" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${safeName}.svg`;
			a.click();
			URL.revokeObjectURL(url);
		};
		const clearSketch = () => {
			if (!glyph()) return;
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				sketch: [],
				status: g.contours.length > 0 ? g.status : "empty"
			}));
		};
		const clearVector = () => {
			if (!glyph()) return;
			if (!confirm("Clear the vector outline for this glyph?")) return;
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				contours: [],
				status: g.sketch && g.sketch.length > 0 ? "sketch" : "empty"
			}));
		};
		const handleSketchChange = (strokes) => {
			if (!glyph()) return;
			const cp = glyph().codepoint;
			projectStore.updateGlyph(cp, (g) => ({
				...g,
				sketch: strokes,
				status: strokes.length > 0 && g.contours.length === 0 ? "sketch" : g.status
			}));
		};
		const undoLastStroke = () => {
			if (!glyph() || !glyph().sketch || glyph().sketch.length === 0) return;
			projectStore.updateGlyph(glyph().codepoint, (g) => ({
				...g,
				sketch: g.sketch?.slice(0, -1)
			}));
		};
		if (!glyph() || !metrics()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Loading glyph" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="grid h-full grid-cols-[1fr_280px]"><div class="flex min-h-0 flex-col"><div class="flex items-center gap-2 border-b border-border bg-surface px-4 py-2"><div class="flex items-center gap-2 pr-3"><span class="flex h-9 min-w-9 items-center justify-center rounded-md bg-fg/5 px-2 text-xl font-medium text-fg">${escape_html(charLabel())}</span> <div class="grid leading-tight"><span class="text-sm font-medium text-fg">${escape_html(glyph().name)}</span> <span class="text-[11px] text-fg-subtle" data-numeric="">U+${escape_html(glyph().codepoint.toString(16).toUpperCase().padStart(4, "0"))} · ${escape_html(glyph().status)}</span></div> <button type="button"${attr_class(`ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 ${stringify(glyph().pinned ? "text-warn hover:text-warn" : "hover:text-fg")}`)}${attr("aria-label", glyph().pinned ? "Unpin glyph" : "Pin glyph")}${attr("title", glyph().pinned ? "Unpin" : "Pin for quick access")}>`);
			Pin($$renderer, { class: `size-3.5 ${stringify(glyph().pinned ? "fill-current" : "")}` });
			$$renderer.push(`<!----></button> <button type="button"${attr_class(`inline-flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 ${stringify(glyph().flagged ? "text-warn hover:text-warn" : "hover:text-fg")}`)}${attr("aria-label", glyph().flagged ? "Unflag glyph" : "Flag glyph for review")}${attr("title", glyph().flagged ? "Unflag" : "Flag for review (⇧F)")}>`);
			Flag($$renderer, { class: `size-3.5 ${stringify(glyph().flagged ? "fill-current" : "")}` });
			$$renderer.push(`<!----></button></div> <div class="h-6 w-px bg-border"></div> <div class="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5"><button type="button"${attr_class(`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${stringify(tool === "pencil" ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}`)} title="Pencil (P)" aria-label="Pencil">`);
			Pencil($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button> <button type="button"${attr_class(`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${stringify(tool === "eraser" ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}`)} title="Eraser (E)" aria-label="Eraser">`);
			Eraser($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button> <button type="button"${attr_class(`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${stringify(tool === "edit" ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}`)} title="Edit points (A)" aria-label="Edit points"${attr("disabled", glyph().contours.length === 0, true)}>`);
			Mouse_pointer_2($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button></div> <label class="flex items-center gap-2 pl-2"><span class="text-[11px] font-medium text-fg-muted">Brush</span> <input type="range"${attr("min", 10)}${attr("max", 120)}${attr("step", 2)}${attr("value", strokeSize)} class="h-1 w-24 accent-fg" aria-label="Brush size"/> <span class="w-8 text-[11px] text-fg-subtle" data-numeric="">${escape_html(strokeSize)}</span></label> <div class="ml-auto flex items-center gap-1"><button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors ${stringify(skipEmptyNav ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg")}`)} title="[ ] navigation skips empty glyphs">Skip empty</button> <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" title="Show editor tour" aria-label="Show editor tour">`);
			Circle_question_mark($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button> <button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" title="Fit to glyph (⌘0)">`);
			Maximize($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----> <span data-numeric="">${escape_html(zoomPercent)}%</span></button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify(showReference ? "bg-fg/10 text-fg" : "text-fg-subtle hover:bg-surface-2")}`)} title="Toggle reference glyph (R)">`);
			if (showReference) {
				$$renderer.push("<!--[0-->");
				Eye($$renderer, { class: "size-3.5" });
			} else {
				$$renderer.push("<!--[-1-->");
				Eye_off($$renderer, { class: "size-3.5" });
			}
			$$renderer.push(`<!--]--> Ref</button> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify(showAnchors ? "bg-warn/10 text-warn" : "text-fg-subtle hover:bg-surface-2")}`)} title="Toggle anchors (X)">`);
			if (showAnchors) {
				$$renderer.push("<!--[0-->");
				Eye($$renderer, { class: "size-3.5" });
			} else {
				$$renderer.push("<!--[-1-->");
				Eye_off($$renderer, { class: "size-3.5" });
			}
			$$renderer.push(`<!--]--> Anchors</button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify(showOnion ? "bg-fg/10 text-fg" : "text-fg-subtle hover:bg-surface-2")}`)} title="Onion-skin previous/next glyph (O)">`);
			if (showOnion) {
				$$renderer.push("<!--[0-->");
				Eye($$renderer, { class: "size-3.5" });
			} else {
				$$renderer.push("<!--[-1-->");
				Eye_off($$renderer, { class: "size-3.5" });
			}
			$$renderer.push(`<!--]--> Onion</button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify("bg-fg/10 text-fg")}`)} title="Snap to metrics while editing points">Snap</button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify("bg-warn/10 text-warn")}`)} title="Toggle sketch layer (S)">`);
			$$renderer.push("<!--[0-->");
			Eye($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!--]--> Sketch</button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify("bg-accent/10 text-accent")}`)} title="Toggle vector layer (V)">`);
			$$renderer.push("<!--[0-->");
			Eye($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!--]--> Vector</button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify(showGrid ? "bg-fg/10 text-fg" : "text-fg-subtle hover:bg-surface-2")}`)} title="Toggle grid (G)">`);
			Grid_3x3($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----> Grid</button> <button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify(showAnatomy ? "bg-fg/10 text-fg" : "text-fg-subtle hover:bg-surface-2")}`)} title="Show overshoot zones for round glyphs">`);
			Eye($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----> Overshoot</button> `);
			if (hasMastersForGlyph()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button"${attr_class(`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors ${stringify("text-fg-subtle hover:bg-surface-2")}`)} title="Live interpolation preview">`);
				Sliders_horizontal($$renderer, { class: "size-3.5" });
				$$renderer.push(`<!----> VF</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></div> `);
			if (showBriefFirstHint() && projectStore.project) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="flex items-center gap-3 border-b border-border bg-warn-soft/30 bg-warn/5 px-4 py-2 text-[12px] text-fg-muted"><span class="font-medium text-warn">Before you draw →</span> <span>Type design is system design. Write a one-line intent and pick a use case
						or two — it'll guide every decision below.</span> <a${attr("href", `/project/${stringify(projectStore.project.id)}/brief`)} class="ml-auto rounded border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn hover:bg-warn/15">Open Brief →</a></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (showControlHint()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="flex items-center gap-3 border-b border-border bg-accent-soft/30 px-4 py-2 text-[12px] text-fg-muted"><span class="font-medium text-accent">Start here →</span> <span>Draw these ${escape_html(controlMissing().length)} first; they set proportion + texture for everything else.</span> <div class="ml-auto flex flex-wrap items-center gap-1"><!--[-->`);
				const each_array = ensure_array_like(controlMissing());
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let cp = each_array[$$index];
					$$renderer.push(`<button type="button" class="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1 text-[13px] font-medium hover:border-accent hover:bg-accent-soft"${attr("title", `Jump to ${stringify(String.fromCodePoint(cp))}`)}>${escape_html(String.fromCodePoint(cp))}</button>`);
				}
				$$renderer.push(`<!--]--></div></div>`);
			} else if (showSuggestedNext()) {
				$$renderer.push("<!--[1-->");
				$$renderer.push(`<div class="flex items-center gap-3 border-b border-border bg-accent-soft/20 px-4 py-2 text-[12px] text-fg-muted"><span class="font-medium text-accent">Suggested next →</span> <span>Priority picks based on your Brief use cases (${escape_html((projectStore.project?.brief?.useCases ?? []).join(", ") || "defaults")}).</span> <div class="ml-auto flex flex-wrap items-center gap-1"><!--[-->`);
				const each_array_1 = ensure_array_like(suggestedNext());
				for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
					let cp = each_array_1[$$index_1];
					const ch = cp > 32 && cp < 65536 ? String.fromCodePoint(cp) : "?";
					$$renderer.push(`<button type="button" class="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1 text-[13px] font-medium hover:border-accent hover:bg-accent-soft"${attr("title", `Jump to U+${stringify(cp.toString(16).toUpperCase().padStart(4, "0"))}`)}>${escape_html(ch)}</button>`);
				}
				$$renderer.push(`<!--]--></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div${attr_class(`relative min-h-0 flex-1 overflow-hidden bg-canvas p-6 ${stringify("")}`)} role="application">`);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="absolute inset-6 grid place-items-stretch">`);
			DrawingCanvas($$renderer, {
				glyph: glyph(),
				metrics: metrics(),
				tool,
				strokeStyle: strokeStyle(),
				showSketch,
				showVector,
				showGrid,
				showAnatomy,
				reference: referenceGlyph(),
				familyReference: familyReferenceGlyph(),
				onionPrev: onionGlyphs().prev,
				onionNext: onionGlyphs().next,
				snapToMetrics,
				showAnchors,
				resetSignal,
				onSketchChange: handleSketchChange,
				onContoursChange: handleContoursChange,
				onAnchorsChange: handleAnchorsChange,
				onZoomChange: (p) => zoomPercent = p
			});
			$$renderer.push(`<!----></div></div> `);
			if (hasMastersForGlyph() && vfPreviewOpen);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (mastersStripGlyphs().length > 1) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="flex items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-2 overflow-x-auto"><span class="shrink-0 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Masters</span> <!--[-->`);
				const each_array_3 = ensure_array_like(mastersStripGlyphs());
				for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
					let item = each_array_3[$$index_3];
					const isActive = (projectStore.selectedMasterId ?? "") === (item.id ?? "");
					$$renderer.push(`<button type="button"${attr_class(`relative flex shrink-0 flex-col items-center gap-0.5 rounded border px-2 py-1 transition-colors ${stringify(isActive ? "border-accent bg-accent-soft" : item.compatible ? "border-border bg-surface hover:border-accent/50" : "border-danger/60 bg-surface hover:border-danger")}`)}${attr("title", item.compatible ? `Switch to ${item.name}` : `${item.name} — contour/point counts don't match Default. Sync from Default to fix.`)}>`);
					if (!item.compatible) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-danger" aria-label="Incompatible"></span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <svg${attr("viewBox", `0 0 ${stringify(Math.max(item.glyph?.advanceWidth ?? 100, 100))} ${stringify((metrics()?.ascender ?? 800) - (metrics()?.descender ?? -200))}`)} width="40" height="40" preserveAspectRatio="xMidYMid meet" style="transform: scaleY(-1);" aria-hidden="true">`);
					if (item.glyph && item.glyph.contours.length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<g${attr("transform", `translate(0 ${stringify(-(metrics()?.ascender ?? 800))})`)}><path${attr("d", contoursToSvgPath(item.glyph.contours))} fill="currentColor" fill-rule="evenodd"></path></g>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></svg> <span${attr_class(`text-[10px] font-medium ${stringify(isActive ? "text-accent" : "text-fg-muted")}`)}>${escape_html(item.name)}</span></button>`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="flex flex-col gap-1.5 border-t border-border bg-surface px-4 py-2.5"><div class="flex items-center gap-3"><input type="text"${attr("value", metricsText)} placeholder="Type to preview…" class="h-7 flex-1 rounded-md border border-border bg-surface-2 px-2 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/> <label class="flex items-center gap-1.5"><span class="text-[11px] text-fg-muted">Size</span> <input type="range"${attr("min", 24)}${attr("max", 200)}${attr("step", 4)}${attr("value", metricsSize)} class="h-1 w-24 accent-fg" aria-label="Metrics preview size"/> <span class="w-8 text-[11px] text-fg-subtle" data-numeric="">${escape_html(metricsSize)}</span></label> <button type="button" class="inline-flex size-6 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg" title="Collapse the live preview + action bar" aria-label="Collapse bottom bar">`);
			Chevron_down($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button></div> <div class="preview-font max-h-[120px] overflow-x-auto overflow-y-hidden whitespace-nowrap leading-[1]"${attr_style(`font-size: ${stringify(metricsSize)}px;`)}>${escape_html(metricsText)}</div></div> <div class="flex items-center gap-2 border-t border-border bg-surface px-4 py-2.5">`);
			{
				function icon($$renderer) {
					Wand_sparkles($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "primary",
					density: "sm",
					onclick: trace,
					disabled: !glyph().sketch?.length,
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Trace to vector (T)`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					Rotate_ccw($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: undoLastStroke,
					disabled: !glyph().sketch?.length,
					"aria-label": "Undo last stroke",
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Undo stroke`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					Align_horizontal_space_around($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "secondary",
					density: "sm",
					onclick: autoSpace,
					disabled: glyph().contours.length === 0,
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Auto-space`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					Copy($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: copyGlyph,
					disabled: glyph().contours.length === 0,
					"aria-label": "Copy glyph (⌘⇧C)",
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Copy`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					Clipboard_paste($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: pasteGlyph,
					"aria-label": "Paste glyph (⌘⇧V)",
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Paste`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> <div class="ml-auto flex items-center gap-2">`);
			{
				function icon($$renderer) {
					Copy($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: copyGlyphPath,
					disabled: glyph().contours.length === 0,
					"aria-label": "Copy SVG path attribute to clipboard",
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Copy path`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					File_text($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: exportGlyphPng,
					disabled: glyph().contours.length === 0,
					"aria-label": "Export this glyph as PNG",
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->PNG`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					File_text($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: exportGlyphSvg,
					disabled: glyph().contours.length === 0,
					"aria-label": "Export this glyph as SVG",
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Export SVG`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					Trash_2($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: clearSketch,
					disabled: !glyph().sketch?.length,
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Clear sketch`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> `);
			{
				function icon($$renderer) {
					Trash_2($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					variant: "ghost",
					density: "sm",
					onclick: clearVector,
					disabled: glyph().contours.length === 0,
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->Clear vector`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----></div></div>`);
			$$renderer.push(`<!--]--></div> <aside class="h-full overflow-y-auto border-l border-border bg-surface"><div class="border-b border-border p-4"><h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span>Glyph</span> `);
			if (projectStore.selectedMasterId) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent" title="Copy contours/metrics from the default master into this master">Sync from Default</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></h3> `);
			Field($$renderer, {
				label: "Name",
				children: ($$renderer) => {
					Input($$renderer, {
						density: "sm",
						value: glyph().name,
						onchange: (e) => projectStore.renameGlyph(glyph().codepoint, e.currentTarget.value),
						class: "font-mono text-[12px]"
					});
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			if (anatomyTip()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mt-2 flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 px-2 py-1.5">`);
				Lightbulb($$renderer, { class: "mt-0.5 size-3 shrink-0 text-warn" });
				$$renderer.push(`<!----> <div class="min-w-0"><div class="text-[11px] font-semibold text-fg">${escape_html(anatomyTip().headline)}</div> <div class="text-[11px] leading-snug text-fg-muted">${escape_html(anatomyTip().body)}</div></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]"><dt class="text-fg-subtle">Contours</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(glyphStats().contours)}</dd> <dt class="text-fg-subtle">Points</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(glyphStats().points)}</dd> <dt class="text-fg-subtle">Width × Height</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(glyphStats().width)} × ${escape_html(glyphStats().height)}</dd> <dt class="text-fg-subtle">BBox X</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(glyphStats().minX)} → ${escape_html(glyphStats().maxX)}</dd> <dt class="text-fg-subtle">BBox Y</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(glyphStats().minY)} → ${escape_html(glyphStats().maxY)}</dd></dl> `);
			if (peerComparison()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mt-2 rounded border border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-fg-muted">vs peers (n=${escape_html(peerComparison().peerCount)}): median adv <span class="font-mono text-fg" data-numeric="">${escape_html(peerComparison().medianAdv)}</span> · <span${attr_class(`font-mono ${stringify(peerComparison().pct > 25 ? "text-warn" : "text-fg")}`)} data-numeric="">${escape_html(peerComparison().diff > 0 ? "+" : "")}${escape_html(peerComparison().diff)} (${escape_html(peerComparison().pct)}%)</span></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="border-b border-border p-4"><h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span class="inline-flex items-center gap-1.5">Metrics <button type="button"${attr_class(`rounded p-0.5 text-fg-subtle hover:bg-surface-2 ${stringify(glyph().metricsLocked ? "text-warn" : "hover:text-fg")}`)}${attr("aria-label", glyph().metricsLocked ? "Unlock metrics" : "Lock metrics")}${attr("title", glyph().metricsLocked ? "Unlock — allow LSB/RSB/Adv edits" : "Lock — prevent accidental LSB/RSB/Adv edits")}>`);
			if (glyph().metricsLocked) {
				$$renderer.push("<!--[0-->");
				Lock($$renderer, { class: "size-3" });
			} else {
				$$renderer.push("<!--[-1-->");
				Lock_open($$renderer, { class: "size-3" });
			}
			$$renderer.push(`<!--]--></button></span> `);
			$$renderer.select({
				value: "",
				disabled: glyph().metricsLocked,
				onchange: (e) => copyMetricsFrom(Number(e.currentTarget.value)),
				class: "rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40",
				title: "Copy LSB / RSB / advance from another glyph"
			}, ($$renderer) => {
				$$renderer.option({
					value: "",
					disabled: true,
					selected: true
				}, ($$renderer) => {
					$$renderer.push(`Copy from…`);
				});
				$$renderer.push(`<!--[-->`);
				const each_array_4 = ensure_array_like(copyableMetricSources());
				for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
					let g = each_array_4[$$index_4];
					$$renderer.option({ value: g.codepoint }, ($$renderer) => {
						$$renderer.push(`${escape_html(g.name)} · ${escape_html(g.advanceWidth)}/${escape_html(g.leftSidebearing)}/${escape_html(g.rightSidebearing)}`);
					});
				}
				$$renderer.push(`<!--]-->`);
			});
			$$renderer.push(`</h3> <div class="grid grid-cols-3 gap-2">`);
			Field($$renderer, {
				label: "Adv",
				children: ($$renderer) => {
					Input($$renderer, {
						type: "number",
						density: "sm",
						value: glyph().advanceWidth,
						disabled: glyph().metricsLocked,
						onchange: (e) => projectStore.updateGlyph(glyph().codepoint, (g) => ({
							...g,
							advanceWidth: Number(e.currentTarget.value)
						}))
					});
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Field($$renderer, {
				label: "LSB",
				children: ($$renderer) => {
					Input($$renderer, {
						type: "number",
						density: "sm",
						value: glyph().leftSidebearing,
						disabled: glyph().metricsLocked,
						onchange: (e) => projectStore.updateGlyph(glyph().codepoint, (g) => ({
							...g,
							leftSidebearing: Number(e.currentTarget.value)
						}))
					});
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Field($$renderer, {
				label: "RSB",
				children: ($$renderer) => {
					Input($$renderer, {
						type: "number",
						density: "sm",
						value: glyph().rightSidebearing,
						disabled: glyph().metricsLocked,
						onchange: (e) => projectStore.updateGlyph(glyph().codepoint, (g) => ({
							...g,
							rightSidebearing: Number(e.currentTarget.value)
						}))
					});
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----></div> `);
			if (spacingSuggestion()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button" class="mt-2 flex w-full items-center gap-1.5 rounded border border-dashed border-accent/40 bg-accent-soft/30 px-2 py-1.5 text-left text-[11px] text-fg-muted hover:border-accent hover:bg-accent-soft" title="Apply suggested LSB/RSB from a similar-width peer"><span>Match peer</span> <span class="preview-font text-fg">${escape_html(spacingSuggestion().peerChar)}</span> <span class="ml-auto font-mono text-accent" data-numeric="">${escape_html(spacingSuggestion().lsb)} / ${escape_html(spacingSuggestion().rsb)}</span></button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="border-b border-border p-4"><h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span>Status</span> <div class="flex items-center gap-0.5"><button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-warn/10 hover:text-warn" aria-label="Reset glyph to empty" title="Reset glyph (keep its slot but wipe data)">`);
			Rotate_ccw($$renderer, { class: "size-3" });
			$$renderer.push(`<!----></button> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Delete glyph" title="Remove this glyph from the font">`);
			Trash_2($$renderer, { class: "size-3" });
			$$renderer.push(`<!----></button></div></h3> <div class="grid grid-cols-2 gap-1"><!--[-->`);
			const each_array_5 = ensure_array_like([
				"empty",
				"sketch",
				"draft",
				"final"
			]);
			for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
				let status = each_array_5[$$index_5];
				$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2 py-1.5 text-[12px] font-medium capitalize transition-colors ${stringify(glyph().status === status ? "border-accent bg-accent-soft text-accent" : "border-border bg-transparent text-fg-muted hover:bg-surface-2")}`)}>${escape_html(status)}</button>`);
			}
			$$renderer.push(`<!--]--></div></div> <div class="border-b border-border p-4"><h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span>Anchors</span> <span class="text-fg-subtle/70" data-numeric="">${escape_html(glyph().anchors?.length ?? 0)}</span></h3> `);
			if (glyph().anchors && glyph().anchors.length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<ul class="mb-2 grid gap-1"><!--[-->`);
				const each_array_6 = ensure_array_like(glyph().anchors);
				for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
					let a = each_array_6[$$index_6];
					$$renderer.push(`<li class="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px]"><span class="font-mono text-warn">${escape_html(a.name)}</span> <span class="text-fg-subtle" data-numeric="">${escape_html(a.x)}, ${escape_html(a.y)}</span> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove anchor ${stringify(a.name)}`)}${attr("title", `Remove anchor ${stringify(a.name)}`)}>`);
					Trash_2($$renderer, { class: "size-3" });
					$$renderer.push(`<!----></button></li>`);
				}
				$$renderer.push(`<!--]--></ul>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div class="flex flex-wrap gap-1.5"><!--[-->`);
			const each_array_7 = ensure_array_like([
				"top",
				"bottom",
				"_top",
				"_bottom",
				"ogonek"
			]);
			for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
				let suggested = each_array_7[$$index_7];
				if (!glyph().anchors?.some((a) => a.name === suggested)) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<button type="button" class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-warn hover:bg-warn/10 hover:text-warn">+ ${escape_html(suggested)}</button>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div></div> `);
			ReferenceImagePanel($$renderer, {});
			$$renderer.push(`<!----> `);
			if (glyph().contours.length === 0) {
				$$renderer.push("<!--[0-->");
				Accordion($$renderer, {
					id: "edit-templates",
					label: "Templates",
					defaultOpen: false,
					children: ($$renderer) => {
						$$renderer.push(`<p class="mb-2 text-[11px] text-fg-subtle">Start from a basic shape and refine in edit mode (A).</p> <div class="grid grid-cols-2 gap-1.5"><button type="button" class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft">Rectangle</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft">Circle</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft">Vertical stem</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft">Horizontal bar</button></div>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (glyph().contours.length === 0 && drawnSources().length > 0) {
				$$renderer.push("<!--[0-->");
				Accordion($$renderer, {
					id: "edit-derive",
					label: "Derive from another glyph",
					defaultOpen: false,
					children: ($$renderer) => {
						$$renderer.push(`<p class="mb-2 text-[11px] text-fg-subtle">One-shot generate this glyph from one you've already drawn. Good for <code class="font-mono">b/d</code>, <code class="font-mono">p/q</code>, <code class="font-mono">n/u</code>.</p> <div class="grid grid-cols-2 gap-1.5">`);
						$$renderer.select({
							value: deriveSourceCp,
							class: "rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
						}, ($$renderer) => {
							$$renderer.option({
								value: null,
								disabled: true
							}, ($$renderer) => {
								$$renderer.push(`Source glyph`);
							});
							$$renderer.push(`<!--[-->`);
							const each_array_8 = ensure_array_like(drawnSources());
							for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
								let g = each_array_8[$$index_8];
								$$renderer.option({ value: g.codepoint }, ($$renderer) => {
									$$renderer.push(`${escape_html(g.name)}`);
								});
							}
							$$renderer.push(`<!--]-->`);
						});
						$$renderer.push(` `);
						$$renderer.select({
							value: deriveTransform,
							class: "rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
						}, ($$renderer) => {
							$$renderer.option({ value: "copy" }, ($$renderer) => {
								$$renderer.push(`Copy as-is`);
							});
							$$renderer.option({ value: "flipH" }, ($$renderer) => {
								$$renderer.push(`Flip horizontal`);
							});
							$$renderer.option({ value: "flipV" }, ($$renderer) => {
								$$renderer.push(`Flip vertical`);
							});
							$$renderer.option({ value: "rotate180" }, ($$renderer) => {
								$$renderer.push(`Rotate 180°`);
							});
						});
						$$renderer.push(`</div> <button type="button"${attr("disabled", deriveSourceCp == null, true)} class="mt-2 w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40">Generate</button>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			CompositeEditor($$renderer, {});
			$$renderer.push(`<!----> `);
			MetricsInspector($$renderer, {});
			$$renderer.push(`<!----> `);
			RevisionsPanel($$renderer, {});
			$$renderer.push(`<!----> `);
			StemsPanel($$renderer, {});
			$$renderer.push(`<!----> `);
			if (usedByGlyphs().length > 0) {
				$$renderer.push("<!--[0-->");
				{
					function badge($$renderer) {
						$$renderer.push(`<span class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent" data-numeric="">${escape_html(usedByGlyphs().length)}</span>`);
					}
					Accordion($$renderer, {
						id: "edit-usedby",
						label: "Used by",
						defaultOpen: true,
						badge,
						children: ($$renderer) => {
							$$renderer.push(`<p class="mb-2 text-[11px] text-fg-subtle">These composite glyphs reference this glyph. Edits here propagate.</p> <div class="flex flex-wrap gap-1"><!--[-->`);
							const each_array_9 = ensure_array_like(usedByGlyphs());
							for (let $$index_9 = 0, $$length = each_array_9.length; $$index_9 < $$length; $$index_9++) {
								let g = each_array_9[$$index_9];
								$$renderer.push(`<button type="button" class="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent"${attr("title", g.name)}>${escape_html(g.codepoint > 32 && g.codepoint < 65536 ? String.fromCodePoint(g.codepoint) : g.name)}</button>`);
							}
							$$renderer.push(`<!--]--></div>`);
						},
						$$slots: {
							badge: true,
							default: true
						}
					});
				}
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			Accordion($$renderer, {
				id: "edit-notes",
				label: "Notes",
				defaultOpen: false,
				children: ($$renderer) => {
					$$renderer.push(`<textarea placeholder="Design intent, todos, references…" rows="3" class="block w-full resize-y rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent focus:bg-surface">`);
					const $$body = escape_html(glyph().notes ?? "");
					if ($$body) $$renderer.push(`${$$body}`);
					$$renderer.push(`</textarea>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Accordion($$renderer, {
				id: "edit-pathops",
				label: "Path operations",
				defaultOpen: false,
				children: ($$renderer) => {
					$$renderer.push(`<button type="button"${attr("disabled", glyph().contours.length === 0 || autoCleaning, true)} class="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-accent bg-accent text-accent-fg px-2 py-1.5 text-[11px] font-medium hover:bg-accent/90 disabled:opacity-40" title="Simplify + snap to 10u grid in one step">`);
					Wand_sparkles($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> ${escape_html("Auto-clean glyph")}</button> <div class="mb-2 grid grid-cols-2 gap-1.5"><button type="button"${attr("disabled", glyph().contours.length < 2, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Merge all contours into a single silhouette">Union</button> <button type="button"${attr("disabled", glyph().contours.length < 2, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Keep only the area common to all contours">Intersect</button> <button type="button"${attr("disabled", glyph().contours.length < 2, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Subtract every contour after the first from the first">Subtract</button> <button type="button"${attr("disabled", glyph().contours.length < 2, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Keep regions that belong to an odd number of contours">Xor</button></div> <button type="button"${attr("disabled", glyph().contours.length === 0 || simplifying, true)} class="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Reduce noise: re-sample, Douglas-Peucker, then refit bezier curves">${escape_html("Simplify outline")}</button> <div class="mt-1.5 grid grid-cols-2 gap-1.5"><button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Round every point to the nearest 10 font units (cleanup)">Snap 10u</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Flip every contour's winding direction">Reverse winding</button></div> <h3 class="mb-2 mt-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Transform</h3> <div class="grid grid-cols-2 gap-1.5"><button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40">Flip H</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40">Flip V</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40">Scale +5%</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40">Scale −5%</button> <button type="button"${attr("disabled", glyph().leftSidebearing === glyph().rightSidebearing, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Set LSB = RSB = average — useful for symmetric round glyphs (o, O, e)">Symmetric LSB/RSB</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Shift contours so the bbox centre matches advance/2">Center in advance</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Shift contours so the bbox bottom sits on baseline">Sit on baseline</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Shift contours so the bbox top hits cap-height">Top to cap</button> <button type="button"${attr("disabled", glyph().contours.length === 0, true)} class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40" title="Shift contours so the bbox top hits x-height">Top to x-height</button></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Accordion($$renderer, {
				id: "edit-live-preview",
				label: "Live preview",
				defaultOpen: true,
				children: ($$renderer) => {
					if (glyph().contours.length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="rounded-md border border-border bg-canvas p-4 text-center text-6xl preview-font leading-none">${escape_html(charLabel() === "space" ? "·" : charLabel())}</div>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div class="rounded-md border border-dashed border-border bg-canvas p-4 text-center text-6xl leading-none text-fg-subtle/60" style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;" title="Draw contours to see the live preview">${escape_html(charLabel() === "space" ? "·" : charLabel())}</div>`);
					}
					$$renderer.push(`<!--]--> <div class="mt-2 text-[11px] text-fg-subtle" data-numeric="">${escape_html(previewStore.glyphCount)} glyphs · ${escape_html(previewStore.sizeKb.toFixed(1))} KB · ${escape_html(previewStore.lastBuildMs.toFixed(0))} ms</div> `);
					if (previewStore.error) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="mt-2 rounded bg-danger/10 p-2 text-[11px] text-danger">${escape_html(previewStore.error)}</div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			if (projectStore.project) {
				$$renderer.push("<!--[0-->");
				const issues = sortBySeverity(auditGlyph(glyph(), projectStore.project));
				{
					function badge($$renderer) {
						if (issues.length > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<span${attr_class(`rounded px-1.5 py-0.5 font-mono text-[10px] ${stringify(issues[0].severity === "error" ? "bg-danger/15 text-danger" : issues[0].severity === "warn" ? "bg-warn/15 text-warn" : "bg-surface-2 text-fg-muted")}`)} data-numeric="">${escape_html(issues.length)}</span>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<span class="rounded bg-success/15 px-1.5 py-0.5 font-mono text-[10px] text-success">ok</span>`);
						}
						$$renderer.push(`<!--]-->`);
					}
					Accordion($$renderer, {
						id: "edit-audit",
						label: "Audit",
						defaultOpen: issues.length > 0,
						badge,
						children: ($$renderer) => {
							if (issues.length === 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-2 text-[12px] text-success">`);
								Circle_check($$renderer, { class: "size-3.5" });
								$$renderer.push(`<!----> No issues</div>`);
							} else {
								$$renderer.push("<!--[-1-->");
								$$renderer.push(`<ul class="grid gap-1"><!--[-->`);
								const each_array_10 = ensure_array_like(issues);
								for (let $$index_10 = 0, $$length = each_array_10.length; $$index_10 < $$length; $$index_10++) {
									let issue = each_array_10[$$index_10];
									$$renderer.push(`<li${attr_class(`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${stringify(issue.severity === "error" ? "bg-danger/10 text-danger" : issue.severity === "warn" ? "bg-warn/10 text-warn" : "bg-surface-2 text-fg-muted")}`)}>`);
									Circle_alert($$renderer, { class: "mt-0.5 size-3 shrink-0" });
									$$renderer.push(`<!----> <span>${escape_html(issue.message)}</span></li>`);
								}
								$$renderer.push(`<!--]--></ul>`);
							}
							$$renderer.push(`<!--]-->`);
						},
						$$slots: {
							badge: true,
							default: true
						}
					});
				}
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			Accordion($$renderer, {
				id: "edit-brush",
				label: "Brush & trace",
				defaultOpen: false,
				children: ($$renderer) => {
					$$renderer.push(`<div class="grid gap-3"><label class="grid gap-1.5"><span class="flex items-center justify-between text-[11px] text-fg-muted"><span>Thinning (pressure)</span> <span data-numeric="">${escape_html(strokeThinning.toFixed(2))}</span></span> <input type="range"${attr("min", 0)}${attr("max", 1)}${attr("step", .05)}${attr("value", strokeThinning)} class="h-1 accent-fg"/></label> <label class="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2"><div class="grid leading-tight"><span class="text-[11px] font-medium text-fg">Cubic curves</span> <span class="text-[10px] text-fg-subtle">Schneider fit for smooth outlines</span></div> <input type="checkbox"${attr("checked", cubicTrace, true)} class="size-4 accent-fg"/></label> `);
					if (cubicTrace) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<label class="grid gap-1.5"><span class="flex items-center justify-between text-[11px] text-fg-muted"><span>Curve precision</span> <span data-numeric="">${escape_html(cubicMaxError)}</span></span> <input type="range"${attr("min", 10)}${attr("max", 300)}${attr("step", 5)}${attr("value", cubicMaxError)} class="h-1 accent-fg"/></label>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<label class="grid gap-1.5"><span class="flex items-center justify-between text-[11px] text-fg-muted"><span>Smoothness (Chaikin)</span> <span data-numeric="">${escape_html(smoothness)}</span></span> <input type="range"${attr("min", 0)}${attr("max", 3)}${attr("step", 1)}${attr("value", smoothness)} class="h-1 accent-fg"/></label>`);
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> <div class="mt-auto p-4 text-[11px] text-fg-subtle"><p class="mb-1 font-medium">Shortcuts</p> <ul class="grid gap-0.5" data-numeric=""><li>[ ]<span class="ml-2 text-fg-muted">prev/next glyph</span></li> <li>P E A<span class="ml-2 text-fg-muted">pencil / eraser / edit points</span></li> <li>S V G R O<span class="ml-2 text-fg-muted">sketch / vector / grid / ref / onion</span></li> <li>T<span class="ml-2 text-fg-muted">trace to vector</span></li> <li>Shift-click<span class="ml-2 text-fg-muted">add to selection</span></li> <li>Drag empty<span class="ml-2 text-fg-muted">marquee select</span></li> <li>Arrows<span class="ml-2 text-fg-muted">nudge selected (Shift = ×10)</span></li> <li>Del<span class="ml-2 text-fg-muted">delete selected points</span></li> <li>Space-drag<span class="ml-2 text-fg-muted">pan</span></li> <li>Wheel<span class="ml-2 text-fg-muted">zoom</span></li> <li>⌘0<span class="ml-2 text-fg-muted">fit to glyph</span></li> <li>⌘Z / ⌘⇧Z<span class="ml-2 text-fg-muted">undo / redo</span></li> <li>⌘⇧C / ⌘⇧V<span class="ml-2 text-fg-muted">copy / paste glyph</span></li></ul></div></aside></div> `);
			EditorTour($$renderer, {
				open: tourOpen,
				onclose: () => tourOpen = false
			});
			$$renderer.push(`<!---->`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
