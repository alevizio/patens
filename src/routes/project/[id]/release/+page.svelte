<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { preflightProject, auditCompatibility, auditProject } from '$lib/font/audit';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import { goto } from '$app/navigation';

	const project = $derived(projectStore.project);
	const checks = $derived(project?.releaseChecks ?? {});

	const preflight = $derived(project ? preflightProject(project) : []);
	const compatibility = $derived(project ? auditCompatibility(project) : []);
	const perGlyph = $derived(project ? auditProject(project) : []);

	const errors = $derived(
		[...preflight, ...compatibility, ...perGlyph].filter((i) => i.severity === 'error').length
	);
	const warnings = $derived(
		[...preflight, ...compatibility, ...perGlyph].filter((i) => i.severity === 'warn').length
	);
	const infos = $derived(
		[...preflight, ...compatibility, ...perGlyph].filter((i) => i.severity === 'info').length
	);

	const drawn = $derived(
		project
			? Object.values(project.glyphs).filter((g) => g.contours.length > 0).length
			: 0
	);

	type CheckItem = { id: string; label: string; hint?: string };
	type CheckGroup = { title: string; items: CheckItem[] };

	// font4.md, "A practical QA checklist usually includes the following: proof
	// spacing in repeated strings… test feature activation in real software…
	// inspect numerals, punctuation, currency symbols… check variable-axis
	// extremes… verify line spacing and clipping in office apps, layout apps,
	// browsers, design tools… test accented characters… compare rasterization
	// on dark/light backgrounds… verify exported metadata, family naming, style
	// linking."
	const GROUPS: CheckGroup[] = [
		{
			title: 'Rendering matrix',
			items: [
				{
					id: 'render-win-blink',
					label: 'Windows · Edge or Chrome',
					hint: 'Small UI text, hinting, clipping, style linking, numerals (DirectWrite + ClearType)'
				},
				{
					id: 'render-win-firefox',
					label: 'Windows · Firefox',
					hint: 'GSUB/GPOS behavior, fallback, second engine on the same OS'
				},
				{
					id: 'render-mac-safari',
					label: 'macOS · Safari',
					hint: 'Text sizes, optical sizes, menu naming, line spacing (Core Text + WebKit)'
				},
				{
					id: 'render-mac-blink',
					label: 'macOS · Chrome or Firefox',
					hint: 'Webfont loading, CSS feature access, paragraph color (Blink/Gecko on Apple stack)'
				},
				{
					id: 'render-linux-android',
					label: 'Linux or Android sanity pass',
					hint: 'Shaping-sensitive strings, WOFF2 loading, fallback (FreeType + HarfBuzz)'
				}
			]
		},
		{
			title: 'Application proofing',
			items: [
				{ id: 'app-figma', label: 'Figma — UI labels + paragraphs' },
				{ id: 'app-office', label: 'MS Word / Google Docs — body text' },
				{ id: 'app-indesign', label: 'Adobe InDesign — print proof' },
				{ id: 'app-terminal', label: 'Terminal / code editor (if mono)' }
			]
		},
		{
			title: 'Linguistic + script',
			items: [
				{ id: 'lang-latin-ext', label: 'Latin Extended diacritics (á à ä â ã å …)' },
				{ id: 'lang-vietnamese', label: 'Vietnamese stacked diacritics' },
				{ id: 'lang-greek-cyrillic', label: 'Greek / Cyrillic (if shipping)' },
				{ id: 'lang-numerals-currency', label: 'Numerals + currency symbols' },
				{ id: 'lang-punct-quotes', label: 'Quote marks (curly + straight) + dashes' }
			]
		},
		{
			title: 'Features + variations',
			items: [
				{ id: 'feat-kern', label: 'Kerning visibly works in real software' },
				{ id: 'feat-liga', label: 'Standard ligatures (fi, fl, ffi) activate' },
				{ id: 'feat-tnum', label: 'Tabular figures align in data tables' },
				{ id: 'feat-vf-axes', label: 'VF axes scrub smoothly across extremes' },
				{ id: 'feat-vf-instances', label: 'Named instances show in OS font menu' }
			]
		},
		{
			title: 'Metrics + naming',
			items: [
				{ id: 'meta-line-height', label: 'Line spacing matches across Windows/macOS' },
				{ id: 'meta-no-clipping', label: 'No descender/ascender clipping in any test' },
				{ id: 'meta-style-linking', label: 'Regular/Bold/Italic style linking correct' },
				{ id: 'meta-family-naming', label: 'Family name unique + matches license requirements' }
			]
		},
		{
			title: 'Packaging + release',
			items: [
				{ id: 'pkg-specimen', label: 'Specimen PDF exported and reviewed' },
				{ id: 'pkg-css-snippet', label: 'CSS snippet copied + tested on a real page' },
				{ id: 'pkg-license-set', label: 'License text + copyright filled in' },
				{ id: 'pkg-version', label: 'Version number set in metadata' },
				{ id: 'pkg-changelog', label: 'Release notes written for this version' }
			]
		}
	];

	const totalChecks = $derived(GROUPS.reduce((n, g) => n + g.items.length, 0));
	const passedChecks = $derived(
		GROUPS.reduce(
			(n, g) => n + g.items.filter((it) => checks[it.id]).length,
			0
		)
	);
	const manualPct = $derived(totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0);

	const autoPasses = $derived(errors === 0 && drawn >= 26);
	const readyToShip = $derived(autoPasses && manualPct === 100);

	// Google Fonts onboarding readiness — based on the official requirements
	// (OFL 1.1, fsType=0, complete metadata, full Basic Latin). This is an
	// approximation of FontBakery's check-googlefonts profile, not a substitute.
	const gfChecks = $derived.by(() => {
		if (!project) return [];
		const md = project.metadata;
		const drawnGlyphs = Object.values(project.glyphs).filter(
			(g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0
		);
		const hasFullBasicLatin = (() => {
			// A-Z, a-z, 0-9, space = 63 codepoints
			const required: number[] = [0x20];
			for (let cp = 0x30; cp <= 0x39; cp++) required.push(cp);
			for (let cp = 0x41; cp <= 0x5a; cp++) required.push(cp);
			for (let cp = 0x61; cp <= 0x7a; cp++) required.push(cp);
			const drawnCps = new Set(drawnGlyphs.map((g) => g.codepoint));
			return required.every((cp) => drawnCps.has(cp));
		})();
		return [
			{
				label: 'License is SIL OFL 1.1',
				ok: /SIL Open Font License|OFL\s*1\.1/i.test(md.license ?? ''),
				hint: 'Google Fonts requires OFL 1.1 for the library.'
			},
			{
				label: 'fsType is Installable (0)',
				ok: (md.fsType ?? 0) === 0,
				hint: 'Libre fonts must allow installable embedding (OS/2.fsType=0).'
			},
			{
				label: 'Copyright filled in',
				ok: !!md.copyright?.trim(),
				hint: 'Copyright string is required in the name table.'
			},
			{
				label: 'Version >= 1.000',
				ok: parseFloat(md.version ?? '0') >= 1,
				hint: 'GF expects production-grade releases.'
			},
			{
				label: 'Designer attribution',
				ok: !!md.designer?.trim(),
				hint: 'Name table needs a designer / manufacturer.'
			},
			{
				label: 'Full Basic Latin (A–Z, a–z, 0–9, space)',
				ok: hasFullBasicLatin,
				hint: 'Minimum viable Latin coverage for the library.'
			},
			{
				label: 'No audit errors',
				ok: errors === 0,
				hint: 'Pre-flight + structural checks must pass.'
			}
		];
	});
	const gfPassed = $derived(gfChecks.filter((c) => c.ok).length);
	const gfReady = $derived(gfChecks.length > 0 && gfPassed === gfChecks.length);

	let newChangelogVersion = $state('');
	let newChangelogNotes = $state('');
	$effect(() => {
		// Pre-fill version from metadata when empty
		if (!newChangelogVersion && project?.metadata.version) {
			newChangelogVersion = project.metadata.version;
		}
	});
	const submitChangelog = (e: Event) => {
		e.preventDefault();
		if (!newChangelogNotes.trim()) return;
		projectStore.addChangelogEntry({
			version: newChangelogVersion,
			notes: newChangelogNotes
		});
		toast.success(`Logged v${newChangelogVersion}`);
		newChangelogNotes = '';
	};
	const formatDate = (iso: string) =>
		new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});

	const lastSeal = $derived(project?.changelog?.[0]);
	const changedSinceLastSeal = $derived.by(() => {
		if (!project || !lastSeal) return [];
		const sealTime = Date.parse(lastSeal.date);
		if (!Number.isFinite(sealTime)) return [];
		return Object.values(project.glyphs)
			.filter((g) => {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t > sealTime;
			})
			.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
	});
