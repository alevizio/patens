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

	// happy-dom (and some other lightweight XML parsers) reject XML
	// declarations that use single quotes — but Python's ElementTree
	// (which fontTools / designspaceLib use to emit .designspace files)
	// produces `<?xml version='1.0' encoding='utf-8'?>` by default.
	// Normalize the declaration's quotes so production designspace files
	// from the wild parse cleanly. Body content is untouched.
	const normalizedXml = xml.replace(
		/^(\s*<\?xml\s)([^?]*?)(\?>)/,
		(_match, head, attrs, tail) => head + attrs.replace(/'/g, '"') + tail
	);
	const doc = new DOMParser().parseFromString(normalizedXml, 'application/xml');
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

	// Dimension `name` attributes can reference EITHER the axis tag
	// (designspace v5 idiom: `name="wdth"`) OR the axis human-readable name
	// (designspace v3 idiom and most production v3-v5 files: `name="Width"`).
	// Remap to axis tag so downstream code (designspaceToProject's
	// isAtDefault check, project.masters[].location lookups) works
	// uniformly regardless of which idiom the source file uses.
	const axisLookup = new Map<string, string>();
	for (const a of axes) {
		axisLookup.set(a.tag, a.tag);
		axisLookup.set(a.name, a.tag);
	}
	const parseLocation = (el: Element): Record<string, number> => {
		const out: Record<string, number> = {};
		for (const dim of Array.from(el.querySelectorAll(':scope > location > dimension'))) {
			const name = dim.getAttribute('name');
			const value = dim.getAttribute('xvalue');
			if (name && value !== null) {
				const tag = axisLookup.get(name) ?? name;
				out[tag] = parseFloat(value);
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
// XML attribute value escaper — handles the 5 required entities only.
// Designspace values are typically numbers or short identifiers; full
// XML escaping is overkill but mass-import resilience matters.
const escapeXmlAttr = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

/**
 * Serialize a Patens Project to a designspace v5 XML string.
 *
 * Round-trip companion to parseDesignspaceXml — parse → project →
 * serialize should produce equivalent (not byte-identical) XML. Whitespace
 * + attribute ordering may differ; structural shape is preserved.
 *
 * Includes:
 * - Axes from project.axes
 * - The implicit default-location source (Patens's project.glyphs) PLUS
 *   each Master in project.masters[]
 * - Each VariableInstance in project.instances[]
 *
 * Does NOT include the project's UFO/glyphs data — that's separate
 * export work; designspace XML only carries the structural metadata.
 */
export const designspaceFromProject = (project: Project): string => {
	const axes = project.axes ?? [];
	const masters = project.masters ?? [];
	const instances = project.instances ?? [];

	if (axes.length === 0) {
		throw new Error(
			'Cannot serialize designspace: project has no axes (not a variable font)'
		);
	}

	const defaultLocation: Record<string, number> = {};
	for (const a of axes) defaultLocation[a.tag] = a.default;

	const familyName = escapeXmlAttr(project.metadata?.familyName ?? 'Untitled');

	const axesXml = axes
		.map(
			(a) =>
				`    <axis tag="${escapeXmlAttr(a.tag)}" name="${escapeXmlAttr(
					a.name
				)}" minimum="${a.minimum}" default="${a.default}" maximum="${a.maximum}"/>`
		)
		.join('\n');

	const locationXml = (loc: Record<string, number>): string =>
		Object.entries(loc)
			.map(([tag, val]) => `        <dimension name="${escapeXmlAttr(tag)}" xvalue="${val}"/>`)
			.join('\n');

	// Default source (the project's main glyphs map)
	const defaultSourceXml = `    <source filename="default.ufo" familyname="${familyName}" name="${familyName} Default">
      <location>
${locationXml(defaultLocation)}
      </location>
    </source>`;

	const masterSourcesXml = masters
		.map(
			(m) => `    <source filename="${escapeXmlAttr(m.id)}.ufo" familyname="${familyName}" name="${escapeXmlAttr(
				m.name
			)}">
      <location>
${locationXml(m.location)}
      </location>
    </source>`
		)
		.join('\n');

	const instancesXml = instances
		.map(
			(inst) =>
				`    <instance familyname="${escapeXmlAttr(
					inst.familyName ?? familyName
				)}" stylename="${escapeXmlAttr(inst.styleName)}"${
					inst.postScriptName
						? ` postscriptfontname="${escapeXmlAttr(inst.postScriptName)}"`
						: ''
				}>
      <location>
${locationXml(inst.location)}
      </location>
    </instance>`
		)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<designspace format="5.0">
  <axes>
${axesXml}
  </axes>
  <sources>
${defaultSourceXml}${masters.length > 0 ? '\n' + masterSourcesXml : ''}
  </sources>${
		instances.length > 0
			? `
  <instances>
${instancesXml}
  </instances>`
			: ''
	}
</designspace>
`;
};

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
