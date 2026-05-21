/**
 * SVG `d` attribute parser → BezierContour[]. The primitive day-10
 * needs before the Twemoji round-trip test can run, and a general-
 * purpose utility for any future "import SVG outlines" feature
 * (paste-from-Figma, drop-an-SVG, etc.).
 *
 * Supports: M L H V C S Q T Z (the 95% of real SVG paths). Arc
 * commands (A/a) throw — adding them is a separate ~100 LOC of
 * endpoint-to-center conversion + cubic approximation; defer until
 * we see an arc in the wild.
 *
 * Y-axis flip is the caller's responsibility (different SVGs use
 * different conventions for what y=0 means). Pass a `transformY`
 * function to remap; default is identity. Twemoji is rendered at
 * y-down with baseline ~75% of the icon height — that mapping lives
 * outside this parser.
 *
 * Pure TS, no DOM. Sub-millisecond on icon-sized paths.
 */

import type { BezierContour, PathCommand } from './types';

export type ParseSvgPathOptions = {
	/**
	 * Per-point transform applied to (x, y) coordinates after parsing.
	 * Default is identity. Use this to:
	 *  - flip y (SVG y-down → font y-up) via `(x, y) => [x, -y]`
	 *  - scale + translate into font UPM space
	 *  - apply an arbitrary affine
	 */
	transformPoint?: (x: number, y: number) => [number, number];
	/**
	 * When true, contours are automatically marked `closed` even if
	 * the SVG omits the `Z` command. Default false — preserves the
	 * source's explicit closedness.
	 */
	forceClose?: boolean;
};

// Number scanner — handles signed floats, exponent notation, and the
// shorthand `.5` and `1.` forms SVG paths allow.
const NUMBER_RE = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

const tokenize = (d: string): Array<string | number> => {
	const tokens: Array<string | number> = [];
	let i = 0;
	while (i < d.length) {
		const ch = d[i];
		if (ch === ' ' || ch === ',' || ch === '\t' || ch === '\n' || ch === '\r') {
			i++;
			continue;
		}
		if (/[MmLlHhVvCcSsQqTtZzAa]/.test(ch)) {
			tokens.push(ch);
			i++;
			continue;
		}
		// Number — scan with the global regex by sliding `lastIndex`.
		NUMBER_RE.lastIndex = i;
		const m = NUMBER_RE.exec(d);
		if (!m || m.index !== i) {
			throw new Error(`parseSvgPath: unexpected character at index ${i}: "${ch}"`);
		}
		tokens.push(parseFloat(m[0]));
		i = NUMBER_RE.lastIndex;
	}
	return tokens;
};

const expectNumber = (tokens: Array<string | number>, cursor: number, cmd: string): number => {
	const v = tokens[cursor];
	if (typeof v !== 'number') {
		throw new Error(
			`parseSvgPath: command '${cmd}' expected a number at token ${cursor}, got ${typeof v === 'string' ? `'${v}'` : v}`
		);
	}
	return v;
};

