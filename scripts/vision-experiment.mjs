#!/usr/bin/env node
/**
 * Vision-vs-Audit Empirical Study — runner harness
 *
 * Implements the methodology from
 * docs/research/ai-audit-mapping.md Section 3 — measure agreement
 * between Patens's deterministic 94-code audit module and
 * claude-opus-4-7 vision-model judgments on the top-10 vision-
 * augmented candidate codes.
 *
 * Cost: ~$60-$100 per full run (per Section 3.6 budget estimate).
 * Time: ~2-4 hours (rate-limited by Anthropic API throughput).
 *
 * Prerequisites:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   pnpm install (anthropic-sdk should be available)
 *
 * Usage:
 *   node scripts/vision-experiment.mjs --dry-run   (no API calls; cost preview)
 *   node scripts/vision-experiment.mjs --codes=xheight-misaligned,sharp-kink
 *   node scripts/vision-experiment.mjs             (full top-10)
 *
 * Output:
 *   docs/research/vision-experiment-results-YYYY-MM-DD.jsonl
 *   docs/research/vision-experiment-summary-YYYY-MM-DD.md
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
	options: {
		'dry-run': { type: 'boolean' },
		codes: { type: 'string' },
		fonts: { type: 'string' },
		model: { type: 'string', default: 'claude-opus-4-7' }
	}
});

/**
 * The top-10 vision-augmented candidate codes from
 * ai-audit-mapping.md Section 2.
 */
const CANDIDATE_CODES = [
	'xheight-misaligned',
	'sharp-kink',
	'kerning-extreme',
	'overflows-advance',
	'capheight-misaligned',
	'contour-winding-collision',
	'self-intersecting',
	'extends-above-ascender',
	'figures-non-tabular',
	'tiny-contour'
];

/**
 * Sample font tiers from ai-audit-mapping.md Section 3.1.
 *
 * Tier A — canonical open-source (10 fonts)
 * Tier B — proprietary "good" (5 fonts; requires legal review)
 * Tier C — novice / WIP (10 fonts from Patens projects)
 */
const SAMPLE_FONTS = {
	A_canonical: [
		{ name: 'Inter', url: 'https://rsms.me/inter/inter.ttf' },
		{ name: 'Source Sans 3', url: 'github.com/adobe-fonts/source-sans/...' },
		{ name: 'IBM Plex Sans', url: 'github.com/IBM/plex/...' },
		{ name: 'Roboto', url: 'fonts.google.com/roboto' },
		{ name: 'Recursive', url: 'github.com/arrowtype/recursive/...' },
		{ name: 'Public Sans', url: 'github.com/uswds/public-sans/...' },
		{ name: 'Noto Sans', url: 'fonts.google.com/noto-sans' },
		{ name: 'Cooper Hewitt', url: 'github.com/cooperhewitt/cooperhewitt-typeface' },
		{ name: 'Adobe Source Serif', url: 'github.com/adobe-fonts/source-serif' },
		{ name: 'JetBrains Mono', url: 'jetbrains.com/lp/mono/' }
	],
	B_proprietary: [
		// Placeholders — actual font selection requires legal review of
		// fair-use posture per Anthropic Acceptable Use Policy
	],
	C_novice: [
		// Patens project fixtures + Google Fonts review-rejects
	]
};

/**
 * Prompt templates per code, from ai-audit-mapping.md Section 2.
 *
 * Each template is rendered against a specific finding instance —
 * passes in the glyph name, measured value, render image, project
 * intent keyword.
 */
