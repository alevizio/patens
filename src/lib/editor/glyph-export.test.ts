// @vitest-environment happy-dom
//
// glyph-export.ts uses DOM APIs (document.createElement, Blob,
// URL.createObjectURL, HTMLCanvasElement.toBlob, Path2D). Default
// vitest runs in node which doesn't have these — happy-dom is the
// fastest of the DOM emulations and ships everything we need.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	downloadGlyphPng,
	downloadGlyphSvg,
	glyphSvgPathString,
	type FontMetrics
} from './glyph-export';
import type { Glyph, BezierContour } from '$lib/font/types';

// ---- Fixtures ----

const rectContour = (x: number, y: number, w: number, h: number): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x, y },
		{ type: 'L', x: x + w, y },
		{ type: 'L', x: x + w, y: y + h },
		{ type: 'L', x, y: y + h },
		{ type: 'Z' }
	]
});

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph => ({
	codepoint: 0x0041,
	name: 'A',
	status: 'draft',
	advanceWidth: 600,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [rectContour(50, 0, 500, 700)],
	updatedAt: '2026-01-01T00:00:00Z',
	...overrides
});

const metrics: FontMetrics = { ascender: 800, descender: -200 };

// ---- Pure function (no DOM needed) ----

describe('glyphSvgPathString', () => {
	it('returns null for an empty glyph', () => {
		expect(glyphSvgPathString(baseGlyph({ contours: [] }))).toBeNull();
	});

	it('returns a non-empty path d string for a glyph with contours', () => {
		const out = glyphSvgPathString(baseGlyph());
		expect(out).toBeTypeOf('string');
		expect(out!.length).toBeGreaterThan(0);
		expect(out).toMatch(/^M/i);
	});
});

// ---- DOM-touching helpers ----

// Capture the original createElement *once* before any spy can wrap
// it. Each test's beforeEach re-applies a fresh spy over the original;
// afterEach restores. Without this, vi.spyOn(document, 'createElement')
// would re-wrap whichever spy was in place — recursing infinitely on
// `origCreate(tag)` calls inside the mock body.
const origCreateElement = document.createElement.bind(document);

const installDomShims = (
	clickedAnchors: HTMLAnchorElement[],
	opts: { canvasReturnsNull?: boolean } = {}
) => {
	vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
		const el = origCreateElement(tag);
		if (tag === 'a') {
			const a = el as HTMLAnchorElement;
			a.click = () => clickedAnchors.push(a);
		}
		if (tag === 'canvas') {
			const canvas = el as HTMLCanvasElement;
			canvas.getContext = vi.fn(() =>
				opts.canvasReturnsNull
					? null
					: {
							fillStyle: '',
							fillRect: () => {},
							save: () => {},
							translate: () => {},
							scale: () => {},
							fill: () => {},
							restore: () => {}
						}
			) as unknown as HTMLCanvasElement['getContext'];
			canvas.toBlob = (cb: BlobCallback) => {
				cb(new Blob(['png-stub'], { type: 'image/png' }));
			};
		}
		return el;
	});
	vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock');
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
};

describe('downloadGlyphSvg', () => {
	let clickedAnchors: HTMLAnchorElement[];

	beforeEach(() => {
		clickedAnchors = [];
		installDomShims(clickedAnchors);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does nothing when the glyph is empty', () => {
		downloadGlyphSvg(baseGlyph({ contours: [] }), metrics);
		expect(clickedAnchors).toHaveLength(0);
	});

	it('downloads with a safe-filename + .svg extension', () => {
		downloadGlyphSvg(baseGlyph({ name: 'Aacute' }), metrics);
		expect(clickedAnchors).toHaveLength(1);
		expect(clickedAnchors[0].download).toBe('Aacute.svg');
	});

	it('strips unsafe characters from the filename', () => {
		downloadGlyphSvg(baseGlyph({ name: 'foo/bar baz?qux' }), metrics);
		expect(clickedAnchors[0].download).toBe('foo_bar_baz_qux.svg');
	});

	it('falls back to "glyph" when the name is empty', () => {
		downloadGlyphSvg(baseGlyph({ name: '' }), metrics);
		expect(clickedAnchors[0].download).toBe('glyph.svg');
	});

	it('revokes the object URL after click (no leaks)', () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		downloadGlyphSvg(baseGlyph(), metrics);
		expect(revoke).toHaveBeenCalledTimes(1);
	});
});

describe('downloadGlyphPng', () => {
	let clickedAnchors: HTMLAnchorElement[];

	beforeEach(() => {
		clickedAnchors = [];
		// Path2D doesn't exist in happy-dom; stub the constructor.
		vi.stubGlobal(
			'Path2D',
			class {
				constructor(_path?: string) {}
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('resolves to null when the glyph is empty', async () => {
		installDomShims(clickedAnchors);
		expect(await downloadGlyphPng(baseGlyph({ contours: [] }), metrics)).toBeNull();
		expect(clickedAnchors).toHaveLength(0);
	});

	it('resolves to the filename and clicks an anchor', async () => {
		installDomShims(clickedAnchors);
		const name = await downloadGlyphPng(baseGlyph({ name: 'A' }), metrics);
		expect(name).toBe('A.png');
		expect(clickedAnchors).toHaveLength(1);
		expect(clickedAnchors[0].download).toBe('A.png');
	});

	it('resolves to null when getContext returns null (no canvas support)', async () => {
		installDomShims(clickedAnchors, { canvasReturnsNull: true });
		expect(await downloadGlyphPng(baseGlyph(), metrics)).toBeNull();
	});
});
