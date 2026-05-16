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
		toArrayBuffer(): ArrayBuffer;
		download(filename?: string): void;
		getKerningValue(leftGlyph: Glyph, rightGlyph: Glyph): number;
		getPath(text: string, x: number, y: number, fontSize: number): Path;
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