/** Parse an SVG path's `d` attribute into one or more BezierContours. */
export const parseSvgPath = (d: string, opts: ParseSvgPathOptions = {}): BezierContour[] => {
	const transformPoint = opts.transformPoint ?? ((x, y) => [x, y] as [number, number]);
	const tokens = tokenize(d);
	const contours: BezierContour[] = [];
	let currentCmds: PathCommand[] = [];
	let cursor = 0;
	let cx = 0; // current point (post-transform)
	let cy = 0;
	let startX = 0; // sub-path start for `Z`
	let startY = 0;
	let rawCx = 0; // pre-transform current point (needed for relative cmds + reflection)
	let rawCy = 0;
	let rawStartX = 0;
	let rawStartY = 0;
	let lastCmd: string | null = null;
	let lastCubicCtrl: [number, number] | null = null; // raw (pre-transform) for `S`
	let lastQuadCtrl: [number, number] | null = null; // raw for `T`

	const finalizeContour = () => {
		if (currentCmds.length === 0) return;
		const last = currentCmds[currentCmds.length - 1];
		const closed = last.type === 'Z' || opts.forceClose === true;
		if (opts.forceClose && last.type !== 'Z') {
			currentCmds.push({ type: 'Z' });
		}
		contours.push({
			closed,
			winding: 'cw', // winding direction is the caller's call; default
			commands: currentCmds
		});
		currentCmds = [];
	};

	const emitMove = (rawX: number, rawY: number) => {
		const [x, y] = transformPoint(rawX, rawY);
		currentCmds.push({ type: 'M', x, y });
		cx = x;
		cy = y;
		startX = x;
		startY = y;
		rawCx = rawX;
		rawCy = rawY;
		rawStartX = rawX;
		rawStartY = rawY;
	};

	const emitLine = (rawX: number, rawY: number) => {
		const [x, y] = transformPoint(rawX, rawY);
		currentCmds.push({ type: 'L', x, y });
		cx = x;
		cy = y;
		rawCx = rawX;
		rawCy = rawY;
	};

	const emitCubic = (
		rawX1: number,
		rawY1: number,
		rawX2: number,
		rawY2: number,
		rawX: number,
		rawY: number
	) => {
		const [x1, y1] = transformPoint(rawX1, rawY1);
		const [x2, y2] = transformPoint(rawX2, rawY2);
		const [x, y] = transformPoint(rawX, rawY);
		currentCmds.push({ type: 'C', x1, y1, x2, y2, x, y });
		cx = x;
		cy = y;
		rawCx = rawX;
		rawCy = rawY;
		lastCubicCtrl = [rawX2, rawY2];
		lastQuadCtrl = null;
	};

	const emitQuad = (rawX1: number, rawY1: number, rawX: number, rawY: number) => {
		const [x1, y1] = transformPoint(rawX1, rawY1);
		const [x, y] = transformPoint(rawX, rawY);
		currentCmds.push({ type: 'Q', x1, y1, x, y });
		cx = x;
		cy = y;
		rawCx = rawX;
		rawCy = rawY;
		lastQuadCtrl = [rawX1, rawY1];
		lastCubicCtrl = null;
	};

	while (cursor < tokens.length) {
		const tok = tokens[cursor];
		let cmd: string;
		if (typeof tok === 'string') {
			cmd = tok;
			cursor++;
		} else if (lastCmd) {
			// Repeat last command implicitly (SVG spec: subsequent number
			// blocks after a command implicitly repeat it). `M`/`m`
			// after the first point implicitly becomes `L`/`l`.
			cmd = lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd;
		} else {
			throw new Error(`parseSvgPath: unexpected number before any command at token ${cursor}`);
		}
		lastCmd = cmd;
		const relative = cmd === cmd.toLowerCase();
		const upper = cmd.toUpperCase();

		switch (upper) {
			case 'M': {
				if (currentCmds.length > 0) finalizeContour();
				let x = expectNumber(tokens, cursor++, cmd);
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) {
					x += rawCx;
					y += rawCy;
				}
				emitMove(x, y);
				lastCubicCtrl = null;
				lastQuadCtrl = null;
				break;
			}
			case 'L': {
				let x = expectNumber(tokens, cursor++, cmd);
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) {
					x += rawCx;
					y += rawCy;
				}
				emitLine(x, y);
				lastCubicCtrl = null;
				lastQuadCtrl = null;
				break;
			}
			case 'H': {
				let x = expectNumber(tokens, cursor++, cmd);
				if (relative) x += rawCx;
				emitLine(x, rawCy);
				lastCubicCtrl = null;
				lastQuadCtrl = null;
				break;
			}
			case 'V': {
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) y += rawCy;
				emitLine(rawCx, y);
				lastCubicCtrl = null;
				lastQuadCtrl = null;
				break;
			}
			case 'C': {
				let x1 = expectNumber(tokens, cursor++, cmd);
				let y1 = expectNumber(tokens, cursor++, cmd);
				let x2 = expectNumber(tokens, cursor++, cmd);
				let y2 = expectNumber(tokens, cursor++, cmd);
				let x = expectNumber(tokens, cursor++, cmd);
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) {
					x1 += rawCx;
					y1 += rawCy;
					x2 += rawCx;
					y2 += rawCy;
					x += rawCx;
					y += rawCy;
				}
				emitCubic(x1, y1, x2, y2, x, y);
				break;
			}
			case 'S': {
				let x2 = expectNumber(tokens, cursor++, cmd);
				let y2 = expectNumber(tokens, cursor++, cmd);
				let x = expectNumber(tokens, cursor++, cmd);
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) {
					x2 += rawCx;
					y2 += rawCy;
					x += rawCx;
					y += rawCy;
				}
				// First control point is the reflection of the previous
				// cubic's last control point. Falls back to current point
				// when previous command wasn't a cubic.
				const x1 = lastCubicCtrl ? 2 * rawCx - lastCubicCtrl[0] : rawCx;
				const y1 = lastCubicCtrl ? 2 * rawCy - lastCubicCtrl[1] : rawCy;
				emitCubic(x1, y1, x2, y2, x, y);
				break;
			}
			case 'Q': {
				let x1 = expectNumber(tokens, cursor++, cmd);
				let y1 = expectNumber(tokens, cursor++, cmd);
				let x = expectNumber(tokens, cursor++, cmd);
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) {
					x1 += rawCx;
					y1 += rawCy;
					x += rawCx;
					y += rawCy;
				}
				emitQuad(x1, y1, x, y);
				break;
			}
			case 'T': {
				let x = expectNumber(tokens, cursor++, cmd);
				let y = expectNumber(tokens, cursor++, cmd);
				if (relative) {
					x += rawCx;
					y += rawCy;
				}
				const x1 = lastQuadCtrl ? 2 * rawCx - lastQuadCtrl[0] : rawCx;
				const y1 = lastQuadCtrl ? 2 * rawCy - lastQuadCtrl[1] : rawCy;
				emitQuad(x1, y1, x, y);
				break;
			}
			case 'Z': {
				currentCmds.push({ type: 'Z' });
				cx = startX;
				cy = startY;
				rawCx = rawStartX;
				rawCy = rawStartY;
				lastCubicCtrl = null;
				lastQuadCtrl = null;
				break;
			}
			case 'A': {
				throw new Error(
					'parseSvgPath: arc command (A/a) is not yet supported. Pre-flatten arcs to cubics before importing.'
				);
			}
			default:
				throw new Error(`parseSvgPath: unknown command '${cmd}'`);
		}
	}

	finalizeContour();
	return contours;
};

/**
 * Convenience: build a `transformPoint` that maps SVG-y-down coords
 * into Font Studio y-up font units. Given the source SVG viewBox
 * (height) and the destination font ascender/descender, produces an
 * affine that:
 *   - flips y around the SVG midline
 *   - scales to fill the ascender → descender range
 *   - centers vertically on the baseline
 */
export const svgToFontTransform = (
	svgHeight: number,
	fontAscender: number,
	fontDescender: number,
	options: { svgBaselineY?: number } = {}
): ((x: number, y: number) => [number, number]) => {
	const baselineY = options.svgBaselineY ?? svgHeight * 0.75;
	const fontHeight = fontAscender - fontDescender;
	const scale = fontHeight / svgHeight;
	return (x, y) => {
		// Flip y and translate so SVG baseline lands at font baseline (0).
		const fx = x * scale;
		const fy = (baselineY - y) * scale;
		return [fx, fy];
	};
};
