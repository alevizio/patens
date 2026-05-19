import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import {
	buildUfoFiles,
	dictToPlistXml,
	glifFilename,
	projectToUfoZipNative
} from './ufo';
import type { Glyph, Project, BezierContour, PathCommand } from './types';
import { DEFAULT_METRICS } from './types';

// --- fixtures ---

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph =>
	({
		codepoint: 0x0041,
		name: 'A',
		status: 'final',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [],
		updatedAt: new Date('2026-01-01').toISOString(),
		...overrides
	}) as Glyph;

const closedSquare = (size = 500): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x: 0, y: 0 },
		{ type: 'L', x: size, y: 0 },
		{ type: 'L', x: size, y: size },
		{ type: 'L', x: 0, y: size },
		{ type: 'Z' }
	] as PathCommand[]
});

const project = (overrides: Partial<Project> = {}): Project =>
	({
		id: 't',
		name: 't',
		metadata: {
			familyName: 'TestFamily',
			styleName: 'Regular',
			version: '1.000',
			designer: 'A. Designer',
			copyright: '© 2026',
			license: 'OFL 1.1'
		},
		metrics: DEFAULT_METRICS,
		glyphs: {},
		kerning: [],
		classes: [],
		masters: [],
		axes: [],
		instances: [],
		features: { kern: true, liga: false },
		brief: {},
		samples: {},
		changelog: [],
		decisions: [],
		updatedAt: '2026-01-01',
		createdAt: '2026-01-01',
		...overrides
	}) as Project;

// --- dictToPlistXml ---

describe('dictToPlistXml', () => {
	it('emits a valid plist preamble + DOCTYPE', () => {
		const xml = dictToPlistXml({ k: 'v' });
		expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
		expect(xml).toContain('<!DOCTYPE plist');
		expect(xml).toContain('<plist version="1.0">');
		expect(xml).toContain('</plist>');
	});

	it('emits integers and reals correctly', () => {
		const xml = dictToPlistXml({ whole: 42, fractional: 1.5 });
		expect(xml).toContain('<integer>42</integer>');
		expect(xml).toContain('<real>1.5</real>');
	});

	it('emits booleans as <true/> / <false/>', () => {
		const xml = dictToPlistXml({ on: true, off: false });
		expect(xml).toContain('<true/>');
		expect(xml).toContain('<false/>');
	});

	it('escapes XML metacharacters in strings', () => {
		const xml = dictToPlistXml({ msg: 'a < b & c > d "quoted"' });
		expect(xml).toContain('a &lt; b &amp; c &gt; d &quot;quoted&quot;');
	});

	it('handles nested dicts (kerning shape: name → {name → value})', () => {
		const xml = dictToPlistXml({ A: { V: -60 } });
		expect(xml).toMatch(/<dict>[\s\S]*<key>A<\/key>[\s\S]*<dict>[\s\S]*<key>V<\/key>[\s\S]*<integer>-60<\/integer>/);
	});
});

// --- glifFilename ---

describe('glifFilename', () => {
	it('appends _ to uppercase letters', () => {
		expect(glifFilename('A')).toBe('A_.glif');
		expect(glifFilename('Z')).toBe('Z_.glif');
	});

	it('preserves lowercase letters and digits', () => {
		expect(glifFilename('a')).toBe('a.glif');
		expect(glifFilename('zero')).toBe('zero.glif');
	});

	it('replaces other characters with _', () => {
		expect(glifFilename('a.bc')).toBe('a_bc.glif');
		expect(glifFilename('a/b')).toBe('a_b.glif');
	});

	it('handles mixed casing (PostScript-style suffix names)', () => {
		expect(glifFilename('Aacute')).toBe('A_acute.glif');
	});
});

// --- buildUfoFiles ---