const PROMPT_TEMPLATES = {
	'xheight-misaligned': ({ glyph, delta, xheight, upm }) => `
You are reviewing a typeface. The lowercase letter ${glyph} has been measured as sitting ${delta}fu below the project's stated x-height of ${xheight} (UPM ${upm}).

Looking at the rendered word at body-text size (14px), does the top of ${glyph} look misaligned relative to its neighbours?

Answer in JSON format:
{
  "verdict": "visible" | "borderline" | "invisible",
  "reasoning": "one sentence explaining why"
}
`.trim(),

	'sharp-kink': ({ glyph, angleDegrees }) => `
You are reviewing a typeface. The glyph ${glyph} has been flagged for a sharp turn at ${angleDegrees}° in its contour.

Is this corner a designed feature (intentional terminal, broken-nib effect, blackletter aesthetic) or an unintended kink (sketch-to-trace artefact)?

Answer in JSON format:
{
  "verdict": "feature" | "kink" | "ambiguous",
  "reasoning": "one sentence explaining why"
}
`.trim(),

	'kerning-extreme': ({ left, right, kernValue, leftAdvance }) => `
You are reviewing a typeface. The kerning pair ${left}${right} has a value of ${kernValue}fu (left glyph advance is ${leftAdvance}fu — the pair magnitude exceeds half the advance).

Looking at the rendered pair at 96px display size, does the spacing look broken (letters touching, overlap, awkward gap) or intentional (tight display setting)?

Answer in JSON format:
{
  "verdict": "broken" | "intentional" | "borderline",
  "reasoning": "one sentence explaining why"
}
`.trim()
	// Templates for remaining 7 codes follow the same pattern; abbreviated
	// here for the harness scaffold. Add as the experiment expands.
};

/**
 * Anthropic vision API call. Stub — wire up the actual SDK once
 * ANTHROPIC_API_KEY is set.
 */
async function callVisionModel({ model: _model, imageB64: _imageB64, prompt: _prompt }) {
	if (args['dry-run']) {
		return {
			cost_estimate_usd: 0.04, // per call estimate from ai-audit-mapping.md
			dry_run: true,
			response: null
		};
	}

	if (!process.env.ANTHROPIC_API_KEY) {
		throw new Error('Set ANTHROPIC_API_KEY to run live. Use --dry-run for cost preview.');
	}

	// TODO when SDK is wired:
	//   import Anthropic from '@anthropic-ai/sdk';
	//   const client = new Anthropic();
	//   const result = await client.messages.create({
	//     model,
	//     max_tokens: 256,
	//     messages: [{
	//       role: 'user',
	//       content: [
	//         { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageB64 } },
	//         { type: 'text', text: prompt }
	//       ]
	//     }]
	//   });
	//   return result;

	throw new Error('Live API call not implemented — needs @anthropic-ai/sdk wiring.');
}

/**
 * Generate glyph render image. Reuses the OG card pipeline at
 * src/routes/og.png/+server.ts which already has Satori + resvg for
 * Inter rendering. For sample-font glyphs other than the demo,
 * the renderer needs to be extended.
 */
async function renderGlyph({ fontName: _fontName, glyph: _glyph, size: _size = 14 }) {
	// TODO: extend src/lib/og-render.ts to accept arbitrary fonts
	// + render single glyphs at specified sizes. For now, return
	// a placeholder dry-run image.
	if (args['dry-run']) {
		return { dry_run: true, size_bytes: 8192 };
	}
	throw new Error('Render pipeline not yet extended for sample fonts.');
}

/**
 * Audit-result harness. Imports the deterministic audit and runs it
 * against a sample font's project JSON.
 */
async function runAudit({ projectPath: _projectPath }) {
	// TODO: wire up the audit CLI here
	//   import { runAudit } from '../src/lib/font/audit';
	//   const project = JSON.parse(readFileSync(projectPath));
	//   return runAudit(project);
	if (args['dry-run']) {
		return { findings: [], dry_run: true };
	}
	throw new Error('Audit wiring not yet implemented.');
}

/**
 * Cohen's kappa between two raters. Per ai-audit-mapping.md Section
 * 3.5 statistical methodology.
 */
function _cohensKappa(rater1Verdicts, rater2Verdicts) {
	if (rater1Verdicts.length !== rater2Verdicts.length) {
		throw new Error('Verdict arrays must be same length.');
	}
	const n = rater1Verdicts.length;
	if (n === 0) return null;

	// Build agreement matrix
	const categories = [...new Set([...rater1Verdicts, ...rater2Verdicts])];
	const matrix = Object.fromEntries(
		categories.map((c) => [c, Object.fromEntries(categories.map((c2) => [c2, 0]))])
	);
	for (let i = 0; i < n; i++) {
		matrix[rater1Verdicts[i]][rater2Verdicts[i]]++;
	}

	// Observed agreement (po)
	let po = 0;
	for (const c of categories) {
		po += matrix[c][c];
	}
	po = po / n;

	// Expected agreement (pe)
	let pe = 0;
	for (const c of categories) {
		const r1Sum = categories.reduce((s, c2) => s + matrix[c][c2], 0);
		const r2Sum = categories.reduce((s, c2) => s + matrix[c2][c], 0);
		pe += (r1Sum / n) * (r2Sum / n);
	}

	return pe < 1 ? (po - pe) / (1 - pe) : 1.0;
}