</script>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header class="flex items-start gap-3">
				<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
					<Rocket class="size-4" />
				</div>
				<div>
					<h1 class="text-xl font-semibold tracking-tight">Release readiness</h1>
					<p class="text-sm text-fg-muted">
						Cross-platform rendering and proofing checks. The most common reason fonts
						fail in production is testing too late or too narrowly — these are the
						things to do <em>before</em> release, not after.
					</p>
				</div>
			</header>

			<Panel>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div>
						<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Auto-checks
						</div>
						<div class="mt-1 flex items-baseline gap-2">
							{#if autoPasses}
								<CheckCircle2 class="size-5 text-success" />
								<span class="text-[14px] font-medium text-success">Passing</span>
							{:else if errors > 0}
								<AlertCircle class="size-5 text-danger" />
								<span class="text-[14px] font-medium text-danger">{errors} errors</span>
							{:else}
								<AlertTriangle class="size-5 text-warn" />
								<span class="text-[14px] font-medium text-warn">Coverage low</span>
							{/if}
						</div>
					</div>
					<div>
						<div class="flex items-baseline justify-between gap-2">
							<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
								Manual checks
							</div>
							{#if passedChecks > 0}
								<button
									type="button"
									onclick={() => {
										if (confirm(`Reset all ${passedChecks} manual checks?`)) {
											projectStore.resetReleaseChecks();
											toast.info('Release checks reset');
										}
									}}
									class="text-[10px] text-fg-subtle hover:text-warn"
								>
									Reset all
								</button>
							{/if}
						</div>
						<div class="mt-1 flex items-baseline gap-2">
							<span class="text-[14px] font-medium text-fg" data-numeric>
								{passedChecks}/{totalChecks}
							</span>
							<span class="text-[12px] text-fg-subtle" data-numeric>{manualPct}%</span>
						</div>
						<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
							<div
								class="h-full bg-accent transition-all duration-500"
								style="width: {manualPct}%;"
							></div>
						</div>
					</div>
					<div>
						<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Glyphs drawn
						</div>
						<div class="mt-1 text-[14px] font-medium text-fg" data-numeric>{drawn}</div>
						<div class="text-[11px] text-fg-subtle">≥26 recommended</div>
					</div>
					<div>
						<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Ready?
						</div>
						<div class="mt-1 flex items-baseline gap-2">
							{#if readyToShip}
								<CheckCircle2 class="size-5 text-success" />
								<span class="text-[14px] font-medium text-success">Ship it</span>
							{:else}
								<Info class="size-5 text-fg-subtle" />
								<span class="text-[14px] font-medium text-fg-muted">Not yet</span>
							{/if}
						</div>
					</div>
				</div>
			</Panel>

			{#if errors > 0 || warnings > 0 || infos > 0}
				<Panel>
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Pre-flight summary
						</h2>
						<Button density="sm" variant="ghost" onclick={() => goto(`/project/${project.id}/export`)}>
							View on Export →
						</Button>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#if errors > 0}
							<span class="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger">
								<AlertCircle class="size-3" /> {errors} error{errors === 1 ? '' : 's'}
							</span>
						{/if}
						{#if warnings > 0}
							<span class="inline-flex items-center gap-1 rounded-md bg-warn/10 px-2 py-1 text-[11px] font-medium text-warn">
								<AlertTriangle class="size-3" /> {warnings} warning{warnings === 1 ? '' : 's'}
							</span>
						{/if}
						{#if infos > 0}
							<span class="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
								<Info class="size-3" /> {infos} hint{infos === 1 ? '' : 's'}
							</span>
						{/if}
					</div>
				</Panel>
			{/if}

			{#each GROUPS as group (group.title)}
				<Panel>
					{@const passedInGroup = group.items.filter((it) => checks[it.id]).length}
					<h2 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<span>{group.title}</span>
						<span class="font-mono normal-case text-fg-subtle/60" data-numeric>
							{passedInGroup}/{group.items.length}
						</span>
					</h2>
					<ul class="grid gap-1">
						{#each group.items as it (it.id)}
							{@const done = !!checks[it.id]}
							<li>
								<button
									type="button"
									onclick={() => projectStore.toggleReleaseCheck(it.id)}
									class="flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors {done
										? 'border-success/30 bg-success/5'
										: 'border-border bg-surface-2/40 hover:border-border-strong'}"
								>
									<span
										class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded {done
											? 'bg-success text-canvas'
											: 'border border-border bg-surface'}"
									>
										{#if done}<CheckCircle2 class="size-3" />{/if}
									</span>
									<span class="flex-1">
										<span class="block text-[12px] font-medium {done ? 'text-fg' : 'text-fg'}">
											{it.label}
										</span>
										{#if it.hint}
											<span class="block text-[11px] text-fg-subtle">{it.hint}</span>
										{/if}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</Panel>
			{/each}

			{#if lastSeal && changedSinceLastSeal.length > 0}
				<Panel>
					<div class="mb-2 flex items-baseline justify-between gap-2">
						<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Changed since v{lastSeal.version}
						</h2>
						<span class="font-mono text-[11px] text-fg-muted" data-numeric>
							{changedSinceLastSeal.length} glyph{changedSinceLastSeal.length === 1 ? '' : 's'} · sealed {formatDate(lastSeal.date)}
						</span>
					</div>
					<p class="mb-3 text-[12px] text-fg-subtle">
						These glyphs have been edited since the last sealed version. Use this list
						to seed the next changelog entry.
					</p>
					<div class="flex flex-wrap gap-1">
						{#each changedSinceLastSeal.slice(0, 60) as g (g.codepoint)}
							<a
								href="/project/{project.id}/edit"
								onclick={() => projectStore.selectGlyph(g.codepoint)}
								class="block"
								title="{g.name} · U+{g.codepoint.toString(16).toUpperCase().padStart(4, '0')} · edited {formatDate(g.updatedAt)}"
							>
								<GlyphTile
									glyph={g}
									size={36}
									showLabel={false}
									ascender={project.metrics.ascender}
									descender={project.metrics.descender}
								/>
							</a>
						{/each}
						{#if changedSinceLastSeal.length > 60}
							<span
								class="self-center rounded bg-surface-2/40 px-2 py-1 text-[11px] text-fg-subtle"
								data-numeric
							>
								+{changedSinceLastSeal.length - 60} more
							</span>
						{/if}
					</div>
				</Panel>
			{/if}

			<Panel>
				<div class="mb-2 flex items-baseline justify-between gap-2">
					<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Google Fonts onboarding
					</h2>
					<span
						class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {gfReady
							? 'bg-success/15 text-success'
							: 'bg-fg-subtle/10 text-fg-subtle'}"
						data-numeric
					>
						{gfPassed}/{gfChecks.length}
					</span>
				</div>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Approximate readiness for Google Fonts' onboarding (their
					<code>check-googlefonts</code> profile is the source of truth — run
					<code>fontbakery</code> locally before submitting).
				</p>
				<ul class="grid gap-1.5">
					{#each gfChecks as c (c.label)}
						<li
							class="flex items-start gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2"
						>
							{#if c.ok}
								<CheckCircle2 class="mt-0.5 size-3.5 shrink-0 text-success" />
							{:else}
								<AlertCircle class="mt-0.5 size-3.5 shrink-0 text-warn" />
							{/if}
							<div class="min-w-0 flex-1">
								<div class="text-[12px] text-fg">{c.label}</div>
								<div class="mt-0.5 text-[11px] text-fg-subtle">{c.hint}</div>
							</div>
						</li>
					{/each}
				</ul>
			</Panel>

			<Panel>
				<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Changelog ({project.changelog?.length ?? 0})
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Versioned release notes. Add one per shipped version — what changed, what
					was fixed, what's still open. Appears in the Specimen colophon.
				</p>
				{#if project.changelog && project.changelog.length > 0}
					<ul class="mb-4 grid gap-2">
						{#each project.changelog as e (e.id)}
							<li
								class="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
							>
								<span class="rounded bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent" data-numeric>
									v{e.version}
								</span>
								<div class="min-w-0">
									<div class="text-[11px] text-fg-subtle" data-numeric>{formatDate(e.date)}</div>
									<div class="mt-0.5 whitespace-pre-wrap text-[12px] text-fg">{e.notes}</div>
								</div>
								<button
									type="button"
									onclick={() => projectStore.removeChangelogEntry(e.id)}
									class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
									aria-label="Remove changelog entry v{e.version}"
								>
									<Trash2 class="size-3.5" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<form
					onsubmit={submitChangelog}
					class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"
				>
					<div class="grid grid-cols-[100px_1fr] gap-2">
						<Field label="Version">
							<Input density="sm" bind:value={newChangelogVersion} placeholder="1.000" />
						</Field>
						<Field label="Notes">
							<textarea
								bind:value={newChangelogNotes}
								placeholder={`- Added X\n- Fixed Y kerning\n- Bumped UPM`}
								rows="3"
								class="block w-full resize-y rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
							></textarea>
						</Field>
					</div>
					<div class="mt-2 flex justify-end">
						<Button type="submit" density="sm" disabled={!newChangelogNotes.trim()}>
							{#snippet icon()}<Plus class="size-3.5" />{/snippet}
							Log this version
						</Button>
					</div>
				</form>
			</Panel>

			<Panel>
				<div class="flex items-center justify-between gap-3">
					<div>
						<div class="text-[13px] font-medium text-fg">Ready to ship?</div>
						<div class="text-[12px] text-fg-subtle">
							{readyToShip
								? 'All gates green. Head to Export and ship the binaries.'
								: `${totalChecks - passedChecks} manual check${totalChecks - passedChecks === 1 ? '' : 's'} still open${errors > 0 ? `, ${errors} pre-flight error${errors === 1 ? '' : 's'} to fix` : ''}.`}
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if readyToShip}
							<button
								type="button"
								onclick={() => {
									if (
										confirm(
											`Seal release v${project.metadata.version}? Locks the project read-only. Unlock from the header.`
										)
									) {
										projectStore.addChangelogEntry({
											version: project.metadata.version,
											notes: '(Sealed release — see above for change set.)'
										});
										if (!project.locked) projectStore.toggleLock();
										toast.success(`v${project.metadata.version} sealed.`);
									}
								}}
								class="inline-flex items-center gap-1.5 rounded-md border border-warn bg-warn/15 px-3 py-1.5 text-[12px] font-medium text-warn hover:bg-warn/25"
							>
								Seal v{project.metadata.version}
							</button>
						{/if}
						<Button onclick={() => goto(`/project/${project.id}/export`)} disabled={!readyToShip}>
							{#snippet icon()}<Rocket class="size-4" />{/snippet}
							Go to Export
						</Button>
					</div>
				</div>
			</Panel>
		</div>
	</div>
{/if}
