declare module 'opentype.js' {
	export class Path {
		commands: Array<
			| { type: 'M'; x: number; y: number }
			| { type: 'L'; x: number; y: number }
			| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
			| { type: 'Q'; x1: number; y1: number; x: number; y: number }
			| { type: 'Z' }
		>;
		moveTo(x: number, y: number): void;
		lineTo(x: number, y: number): void;
		curveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
		bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
		quadraticCurveTo(x1: number, y1: number, x: number, y: number): void;
		close(): void;
		draw(ctx: CanvasRenderingContext2D): void;
	}

	export class Glyph {
		constructor(options: {
			name: string;
			unicode?: number;
			unicodes?: number[];
			advanceWidth?: number;
			path?: Path;
		});
		name: string;
		unicode: number;
		unicodes?: number[];
		advanceWidth: number;
		path: Path;
		draw(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number): void;
	}

	export class GlyphSet {
		length: number;
		get(index: number): Glyph;
	}

	export class Font {
		constructor(options: {
			familyName: string;
			styleName: string;
			unitsPerEm: number;
			ascender: number;
			descender: number;
			glyphs: Glyph[];
			designer?: string;
			designerURL?: string;
			manufacturer?: string;
			manufacturerURL?: string;
			license?: string;
			licenseURL?: string;
			version?: string;
			copyright?: string;
		});
		familyName: string;
		styleName: string;
		unitsPerEm: number;
		ascender: number;
		descender: number;
		glyphs: GlyphSet;
		kerningPairs: Record<string, number>;
		// Loose typing for OpenType tables — opentype.js exposes many tables
		// (os2, head, hhea, post, gpos, gsub…) with table-specific shapes. We
		// narrow at the call site via `as { ... }` casts.
		tables: Record<string, unknown>;
		// Per-language name records keyed by name-table entry (e.g. fontFamily,
		// fontSubfamily, fullName, postScriptName, designer, copyright, license).
		names: Record<string, { en?: string } & Record<string, string | undefined>>;
		toArrayBuffer(): ArrayBuffer;
		download(filename?: string): void;
		getKerningValue(leftGlyph: Glyph, rightGlyph: Glyph): number;
		getPath(text: string, x: number, y: number, fontSize: number): Path;
		// Substitution write/read API. Confirmed present in opentype.js v2.x
		// bundle (dist/opentype.js) but absent from the README. Used by the
		// OT-layout-depth milestone-1 work — see docs/next-90-days.md §B.
		// `script` defaults to 'DFLT'; `language` defaults to 'dflt'.
		substitution: {
			addSingle(
				feature: string,
				substitution: { sub: string | string[]; by: string | string[] },
				script?: string,
				language?: string
			): void;
			addAlternate(
				feature: string,
				substitution: { sub: string; by: string[] },
				script?: string,
				language?: string
			): void;
			addMultiple(
				feature: string,
				substitution: { sub: string; by: string[] },
				script?: string,
				language?: string
			): void;
			addLigature(
				feature: string,
				ligature: { sub: string[]; by: string },
				script?: string,
				language?: string
			): void;
			getSingle(
				feature: string,
				script?: string,
				language?: string
			): Array<{ sub: number | number[]; by: number | number[] }>;
			getAlternates(
				feature: string,
				script?: string,
				language?: string
			): Array<{ sub: number; by: number[] }>;
			getLigatures(
				feature: string,
				script?: string,
				language?: string
			): Array<{ sub: number[]; by: number }>;
			getFeature(
				feature: string,
				script?: string,
				language?: string
			): Array<unknown> | undefined;
		};
	}

	export function parse(buffer: ArrayBuffer): Font;
	export function load(url: string, callback: (err: Error | null, font: Font) => void): void;

	const _default: {
		Path: typeof Path;
		Glyph: typeof Glyph;
		Font: typeof Font;
		parse: typeof parse;
		load: typeof load;
	};
	export default _default;
}
