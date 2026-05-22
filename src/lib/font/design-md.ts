/**
 * Generate a foundry-style DESIGN.md from a project's state — the kind of
 * document KLIM, Hoefler, and Commercial Type publish alongside their
 * releases. Designers can commit this to a repo for living documentation.
 */

import type { Project } from './types';
import { USE_CASE_LABELS } from './types';
import { detectFeatures, featureLabel } from './feature-detect';

const fmtDate = (iso: string): string => {
	const d = new Date(iso);
	return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : iso;
};

const section = (title: string, body: string): string => {
	const b = body.trim();
	if (!b) return '';
	return `## ${title}\n\n${b}\n`;
};

export const generateDesignMd = (project: Project): string => {
	const lines: string[] = [];
	const md = project.metadata;
	const b = project.brief ?? {};

	// Title + summary
	lines.push(`# ${md.familyName}`);
	lines.push('');
	lines.push(
		`*${md.styleName} · v${md.version || '1.000'}${md.designer ? ` · by ${md.designer}` : ''}*`
	);
	if (b.intent?.trim()) {
		lines.push('');
		lines.push(`> ${b.intent.trim()}`);
	}
	lines.push('');

	// At-a-glance facts
	const drawn = Object.values(project.glyphs).filter(
		(g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0
	).length;
	const total = Object.keys(project.glyphs).length;
	const facts: string[] = [];
	facts.push(`- **Glyphs drawn**: ${drawn} / ${total}`);
	facts.push(`- **UPM**: ${project.metrics.unitsPerEm}`);
	facts.push(`- **Cap height**: ${project.metrics.capHeight}`);
	facts.push(`- **x-height**: ${project.metrics.xHeight}`);
	facts.push(`- **Ascender / Descender**: ${project.metrics.ascender} / ${project.metrics.descender}`);
	if (project.axes && project.axes.length > 0) {
		facts.push(
			`- **Variable axes**: ${project.axes.map((a) => `\`${a.tag}\` ${a.minimum}–${a.maximum} (default ${a.default})`).join(', ')}`
		);
	} else {
		facts.push(`- **Variable**: no (static family)`);
	}
	if (project.masters && project.masters.length > 0) {
		facts.push(`- **Masters**: default + ${project.masters.length} additional`);
	}
	if (project.kerning.length > 0) {
		facts.push(`- **Kerning pairs**: ${project.kerning.length}`);
	}
	if (project.sidebearingClasses && project.sidebearingClasses.length > 0) {
		facts.push(
			`- **Sidebearing classes**: ${project.sidebearingClasses.length} (${project.sidebearingClasses.map((c) => c.name).join(', ')})`
		);
	}
	lines.push(...facts);
	lines.push('');

	// Brief
	const briefBody = [
		b.intent?.trim() && `**Intent.** ${b.intent.trim()}`,
		b.audience?.trim() && `**Audience.** ${b.audience.trim()}`,
		(b.useCases?.length ?? 0) > 0 &&
			`**Use cases.** ${(b.useCases ?? []).map((u) => USE_CASE_LABELS[u] ?? u).join(', ')}`,
		b.readingConditions?.trim() && `**Reading conditions.** ${b.readingConditions.trim()}`,
		b.differentiation?.trim() && `**Differentiation.** ${b.differentiation.trim()}`
	]
		.filter(Boolean)
		.join('\n\n');
	lines.push(section('Brief', briefBody));

	// Design notes
	if (b.designNotes?.trim()) {
		lines.push(section('Design notes', b.designNotes.trim()));
	}

	// Decision log
	if (project.decisions && project.decisions.length > 0) {
		const dl = project.decisions
			.map((d) => `### ${d.decision}\n\n_${fmtDate(d.date)}_\n\n${d.rationale.trim()}`)
			.join('\n\n');
		lines.push(section('Decision log', dl));
	}

	// References
	if (b.references && b.references.length > 0) {
		const refLines = b.references.map((r) => {
			const kind = r.kind ? ` _(${r.kind})_` : '';
			const url = r.url ? ` — [${r.url}](${r.url})` : '';
			const notes = r.notes ? `\n  ${r.notes}` : '';
			return `- **${r.name}**${kind}${url}${notes}`;
		});
		lines.push(section('References studied', refLines.join('\n')));
	}

	// Features — kern/liga toggles + every auto-detected feature pulled from
	// glyph-name suffixes (.sc, .ss01, .osf, etc.) + any custom .fea source.
	// Detected features carry their plain-English label so the doc reads
	// "smcp — Small caps · 26 substitutions" instead of just "smcp".
	const featLines: string[] = [];
	if (project.features.kern) featLines.push('- `kern` — Kerning');
	if (project.features.liga) featLines.push('- `liga` — Standard ligatures (fi, fl, ffi)');
	const disabled = new Set(project.features.disabledAutoFeatures ?? []);
	const autoOn = project.features.autoFeatures !== false;
	if (autoOn) {
		const detected = detectFeatures(project);
		for (const f of detected) {
			if (disabled.has(f.feature)) continue;
			const count = f.subs.length;
			featLines.push(
				`- \`${f.feature}\` — ${featureLabel(f.feature)} · ${count} substitution${count === 1 ? '' : 's'}`
			);
		}
	}
	if (project.features.feaSource?.trim()) {
		featLines.push('- Custom `.fea` source compiled at export');
	}
	if (featLines.length > 0) {
		lines.push(section('OpenType features', featLines.join('\n')));
	}

	// Variable / instances
	if (project.instances && project.instances.length > 0) {
		const instLines = project.instances.map((i) => {
			const loc = Object.entries(i.location)
				.map(([tag, v]) => `${tag}=${v}`)
				.join(', ');
			return `- **${i.styleName}** _(${loc})_`;
		});
		lines.push(section('Named instances', instLines.join('\n')));
	}

	// Licensing
	const licLines: string[] = [];
	if (md.license?.trim()) licLines.push(`**License.** ${md.license.trim()}`);
	if (md.copyright?.trim()) licLines.push(`**Copyright.** ${md.copyright.trim()}`);
	const fsTypeMap: Record<number, string> = {
		0: 'Installable (no embedding restrictions)',
		2: 'Restricted',
		4: 'Preview & Print',
		8: 'Editable'
	};
	licLines.push(`**Embedding (\`fsType\`).** ${fsTypeMap[md.fsType ?? 0] ?? `Custom (${md.fsType})`}`);
	if (licLines.length > 0) {
		lines.push(section('License & rights', licLines.join('\n\n')));
	}

	// Changelog
	if (project.changelog && project.changelog.length > 0) {
		const cl = project.changelog
			.map((e) => `### v${e.version} — ${fmtDate(e.date)}\n\n${e.notes.trim()}`)
			.join('\n\n');
		lines.push(section('Changelog', cl));
	}

	// Footer
	lines.push(`---`);
	lines.push(
		`_Generated from Font Studio on ${new Date().toISOString().slice(0, 10)}. Project ID: \`${project.id}\`._`
	);

	return lines.filter((l) => l !== null && l !== undefined).join('\n');
};
