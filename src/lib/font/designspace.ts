/**
 * Designspace v5 import — Glyphs / FontLab / RoboFont / Fontmake interchange.
 *
 * Designspace is the XML format that every modern type-tool ecosystem
 * uses as the variable-font interchange. See
 * docs/research/variable-fonts-deep-dive.md Section 2.5 for the
 * format history and v5 changes; the implementation plan at
 * docs/research/variable-fonts-v2-implementation-plan.md Rank 3
 * specifies the parser scope.
 *
 * MVP scope (this module):
 * - Parse the v5 XML into a structured shape
 * - Map structured shape → Patens Project + Master + Instance records
 *
 * Out of scope for MVP:
 * - <rules> (substitution rules at runtime)
 * - <conditionSet>
 * - <discreteAxis> (v5-only, rare)
 * - Round-trip export (designspaceToXml) — separate function, future work
 *
 * Browser-only. Uses DOMParser; not available during SSR/prerender.
 */

import type { Axis, Master, VariableInstance, Project } from './types';

/**
 * Structured representation of a parsed designspace XML.
 *
 * Closer to the XML shape than to Patens's Project — the
 * `designspaceToProject()` function does the higher-level mapping.
 */
export type ParsedDesignspace = {
	/** fvar axes — directly maps to Patens Axis[] */
	axes: Array<{
		tag: string;
		name: string;
		minimum: number;
		default: number;
		maximum: number;
	}>;
	/**
	 * Source records — each is a master at a specific location. Patens
	 * stores the default master in Project.glyphs; non-default sources
	 * become Project.masters[].
	 */
	sources: Array<{
		/** Source filename or familyname — used as Master.name */
		name: string;
		/** Per-axis location keyed by axis tag */
		location: Record<string, number>;
		/** Original .ufo/.glyphs path — informational only */
		filename?: string;
	}>;
	/**
	 * Instance records — Patens stores these as VariableInstance[].
	 */
	instances: Array<{
		familyName?: string;
		styleName: string;
		location: Record<string, number>;
		postScriptName?: string;
	}>;
};

/**
 * Parse a designspace v5 XML string into ParsedDesignspace.
 *
 * Throws if the XML is malformed or required structure is missing.
 */
export const parseDesignspaceXml = (xml: string): ParsedDesignspace => {
	if (typeof DOMParser === 'undefined') {
		throw new Error(
			'parseDesignspaceXml requires DOMParser (browser only). For server-side use, run under Pyodide or shell out to fontTools.'
		);
	}

	const doc = new DOMParser().parseFromString(xml, 'application/xml');
	const error = doc.querySelector('parsererror');
	if (error) {
		throw new Error('Designspace XML parse error: ' + error.textContent?.slice(0, 200));
	}

	const root = doc.documentElement;
	if (root.tagName !== 'designspace') {
		throw new Error(`Expected root <designspace>, got <${root.tagName}>`);
	}

	const axes = Array.from(doc.querySelectorAll('axes > axis')).map((el) => {
		const tag = el.getAttribute('tag') ?? '';
		const name = el.getAttribute('name') ?? tag;
		const minimum = parseFloat(el.getAttribute('minimum') ?? '0');
		const def = parseFloat(el.getAttribute('default') ?? '0');
		const maximum = parseFloat(el.getAttribute('maximum') ?? '0');
		if (!tag || tag.length !== 4) {
			throw new Error(`Invalid axis tag (must be 4 chars): "${tag}"`);
		}
		if (!(minimum <= def && def <= maximum)) {
			throw new Error(
				`Axis '${tag}' has min/default/max out of order: ${minimum}/${def}/${maximum}`
			);
		}
		return { tag, name, minimum, default: def, maximum };
	});

	if (axes.length === 0) {
		throw new Error('Designspace has no <axes> declared — not a variable font');
	}

	const parseLocation = (el: Element): Record<string, number> => {
		const out: Record<string, number> = {};
		for (const dim of Array.from(el.querySelectorAll(':scope > location > dimension'))) {
			const name = dim.getAttribute('name');
			const value = dim.getAttribute('xvalue');
			if (name && value !== null) {
				out[name] = parseFloat(value);
			}
		}
		return out;
	};

	const sources = Array.from(doc.querySelectorAll('sources > source')).map((el) => {
		const filename = el.getAttribute('filename') ?? undefined;
		const name = el.getAttribute('name') ?? el.getAttribute('familyname') ?? filename ?? 'Untitled';
		const location = parseLocation(el);
		return { name, filename, location };
	});

	const instances = Array.from(doc.querySelectorAll('instances > instance')).map((el) => {
		const familyName = el.getAttribute('familyname') ?? undefined;
		const styleName = el.getAttribute('stylename') ?? 'Regular';
		const postScriptName = el.getAttribute('postscriptfontname') ?? undefined;
		const location = parseLocation(el);
		return { familyName, styleName, postScriptName, location };
	});

	return { axes, sources, instances };
};

/**
 * Map a parsed designspace + an existing or fresh Project into a Project
 * with the designspace axes + sources + instances populated.
 *
 * The "default" source (the one matching every axis default) becomes the
 * project's primary glyphs map (left empty here — user imports glyphs
 * separately). All other sources become Project.masters[].
 *
 * If `existingProject` is omitted, returns a partial Project with just
 * the designspace fields populated.
 */
export const designspaceToProject = (
	ds: ParsedDesignspace,
	existingProject?: Partial<Project>
): Partial<Project> => {
	const axes: Axis[] = ds.axes.map((a) => ({
		tag: a.tag,
		name: a.name,
		minimum: a.minimum,
		default: a.default,
		maximum: a.maximum
	}));

	// Identify the default source — its location matches every axis default
	const isAtDefault = (location: Record<string, number>): boolean =>
		ds.axes.every((a) => location[a.tag] === a.default);

	const defaultSource = ds.sources.find((s) => isAtDefault(s.location));
	const nonDefaultSources = ds.sources.filter((s) => s !== defaultSource);

	const masters: Master[] = nonDefaultSources.map((s, i) => ({
		id: `imported-${i + 1}`,
		name: s.name,
		location: s.location,
		glyphs: {},
		createdAt: '2026-05-30T00:00:00.000Z',
		updatedAt: '2026-05-30T00:00:00.000Z'
	}));

	const instances: VariableInstance[] = ds.instances.map((inst, i) => ({
		id: `imported-instance-${i + 1}`,
		familyName: inst.familyName,
		styleName: inst.styleName,
		location: inst.location,
		postScriptName: inst.postScriptName
	}));

	return {
		...(existingProject ?? {}),
		axes,
		masters,
		instances
	};
};