/**
 * Main experiment runner.
 */
async function main() {
	const codesToRun = args.codes ? args.codes.split(',') : CANDIDATE_CODES;
	const tier = args.fonts ?? 'A_canonical';
	const fonts = SAMPLE_FONTS[tier] ?? SAMPLE_FONTS.A_canonical;

	console.log(`Vision experiment harness — Patens audit vs ${args.model}`);
	console.log(`Mode: ${args['dry-run'] ? 'DRY RUN (no API calls)' : 'LIVE'}`);
	console.log(`Codes: ${codesToRun.join(', ')}`);
	console.log(`Fonts: ${fonts.map((f) => f.name).join(', ')} (tier ${tier})`);
	console.log('');

	const today = new Date('2026-05-30').toISOString().split('T')[0];
	const outDir = join(import.meta.dirname, '..', 'docs', 'research');
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

	const outFile = join(outDir, `vision-experiment-results-${today}.jsonl`);
	const summaryFile = join(outDir, `vision-experiment-summary-${today}.md`);

	let totalCostEstimate = 0;
	const results = [];

	for (const code of codesToRun) {
		for (const font of fonts) {
			// Step 1: render representative glyphs from font for this code
			const image = await renderGlyph({ fontName: font.name, glyph: 'x' });

			// Step 2: run deterministic audit on the font
			const auditResult = await runAudit({ projectPath: `fixtures/${font.name}.font.json` });

			// Step 3: build prompt
			const prompt = PROMPT_TEMPLATES[code]?.({
				glyph: 'x',
				delta: 12,
				xheight: 500,
				upm: 1000,
				angleDegrees: 12,
				left: 'A',
				right: 'V',
				kernValue: -120,
				leftAdvance: 800
			}) ?? `[Template not yet implemented for ${code}]`;

			// Step 4: call vision model
			const visionResult = await callVisionModel({
				model: args.model,
				imageB64: image.dry_run ? 'DRY_RUN' : image,
				prompt
			});

			totalCostEstimate += visionResult.cost_estimate_usd ?? 0.04;

			const entry = {
				timestamp: '2026-05-30T00:00:00Z',
				code,
				font: font.name,
				tier,
				model: args.model,
				audit_verdict: auditResult.dry_run ? 'DRY_RUN' : auditResult.findings,
				vision_response: visionResult.response,
				dry_run: args['dry-run']
			};
			results.push(entry);

			if (!args['dry-run']) {
				writeFileSync(outFile, JSON.stringify(entry) + '\n', { flag: 'a' });
			}
		}
	}

	console.log(`\nResults: ${results.length} entries`);
	console.log(`Cost estimate: $${totalCostEstimate.toFixed(2)}`);

	if (args['dry-run']) {
		console.log('\nDRY RUN — no calls made. To run live:');
		console.log('  export ANTHROPIC_API_KEY=sk-ant-...');
		console.log('  node scripts/vision-experiment.mjs');
		return;
	}

	// Compute kappa per code (placeholder — needs human gold-standard
	// labels per Section 3.4 of ai-audit-mapping.md)
	const summary = `# Vision Experiment Results — ${today}

**Model:** ${args.model}
**Sample tier:** ${tier} (${fonts.length} fonts)
**Codes:** ${codesToRun.length}
**Total API calls:** ${results.length}
**Total cost:** $${totalCostEstimate.toFixed(2)}

## Cohen's Kappa per code
(Pending human gold-standard labels — see Section 3.4 of ai-audit-mapping.md)

| Code | Audit verdict | Vision verdict | Agreement |
|---|---|---|---|
${codesToRun.map((c) => `| ${c} | TBD | TBD | TBD |`).join('\n')}

## Notes
- Raw results: \`${outFile}\`
- Methodology: \`docs/research/ai-audit-mapping.md\` Section 3
- Recompute kappa via the cohensKappa() helper in this script after
  labels are added.
`;

	writeFileSync(summaryFile, summary);
	console.log(`\nSummary written: ${summaryFile}`);
	console.log(`Raw results: ${outFile}`);
}

main().catch((err) => {
	console.error('Vision experiment failed:', err.message);
	process.exit(1);
});
