/**
 * Auto-generated `.notdef` glyph (the "tofu box").
 * Every font requires one; users should never have to draw it.
 */

import type { BezierContour, FontMetrics } from './types';

export const buildNotdefContours = (metrics: FontMetrics): BezierContour[] => {
	const top = metrics.capHeight;
	const left = 60;
	const right = 540;
	return [
		{
			closed: true,
			winding: 'ccw',
			commands: [
				{ type: 'M', x: left, y: 0 },
				{ type: 'L', x: left, y: top },
				{ type: 'L', x: right, y: top },
				{ type: 'L', x: right, y: 0 },
				{ type: 'Z' }
			]
		},
		{
			closed: true,
			winding: 'cw',
			commands: [
				{ type: 'M', x: left + 80, y: 60 },
				{ type: 'L', x: right - 80, y: 60 },
				{ type: 'L', x: right - 80, y: top - 60 },
				{ type: 'L', x: left + 80, y: top - 60 },
				{ type: 'Z' }
			]
		}
	];
};

export const NOTDEF_ADVANCE_WIDTH = 600;
