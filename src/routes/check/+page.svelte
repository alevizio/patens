<script lang="ts">
	// /check — drop any OTF/TTF, get the full audit in the browser.
	// The whole differentiator in one screen: no signup, no upload, the
	// same 102 deterministic codes the editor runs, each linking to its
	// teaching page. Heavy modules (opentype.js via $lib/font/import,
	// the audit engine) lazy-load on first file so the shell stays light.
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Upload from '@lucide/svelte/icons/upload';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { AUDIT_CODE_COUNT } from '$lib/font/audit-count';
	import { goto } from '$app/navigation';
	import type { Project } from '$lib/font/types';

	type Finding = {
		code: string;
		severity: 'error' | 'warn' | 'info';
		codepoint: number;
		message: string;
		title: string;
		category: string;
	};
	type Report = {
		fileName: string;
		familyName: string;
		glyphCount: number;
		elapsedMs: number;
		findings: Finding[];
		categories: Array<{ name: string; findings: Finding[] }>;
		errors: number;
		warns: number;
		infos: number;
	};

	// Lazy expansion per category — closed <details> would still mount
	// thousands of rows for big fonts; only render the tail on demand.
	let expandedCats = $state(new Set<string>());
	const toggleCat = (name: string) => {
		const next = new Set(expandedCats);
		if (next.has(name)) next.delete(name);
		else next.add(name);
		expandedCats = next;
	};

	let dragActive = $state(false);
	let dragCounter = 0;
	let busy = $state(false);
	let fileError = $state<string | null>(null);
	let report = $state<Report | null>(null);
	let project: Project | null = null;
	let fileInput: HTMLInputElement | undefined;

	const runAudit = async (file: File) => {
		fileError = null;
		report = null;
		busy = true;
		try {
			if (!/\.(otf|ttf)$/i.test(file.name)) {
				throw new Error('Drop an .otf or .ttf — WOFF/WOFF2 and UFO need the editor import.');
			}
			const t0 = performance.now();
			const [{ importFromOtf }, audit, { AUDIT_CATALOGUE_BY_CODE }] = await Promise.all([
				import('$lib/font/import'),
				import('$lib/font/audit'),
				import('$lib/font/audit-catalogue')
			]);
			const { project: imported } = await importFromOtf(file);
			project = imported;
			// Same three passes the CLI runs, deduped.
			const raw = [
				...audit.auditProject(imported),
				...audit.auditCompatibility(imported),
				...audit.preflightProject(imported)
			];
			const seen = new Set<string>();
			const findings: Finding[] = [];
			for (const i of raw) {
				const key = `${i.code}:${i.codepoint}:${i.message}`;
				if (seen.has(key)) continue;
				seen.add(key);
				const rule = AUDIT_CATALOGUE_BY_CODE[i.code];
				findings.push({
					code: i.code,
					severity: i.severity,
					codepoint: i.codepoint,
					message: i.message,
					title: rule?.title ?? i.code,
					category: rule?.category ?? 'Other'
				});
			}
			const order = { error: 0, warn: 1, info: 2 } as const;
			findings.sort((a, b) => order[a.severity] - order[b.severity] || a.code.localeCompare(b.code));
			const byCat = new Map<string, Finding[]>();
			for (const f of findings) {
				if (!byCat.has(f.category)) byCat.set(f.category, []);
				byCat.get(f.category)?.push(f);
			}
			report = {
				fileName: file.name,
				familyName: imported.metadata.familyName,
				glyphCount: Object.keys(imported.glyphs).length,
				elapsedMs: Math.round(performance.now() - t0),
				findings,
				categories: [...byCat.entries()].map(([name, list]) => ({ name, findings: list })),
				errors: findings.filter((f) => f.severity === 'error').length,
				warns: findings.filter((f) => f.severity === 'warn').length,
				infos: findings.filter((f) => f.severity === 'info').length
			};
		} catch (err) {
			fileError = err instanceof Error ? err.message : 'Could not read this file.';
		} finally {
			busy = false;
		}
	};

	const onDrop = (ev: DragEvent) => {
		ev.preventDefault();
		dragCounter = 0;
		dragActive = false;
		const file = ev.dataTransfer?.files?.[0];
		if (file) void runAudit(file);
	};
	const onDragEnter = (ev: DragEvent) => {
		ev.preventDefault();
		dragCounter++;
		dragActive = true;
	};
	const onDragLeave = (ev: DragEvent) => {
		ev.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) dragActive = false;
	};

	const openInEditor = async () => {
		if (!project) return;
		const { saveProject } = await import('$lib/font/project');
		await saveProject(project);
		await goto(`/project/${project.id}/edit`);
	};

	const glyphLabel = (cp: number): string =>
		cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : '';

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				name: 'Check your font — Patens',
				description:
					'Drop any OTF or TTF and read the full 105-code type-design audit in your browser. Plain-English findings, primary-source citations, nothing uploaded.',
				url: 'https://patens.design/check',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Check your font', item: 'https://patens.design/check' }
				]
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Check your font (2026) · Patens</title>
	<meta
		name="description"
		content="Drop any OTF or TTF and get the full 105-code type-design audit in your browser — plain-English findings with primary-source citations. No signup, nothing uploaded."
	/>
	<link rel="canonical" href="https://patens.design/check" />
	<meta property="og:title" content="Check your font · Patens" />
	<meta property="og:description" content="Drop any OTF/TTF — the 105-code audit reads it in your browser. Nothing uploaded." />
	<meta property="og:image" content="https://patens.design/og/audit" />
	<meta property="og:image:alt" content="Patens — the audit module, 105 codes that teach as you draw" />
	<meta name="twitter:title" content="Check your font · Patens" />
	<meta name="twitter:description" content="Drop any OTF/TTF — the 105-code audit reads it in your browser. Nothing uploaded." />
	<meta name="twitter:image" content="https://patens.design/og/audit" />
	<meta name="twitter:image:alt" content="Patens — the audit module, 105 codes that teach as you draw" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/check" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 rounded-sm text-[12px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1 class="mb-6 text-[48px] leading-tight tracking-tight text-fg">Check your font.</h1>

	<p class="mb-10 max-w-3xl text-[15px] leading-relaxed text-fg-muted">
		Drop any <span class="font-mono text-fg">.otf</span> or
		<span class="font-mono text-fg">.ttf</span> and the full
		<a href="/audit" class="text-accent-strong underline underline-offset-2">{AUDIT_CODE_COUNT}-code audit</a>
		reads it — contour geometry, vertical metrics, spacing, naming, OpenType
		invariants — every finding in plain English, every rule citing the
		primary literature it comes from.
		<strong class="font-medium text-fg">The file never leaves this tab.</strong>
	</p>

	<!-- Drop zone -->
	<div
		role="button"
		tabindex="0"
		aria-label="Drop a font file here, or press Enter to browse"
		ondrop={onDrop}
		ondragover={(ev) => ev.preventDefault()}
		ondragenter={onDragEnter}
		ondragleave={onDragLeave}
		onclick={() => fileInput?.click()}
		onkeydown={(ev) => {
			if (ev.key === 'Enter' || ev.key === ' ') {
				ev.preventDefault();
				fileInput?.click();
			}
		}}
		class="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas {dragActive
			? 'border-accent bg-accent-soft/30'
			: 'border-border-strong/60 bg-surface hover:border-fg-subtle'}"
	>
		<Upload class="size-5 text-fg-subtle" />
		{#if busy}
			<p class="text-[14px] text-fg-muted">Reading the font + running {AUDIT_CODE_COUNT} codes…</p>
		{:else}
			<p class="text-[14px] text-fg-muted">
				<strong class="font-medium text-fg">Drop a font here</strong> — or click to browse
			</p>
			<p class="font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
				OTF · TTF · parsed locally · nothing uploaded
			</p>
		{/if}
		<input
			bind:this={fileInput}
			type="file"
			accept=".otf,.ttf"
			class="hidden"
			onchange={(ev) => {
				const file = ev.currentTarget.files?.[0];
				if (file) void runAudit(file);
				ev.currentTarget.value = '';
			}}
		/>
	</div>

	{#if fileError}
		<p class="mt-4 text-[13px] text-danger-strong" role="alert">{fileError}</p>
	{/if}

	{#snippet findingRow(f: Finding)}
		<li
			class="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md px-3 py-2 text-[13px] {f.severity ===
			'error'
				? 'bg-danger/10'
				: f.severity === 'warn'
					? 'bg-warn/10'
					: 'bg-surface'}"
		>
			{#if glyphLabel(f.codepoint)}
				<span class="font-mono text-[15px] text-fg">{glyphLabel(f.codepoint)}</span>
			{/if}
			<a
				href={`/audit/${f.code}`}
				class="font-mono text-[12px] text-accent-strong underline-offset-2 hover:underline"
			>
				{f.code}
			</a>
			<span class="text-fg-muted">{f.message}</span>
		</li>
	{/snippet}

	{#if report}
		<!-- Summary strip -->
		<div
			class="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-border/40 pt-6 font-mono text-[11px] tracking-[0.14em] text-fg-subtle uppercase"
		>
			<span class="text-fg">{report.familyName}</span>
			<span>·</span>
			<span data-numeric>{report.glyphCount} glyphs</span>
			<span>·</span>
			<span data-numeric>{report.findings.length} findings in {report.elapsedMs}ms</span>
			<span>·</span>
			<span class="text-danger-strong" data-numeric>{report.errors} errors</span>
			<span class="text-warn-strong" data-numeric>{report.warns} warnings</span>
			<span data-numeric>{report.infos} info</span>
		</div>

		{#if report.findings.length === 0}
			<div class="mt-8 flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-6">
				<CheckCircle2 class="size-5 text-success-strong" />
				<p class="text-[14px] text-fg-muted">
					Clean across all {AUDIT_CODE_COUNT} codes. Genuinely rare — ship it.
				</p>
			</div>
		{:else}
			{#each report.categories as cat (cat.name)}
				<!-- Big professional fonts produce thousands of findings; a wall
				     of rows is the FontBakery failure mode this page exists to
				     counter. Show the first 8 per family, rest behind details. -->
				<section class="mt-10">
					<h2 class="mb-4 font-mono text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						{cat.name} <span data-numeric>({cat.findings.length})</span>
					</h2>
					<ul class="grid gap-1.5">
						{#each cat.findings.slice(0, 8) as f, i (f.code + ':' + i)}
							{@render findingRow(f)}
						{/each}
					</ul>
					{#if cat.findings.length > 8}
						{#if expandedCats.has(cat.name)}
							<ul class="mt-1.5 grid gap-1.5">
								{#each cat.findings.slice(8) as f, i (f.code + ':rest:' + i)}
									{@render findingRow(f)}
								{/each}
							</ul>
						{/if}
						<button
							type="button"
							onclick={() => toggleCat(cat.name)}
							aria-expanded={expandedCats.has(cat.name)}
							class="mt-1.5 cursor-pointer rounded-md px-3 py-2 font-mono text-[11px] tracking-wider text-fg-muted uppercase transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
						>
							{expandedCats.has(cat.name)
								? 'Show fewer'
								: `Show all ${cat.findings.length}`}
						</button>
					{/if}
				</section>
			{/each}
		{/if}

		<div class="mt-12 flex flex-wrap items-center gap-4 border-t border-border/40 pt-8">
			<button
				type="button"
				onclick={openInEditor}
				class="rounded-md bg-fg px-4 py-2 text-[13px] font-medium text-canvas transition-colors hover:bg-fg/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
			>
				Open in the editor
			</button>
			<p class="text-[12px] text-fg-subtle">
				Imports outlines, metrics, and kerning into a local project — still nothing uploaded.
				Same audit in CI: <a href="/audit" class="text-accent-strong underline underline-offset-2"><code class="font-mono text-[11px]">npx patens audit</code></a>
			</p>
		</div>
	{/if}

	<SiteFooter />
</div>