describe('buildUfoFiles', () => {
	it('places everything under <safeFamily>.ufo/', () => {
		const files = buildUfoFiles(project(), 'Test Family!');
		const paths = Object.keys(files);
		// "Test Family!" → "Test-Family"
		expect(paths.every((p) => p.startsWith('Test-Family.ufo/'))).toBe(true);
	});

	it('always emits metainfo + fontinfo + contents.plist', () => {
		const files = buildUfoFiles(project(), 'Test');
		expect(files).toHaveProperty('Test.ufo/metainfo.plist');
		expect(files).toHaveProperty('Test.ufo/fontinfo.plist');
		expect(files).toHaveProperty('Test.ufo/glyphs/contents.plist');
	});

	it('writes UFO format version 3 in metainfo', () => {
		const files = buildUfoFiles(project(), 'Test');
		const xml = strFromU8(files['Test.ufo/metainfo.plist']);
		expect(xml).toContain('<integer>3</integer>');
		expect(xml).toContain('org.fontstudio.app');
	});

	it('emits fontinfo with metrics + metadata', () => {
		const p = project();
		p.metrics = { ...p.metrics, unitsPerEm: 1024, capHeight: 712 };
		const files = buildUfoFiles(p, 'Test');
		const xml = strFromU8(files['Test.ufo/fontinfo.plist']);
		expect(xml).toContain('<integer>1024</integer>');
		expect(xml).toContain('<integer>712</integer>');
		expect(xml).toContain('A. Designer');
	});

	it('emits a .glif file per drawn glyph + a contents.plist mapping', () => {
		const p = project({
			glyphs: {
				0x41: baseGlyph({ codepoint: 0x41, name: 'A', contours: [closedSquare(500)] })
			}
		});
		const files = buildUfoFiles(p, 'Test');
		expect(files).toHaveProperty('Test.ufo/glyphs/A_.glif');
		const contents = strFromU8(files['Test.ufo/glyphs/contents.plist']);
		expect(contents).toContain('<key>A</key>');
		expect(contents).toContain('<string>A_.glif</string>');
	});

	it("writes the glyph's unicode + advance + outline points to its .glif", () => {
		const p = project({
			glyphs: {
				0x41: baseGlyph({
					codepoint: 0x41,
					name: 'A',
					advanceWidth: 540,
					contours: [closedSquare(500)]
				})
			}
		});
		const files = buildUfoFiles(p, 'Test');
		const glif = strFromU8(files['Test.ufo/glyphs/A_.glif']);
		expect(glif).toContain('<unicode hex="0041"/>');
		expect(glif).toContain('<advance width="540"/>');
		expect(glif).toContain('<contour>');
		expect(glif).toContain('type="line"'); // square uses L commands
	});

	it('emits curve points for C commands', () => {
		const curveGlyph: BezierContour = {
			closed: true,
			winding: 'ccw',
			commands: [
				{ type: 'M', x: 0, y: 0 },
				{ type: 'C', x1: 30, y1: 0, x2: 70, y2: 100, x: 100, y: 100 },
				{ type: 'Z' }
			] as PathCommand[]
		};
		const p = project({
			glyphs: { 0x41: baseGlyph({ contours: [curveGlyph] }) }
		});
		const files = buildUfoFiles(p, 'Test');
		const glif = strFromU8(files['Test.ufo/glyphs/A_.glif']);
		expect(glif).toContain('type="curve"');
		// Two off-curve handles before the curve point
		const offCurveMatches = glif.match(/<point x="\d+" y="\d+"\/>/g);
		expect(offCurveMatches?.length ?? 0).toBeGreaterThanOrEqual(2);
	});

	it('emits components from composite glyphs', () => {
		const p = project({
			glyphs: {
				0x41: baseGlyph({ codepoint: 0x41, name: 'A', contours: [closedSquare(500)] }),
				0xc1: baseGlyph({
					codepoint: 0xc1,
					name: 'Aacute',
					contours: [],
					components: [{ baseCodepoint: 0x41, offsetX: 0, offsetY: 0 }]
				}) as Glyph
			}
		});
		const files = buildUfoFiles(p, 'Test');
		const glif = strFromU8(files['Test.ufo/glyphs/A_acute.glif']);
		expect(glif).toContain('<component base="A"');
	});

	it('omits kerning.plist when no pairs exist', () => {
		const files = buildUfoFiles(project(), 'Test');
		expect(files).not.toHaveProperty('Test.ufo/kerning.plist');
	});

	it('emits a kerning.plist nested-dict for flat pairs', () => {
		const p = project({
			glyphs: {
				0x41: baseGlyph({ codepoint: 0x41, name: 'A' }),
				0x56: baseGlyph({ codepoint: 0x56, name: 'V' })
			},
			kerning: [{ left: 0x41, right: 0x56, value: -60 }]
		});
		const files = buildUfoFiles(p, 'Test');
		expect(files).toHaveProperty('Test.ufo/kerning.plist');
		const xml = strFromU8(files['Test.ufo/kerning.plist']);
		expect(xml).toContain('<key>A</key>');
		expect(xml).toContain('<key>V</key>');
		expect(xml).toContain('<integer>-60</integer>');
	});

	it('skips class-based kerning pairs (flat-only writer)', () => {
		const p = project({
			glyphs: {
				0x41: baseGlyph({ codepoint: 0x41, name: 'A' }),
				0x56: baseGlyph({ codepoint: 0x56, name: 'V' })
			},
			kerning: [
				{ left: 0x41, right: 0x56, value: -60 },
				{ left: '@A_left', right: '@V_right', value: -80 }
			]
		});
		const files = buildUfoFiles(p, 'Test');
		const xml = strFromU8(files['Test.ufo/kerning.plist']);
		expect(xml).toContain('<integer>-60</integer>');
		expect(xml).not.toContain('-80');
	});
});

// --- projectToUfoZipNative ---

describe('projectToUfoZipNative', () => {
	it('returns a valid zip containing the expected UFO files', () => {
		const p = project({
			glyphs: {
				0x41: baseGlyph({ codepoint: 0x41, name: 'A', contours: [closedSquare(500)] })
			}
		});
		const buf = projectToUfoZipNative(p, 'Test');
		expect(buf.byteLength).toBeGreaterThan(0);
		// Unzip and inspect
		const entries = unzipSync(new Uint8Array(buf));
		const paths = Object.keys(entries);
		expect(paths).toContain('Test.ufo/metainfo.plist');
		expect(paths).toContain('Test.ufo/fontinfo.plist');
		expect(paths).toContain('Test.ufo/glyphs/contents.plist');
		expect(paths).toContain('Test.ufo/glyphs/A_.glif');
	});

	it('produces a zip that round-trips through unzipSync without errors', () => {
		const buf = projectToUfoZipNative(project(), 'Test');
		expect(() => unzipSync(new Uint8Array(buf))).not.toThrow();
	});
});
