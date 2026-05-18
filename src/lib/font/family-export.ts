/**
 * Family bundle export — produces a single ZIP containing every sibling's
 * compiled OTF plus a family-level DESIGN.md. Each OTF is patched at write
 * time so that OS/2 weight/width/fsSelection align with the sibling's
 * `familyAxes`, which is what OS font menus actually use to group styles
 * under a single family name.
 *
 * Full STAT-table generation requires fontTools (Pyodide); for the basic
 * static-family case the OS/2 + name-table approach is enough for most apps.
 */

import { zipSync, strToU8 } from 'fflate';
import { buildFont } from './export';
import { generateDesignMd } from './design-md';
import { loadProject } from './project';
import { loadFamily, listSiblings } from './family';
import type { Project, FamilyAxes } from './types';

/** Convert family axes into the OS/2 patches needed to identify a static style. */
const os2PatchFromAxes = (axes?: FamilyAxes) => {
	if (!axes) return null;
	// OS/2 usWidthClass: 1=50%, 2=62.5%, 3=75%, 4=87.5%, 5=100%, 6=112.5%, 7=125%,
	// 8=150%, 9=200%. Each step is 12.5% except 8→9 which jumps 50%.
	// `(wdth / 12.5) - 3` maps 50→1, 100→5, 150→9, then clamp.
	const wdthPct = axes.wdth ?? 100;
	const widthClass = Math.max(1, Math.min(9, Math.round(wdthPct / 12.5 - 3)));
	return {
		usWeightClass: axes.wght ?? 400,
		usWidthClass: widthClass,
		italic: axes.ital === 1
	};
};

/** Patch an opentype.js Font's OS/2 + name table for static-family naming. */
const patchFontForFamily = (
	font: InstanceType<typeof import('opentype.js').Font>,
	familyName: string,
	styleName: string,
	axes?: FamilyAxes
) => {
	const patch = os2PatchFromAxes(axes);
	const tables = font.tables as Record<string, unknown> | undefined;
	const os2 = tables?.os2 as { usWeightClass?: number; usWidthClass?: number; fsSelection?: number } | undefined;
	if (os2 && patch) {
		os2.usWeightClass = patch.usWeightClass;
		os2.usWidthClass = patch.usWidthClass;
		// fsSelection bits: 0=italic, 5=bold, 6=regular, 8=wws, 9=oblique
		let fs = os2.fsSelection ?? 0;
		const ITALIC = 1 << 0;
		const BOLD = 1 << 5;
		const REGULAR = 1 << 6;
		fs = fs & ~(ITALIC | BOLD | REGULAR);
		if (patch.italic) fs |= ITALIC;
		if ((axes?.wght ?? 400) >= 700) fs |= BOLD;
		if (!patch.italic && (axes?.wght ?? 400) === 400) fs |= REGULAR;
		os2.fsSelection = fs;
	}
	// Name table: ensure family + style names propagate
	const names = (font.names as Record<string, { en?: string }> | undefined) ?? undefined;
	if (names) {
		if (names.fontFamily) names.fontFamily.en = familyName;
		if (names.fontSubfamily) names.fontSubfamily.en = styleName;
		if (names.fullName) names.fullName.en = `${familyName} ${styleName}`;
		if (names.postScriptName)
			names.postScriptName.en = `${familyName}-${styleName}`.replace(/\s+/g, '');
	}
};

const safe = (s: string): string => s.replace(/[^A-Za-z0-9-]+/g, '') || 'Untitled';

export type FamilyBundle = {
	zip: Uint8Array;
	familyName: string;
	siblingCount: number;
	/** Names of siblings that had VF axes but were exported as static OTFs. */
	flattenedVfSiblings: string[];
};

/**
 * Build a single ZIP containing each sibling's OTF (patched for family-wide
 * naming + OS/2 classes) plus a family-level DESIGN.md and a flat manifest.
 */
export const buildFamilyBundle = async (familyId: string): Promise<FamilyBundle | null> => {
	const family = await loadFamily(familyId);
	if (!family) return null;
	const siblings = await listSiblings(familyId);
	const files: Record<string, Uint8Array> = {};
	const designLines: string[] = [`# ${family.name}\n`];
	if (family.designer) designLines.push(`Designed by ${family.designer}\n`);
	if (family.copyright) designLines.push(`${family.copyright}\n`);
	if (family.license) designLines.push(`Licensed under ${family.license}\n`);
	designLines.push('\n## Styles in this family\n');

	const familySafe = safe(family.name);
	const flattenedVfSiblings: string[] = [];
	for (const entry of siblings) {
		const project = await loadProject(entry.id);
		if (!project) continue;
		const styleName = project.metadata.styleName || 'Regular';
		// Family ZIP bundles are always static-style files. If a sibling has VF
		// axes defined, we flatten to the default master here and warn the user;
		// the per-project export route still produces a real VF binary.
		if ((project.axes?.length ?? 0) > 0) {
			flattenedVfSiblings.push(styleName);
		}
		const { font } = buildFont(project, {
			styleSuffix: undefined
		});
		patchFontForFamily(font, family.name, styleName, project.familyAxes);
		const buffer = font.toArrayBuffer();
		const filename = `${familySafe}-${safe(styleName)}.otf`;
		files[filename] = new Uint8Array(buffer);
		designLines.push(
			`- **${styleName}** · ${(buffer.byteLength / 1024).toFixed(1)} KB · \`${filename}\`${(project.axes?.length ?? 0) > 0 ? ' _(VF flattened to default master)_' : ''}`
		);
	}

	// Append the canonical DESIGN.md from the first sibling (or the project the
	// designer used as the "Regular" template).
	const seedSibling = siblings.find((s) => (s.familyAxes?.wght ?? 400) === 400 && !s.familyAxes?.ital) ?? siblings[0];
	if (seedSibling) {
		const seedProject = await loadProject(seedSibling.id);
		if (seedProject) {
			files[`DESIGN-${familySafe}.md`] = strToU8(
				`${designLines.join('\n')}\n\n---\n\n${generateDesignMd(seedProject)}`
			);
		} else {
			files[`DESIGN-${familySafe}.md`] = strToU8(designLines.join('\n'));
		}
	} else {
		files[`DESIGN-${familySafe}.md`] = strToU8(designLines.join('\n'));
	}

	const zip = zipSync(files, { level: 6 });
	return {
		zip,
		familyName: family.name,
		siblingCount: siblings.length,
		flattenedVfSiblings
	};
};

/** Convenience helper for the UI: build + download. Returns the bundle so the
 *  caller can surface warnings (e.g. flattened VF siblings) in a toast. */
export const downloadFamilyBundle = async (
	familyId: string
): Promise<FamilyBundle | null> => {
	const bundle = await buildFamilyBundle(familyId);
	if (!bundle) return null;
	const blob = new Blob([bundle.zip], { type: 'application/zip' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${safe(bundle.familyName)}-family-${bundle.siblingCount}styles.zip`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	return bundle;
};
