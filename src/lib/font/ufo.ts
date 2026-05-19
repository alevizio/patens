/**
 * UFO 3 export — pure JS, no Pyodide. Replaces python.ts's projectToUfoZip
 * for the export path. Produces an Apple-XML-plist UFO directory inside a
 * zip, compatible with FontLab / Glyphs / RoboFont consumers.
 *
 * Spec reference: https://unifiedfontobject.org/versions/ufo3/
 *
 * Scope:
 *   - metainfo.plist (creator + formatVersion)
 *   - fontinfo.plist (family / style / metrics / OpenType name fields)
 *   - glyphs/contents.plist (name → filename map)
 *   - glyphs/<name>.glif (per-glyph outline + advance + unicode)
 *   - kerning.plist (flat pairs only; class-based kerning omitted —
 *     equivalent to the existing Pyodide writer)
 *
 * The Pyodide reverse path (UFO → project, ufoZipToProject) is left in
 * python.ts — UFO consumption involves parsing arbitrary .glif files from
 * other tools, which has more edge cases than emitting our own clean output.
 */

import { zipSync, strToU8 } from 'fflate';
import type { Project, PathCommand } from './types';

// --- XML escape helpers ---

const escapeXml = (s: string): string =>
	s.replace(/[&<>"']/g, (c) => {
		switch (c) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			default:
				return '&apos;';
		}
	});

// --- plist serialization ---

export type PlistValue =
	| string
	| number
	| boolean
	| PlistValue[]
	| { [k: string]: PlistValue };

const plistValueToXml = (value: PlistValue, indent: string): string => {
	if (typeof value === 'string') return `${indent}<string>${escapeXml(value)}</string>`;
	if (typeof value === 'boolean') return `${indent}<${value ? 'true' : 'false'}/>`;
	if (typeof value === 'number') {
		// Integers when whole; reals otherwise. UFO consumers expect this.
		if (Number.isInteger(value)) return `${indent}<integer>${value}</integer>`;
		return `${indent}<real>${value}</real>`;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) return `${indent}<array/>`;
		const inner = value.map((v) => plistValueToXml(v, indent + '\t')).join('\n');
		return `${indent}<array>\n${inner}\n${indent}</array>`;
	}
	// object → dict
	const entries = Object.entries(value);
	if (entries.length === 0) return `${indent}<dict/>`;
	const inner = entries
		.map(
			([k, v]) =>
				`${indent}\t<key>${escapeXml(k)}</key>\n${plistValueToXml(v, indent + '\t')}`
		)
		.join('\n');
	return `${indent}<dict>\n${inner}\n${indent}</dict>`;
};

export const dictToPlistXml = (dict: Record<string, PlistValue>): string => {
	const inner = Object.entries(dict)
		.map(([k, v]) => `\t<key>${escapeXml(k)}</key>\n${plistValueToXml(v, '\t')}`)
		.join('\n');
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">',
		'<dict>',
		inner,
		'</dict>',
		'</plist>',
		''
	].join('\n');
};

// --- .glif file naming (UFO 3 user-name → file-name mangling) ---

/**
 * UFO 3 glyph-name → filename rule (per the spec):
 *   - Uppercase letters become `<letter>_` (so 'A' → 'A_.glif')
 *   - Reserved Windows filenames (CON, PRN, AUX, NUL, COM1-9, LPT1-9) get '_'
 *     appended to disambiguate.
 *   - Disallowed chars become '_'. (We use the same simple variant the
 *     Pyodide writer was using.)
 *
 * The full spec also handles long names + duplicate-collision via a hash
 * suffix; our naming is conservative enough that the simple form suffices.
 */
export const glifFilename = (name: string): string => {
	const out: string[] = [];
	for (const ch of name) {
		if (ch >= 'A' && ch <= 'Z') out.push(ch + '_');
		else if (/[A-Za-z0-9_-]/.test(ch)) out.push(ch);
		else out.push('_');
	}
	return out.join('') + '.glif';
};

// --- per-glyph .glif emission ---

const cmdToGlifPoints = (cmds: PathCommand[]): string[] => {
	const lines: string[] = [];
	for (const c of cmds) {
		switch (c.type) {
			case 'M':
			case 'L':
				lines.push(
					`      <point x="${Math.round(c.x)}" y="${Math.round(c.y)}" type="line"/>`
				);
				break;
			case 'C':
				lines.push(`      <point x="${Math.round(c.x1)}" y="${Math.round(c.y1)}"/>`);
				lines.push(`      <point x="${Math.round(c.x2)}" y="${Math.round(c.y2)}"/>`);
				lines.push(
					`      <point x="${Math.round(c.x)}" y="${Math.round(c.y)}" type="curve"/>`
				);
				break;
			case 'Q':
				lines.push(`      <point x="${Math.round(c.x1)}" y="${Math.round(c.y1)}"/>`);
				lines.push(
					`      <point x="${Math.round(c.x)}" y="${Math.round(c.y)}" type="qcurve"/>`
				);
				break;
			// Z is implicit — UFO contours are always closed.
		}
	}
	return lines;
};

const writeGlif = (
	name: string,
	glyph: Project['glyphs'][number],
	glyphsByCp: Project['glyphs']
): string => {
	const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
	lines.push(`<glyph name="${escapeXml(name)}" format="2">`);
	if (glyph.codepoint && glyph.codepoint > 0) {
		lines.push(
			`  <unicode hex="${glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}"/>`
		);
	}
	lines.push(`  <advance width="${Math.round(glyph.advanceWidth ?? 0)}"/>`);
	const components = glyph.components ?? [];
	const contours = glyph.contours ?? [];
	if (components.length > 0 || contours.length > 0) {
		lines.push('  <outline>');
		for (const comp of components) {
			const base = glyphsByCp[comp.baseCodepoint];
			const baseName =
				base?.name ??
				`uni${comp.baseCodepoint.toString(16).toUpperCase().padStart(4, '0')}`;
			lines.push(
				`    <component base="${escapeXml(baseName)}" xOffset="${Math.round(
					comp.offsetX ?? 0
				)}" yOffset="${Math.round(comp.offsetY ?? 0)}"/>`
			);
		}
		for (const contour of contours) {
			if (contour.commands.length === 0) continue;
			lines.push('    <contour>');
			lines.push(...cmdToGlifPoints(contour.commands));
			lines.push('    </contour>');
		}
		lines.push('  </outline>');
	}
	lines.push('</glyph>');
	lines.push('');
	return lines.join('\n');
};

// --- top-level ---

const safeDirName = (s: string): string => {
	const cleaned = s.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
	return cleaned || 'Untitled';
};

/**
 * Build the UFO 3 file tree as a `{ path: bytes }` map. Separated from the
 * zipping step so tests can assert on individual files without unzipping.
 */
export const buildUfoFiles = (
	project: Project,
	familyName: string
): Record<string, Uint8Array> => {
	const root = `${safeDirName(familyName)}.ufo`;
	const files: Record<string, Uint8Array> = {};

	// metainfo.plist
	files[`${root}/metainfo.plist`] = strToU8(
		dictToPlistXml({
			creator: 'org.fontstudio.app',
			formatVersion: 3
		})
	);

	// fontinfo.plist
	const m = project.metrics;
	const meta = project.metadata;
	files[`${root}/fontinfo.plist`] = strToU8(
		dictToPlistXml({
			familyName: meta.familyName || familyName,
			styleName: meta.styleName || 'Regular',
			versionMajor: 1,
			versionMinor: 0,
			copyright: meta.copyright || '',
			openTypeNameDesigner: meta.designer || '',
			openTypeNameLicense: meta.license || '',
			unitsPerEm: m.unitsPerEm,
			ascender: m.ascender,
			descender: m.descender,
			capHeight: m.capHeight,
			xHeight: m.xHeight
		})
	);

	// glyphs + contents.plist
	const contents: Record<string, PlistValue> = {};
	for (const glyph of Object.values(project.glyphs)) {
		const name =
			glyph.name ||
			`uni${glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
		const fname = glifFilename(name);
		contents[name] = fname;
		files[`${root}/glyphs/${fname}`] = strToU8(
			writeGlif(name, glyph, project.glyphs)
		);
	}
	files[`${root}/glyphs/contents.plist`] = strToU8(dictToPlistXml(contents));

	// kerning.plist (flat pairs only — class kerning omitted, matches the
	// existing Pyodide writer's scope).
	const kerning: Record<string, PlistValue> = {};
	for (const pair of project.kerning ?? []) {
		if (typeof pair.left !== 'number' || typeof pair.right !== 'number') continue;
		const leftGlyph = project.glyphs[pair.left];
		const rightGlyph = project.glyphs[pair.right];
		if (!leftGlyph || !rightGlyph) continue;
		const lName = leftGlyph.name;
		const rName = rightGlyph.name;
		if (!lName || !rName) continue;
		const existing = (kerning[lName] as Record<string, PlistValue> | undefined) ?? {};
		existing[rName] = pair.value;
		kerning[lName] = existing;
	}
	if (Object.keys(kerning).length > 0) {
		files[`${root}/kerning.plist`] = strToU8(dictToPlistXml(kerning));
	}

	return files;
};

export const projectToUfoZipNative = (
	project: Project,
	familyName: string
): ArrayBuffer => {
	const files = buildUfoFiles(project, familyName);
	const zipped = zipSync(files);
	// fflate returns Uint8Array<ArrayBufferLike>; copy into a fresh ArrayBuffer
	// to satisfy strict TS dom typings for Blob / Response consumers.
	const buf = new ArrayBuffer(zipped.byteLength);
	new Uint8Array(buf).set(zipped);
	return buf;
};
