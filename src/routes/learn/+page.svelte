<script lang="ts">
	import Panel from '$lib/ui/Panel.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Compass from '@lucide/svelte/icons/compass';
	import Pencil from '@lucide/svelte/icons/pen-tool';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Rocket from '@lucide/svelte/icons/rocket';

	const TIMELINE: Array<{ weeks: string; phase: string; tasks: string[] }> = [
		{
			weeks: 'Week 1–2',
			phase: 'Research + control set',
			tasks: [
				'Write the brief (intent, audience, use cases, reading conditions).',
				'Collect three corpora: functional (real text the font must handle), historical (writing / lettering / print models), competitive (existing solutions to study).',
				'Sketch only the control glyphs: n o H O p d a e v + punctuation + figures.'
			]
		},
		{
			weeks: 'Week 3–4',
			phase: 'Make the glyphs cohere in text',
			tasks: [
				'Refine proportions; lock UPM, cap-height, x-height.',
				'Get spacing right before kerning — proof in HOHnonHo strings, not isolated glyphs.',
				'Add a couple of kerning pairs (AV, To) and prove they help.'
			]
		},
		{
			weeks: 'Week 5–8',
			phase: 'Expand cautiously',
			tasks: [
				'Fill in the rest of basic Latin; add diacritics with composites.',
				'Add the first feature set (kern + liga is enough).',
				'Build static OTF + WOFF2; install in Font Book; type something real.'
			]
		},
		{
			weeks: 'Week 9–12',
			phase: 'Test in real conditions, then release',
			tasks: [
				'Walk the full Release checklist — browser × OS matrix, app proofs, language tests.',
				'Fix the audit issues that actually matter; mark hints as accepted.',
				'Write design notes, version, license; ship trial + full binaries.'
			]
		}
	];

	const EXERCISES: Array<{ title: string; body: string }> = [
		{
			title: 'Redraw a historical model',
			body: 'Pick a typeface you already love and trace its proportion logic. Not to publish — to learn how it was constructed. Cover an alphabet in one weight.'
		},
		{
			title: 'Build a control set and proof in repeated strings',
			body: 'Draw n o H O a e s c p v y f g. Spend a full day spacing them inside HOHnonHnonH strings — single glyphs lie, strings tell the truth.'
		},
		{
			title: 'Make a serif and a sans that share a proportion model',
			body: 'Same UPM, cap-height, x-height, advance widths. The only differences are terminals and contrast. You will learn what structural choices really carry style.'
		},
		{
			title: 'Test in paragraph text and a browser before calling it finished',
			body: 'Compile WOFF2, drop it into a real page, set a paragraph at 14px. Most fonts that look great at 200px collapse in a paragraph.'
		}
	];

	const TOOLS: Array<{ name: string; role: string; href: string }> = [
		{
			name: 'Glyphs',
			role: 'Mature all-in-one editor on macOS. Best learning materials.',
			href: 'https://glyphsapp.com/learn'
		},
		{
			name: 'RoboFont',
			role: 'UFO-first, Python-scriptable. Modular for design systems.',
			href: 'https://doc.robofont.com/'
		},
		{
			name: 'FontLab',
			role: 'Cross-platform integrated editor with variable + web support.',
			href: 'https://help.fontlab.com/fontlab/8/manual/'
		},
		{
			name: 'FontForge',
			role: 'Free, open source. Wide format support, modest UI.',
			href: 'https://fontforge.org/docs/'
		},
		{
			name: 'fontTools',
			role: 'ttLib / feaLib / TTX / designspaceLib / varLib / subsetting.',
			href: 'https://fonttools.readthedocs.io/en/latest/'
		},
		{
			name: 'fontmake',
			role: 'Builds static + variable binaries from Glyphs / UFO / designspace.',
			href: 'https://github.com/googlefonts/fontmake'
		},
		{
			name: 'FontBakery',
			role: 'Automated QA checks with Google Fonts / Adobe Fonts profiles.',
			href: 'https://fontbakery.readthedocs.io/en/latest/'
		},
		{
			name: 'opentype.js',
			role: 'Read / write OTF + TTF in the browser. (This app uses it.)',
			href: 'https://opentype.js.org/'
		}
	];

	const READING: Array<{ title: string; by: string; why: string; href: string }> = [
		{
			title: 'Designing Type',
			by: 'Karen Cheng',
			why: 'Practical, shape-specific. Treats optical correction and structural consistency as inseparable.',
			href: 'https://yalebooks.yale.edu/book/9780300249927/designing-type/'
		},
		{
			title: 'The Stroke',
			by: 'Gerrit Noordzij',
			why: 'Theoretical. Trains you to think about writing logic, stress, and the white around letters.',
			href: 'https://hyphenpress.co.uk/products/books/978-0-907259-30-5/'
		},
		{
			title: 'Microsoft OpenType Specification',
			by: 'Microsoft',
			why: 'The actual format. Authoritative for tables, layout, variation.',
			href: 'https://learn.microsoft.com/en-us/typography/opentype/spec/'
		},
		{
			title: 'Google Fonts Guide',
			by: 'Google Fonts team',
			why: 'Strongest public model of open-source workflow, QA, and web deployment.',
			href: 'https://googlefonts.github.io/gf-guide/'
		},
		{
			title: 'AFDKO Feature File Specification',
			by: 'Adobe Type Tools',
			why: 'The grammar for .fea — what every modern build pipeline ingests.',
			href: 'https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html'
		},
		{
			title: 'WOFF2 (W3C Recommendation)',
			by: 'W3C',
			why: 'The web baseline. Why @font-face works the way it does.',
			href: 'https://www.w3.org/TR/WOFF2/'
		},
		{
			title: 'HarfBuzz Manual',
			by: 'HarfBuzz authors',
			why: 'The shaping engine inside Chrome/Firefox/Android. Read it before debugging OT layout.',
			href: 'https://harfbuzz.github.io/'
		}
	];

	const FOUNDRIES: Array<{ name: string; focus: string; why: string; href: string }> = [
		{
			name: 'KLIM Type Foundry',
			focus: 'Historically informed contemporary families',
			why: 'Their design notes (Söhne, The Future) model how to turn references into a concept.',
			href: 'https://klim.co.nz/'
		},
		{
			name: 'Hoefler&Co',
			focus: 'Editorial + institutional systems',
			why: 'Strongest public writing on optical sizes, feature depth, and family architecture.',
			href: 'https://www.typography.com/'
		},
		{
			name: 'Commercial Type',
			focus: 'Editorial workhorses',
			why: 'Graphik essay explains "deliberately plain" as a design position.',
			href: 'https://commercialtype.com/'
		},
		{
			name: 'TypeTogether',
			focus: 'Editorial reading + multiscript',
			why: 'Adelle Sans Multiscript: best model for thinking across writing systems.',
			href: 'https://www.type-together.com/'
		},
		{
			name: 'Dalton Maag',
			focus: 'Variable + multiscript systems',
			why: 'Aktiv Grotesk: typeface as system with 10 scripts, axes, and product surface.',
			href: 'https://www.daltonmaag.com/'
		},
		{
			name: 'Adobe Originals',
			focus: 'Publishing-grade families',
			why: 'Source Serif 4: clearest public story on optical sizes.',
			href: 'https://fonts.adobe.com/foundries/adobe'
		}
	];

	const RESEARCH: Array<{ title: string; by: string; why: string; href: string }> = [
		{
			title: 'Does Print Size Matter for Reading?',
			by: 'Gordon E. Legge & Charles A. Bigelow (2011)',
			why: 'Why print size remains a dominant readability variable — proof at use sizes.',
			href: 'https://jov.arvojournals.org/article.aspx?articleid=2191864'
		},
		{
			title: 'Crowding is unlike ordinary masking',
			by: 'Pelli, Palomares & Majaj (2004)',
			why: 'Why local density and neighboring forms constrain reading rate.',
			href: 'https://jov.arvojournals.org/article.aspx?articleid=2192859'
		}
	];
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<a
		href="/"
		class="mb-6 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3.5" />
		Back to projects
	</a>

	<header class="mb-8 flex items-start gap-3">
		<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
			<BookOpen class="size-4" />
		</div>
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Learn type design</h1>
			<p class="mt-1 text-sm text-fg-muted">
				A pragmatic 8–12 week starter path, exercises that actually teach you to see,
				and the tools/books a real practice runs on. Adapted from foundry essays and
				the standards docs that govern the format.
			</p>
		</div>
	</header>

	<Panel>
		<h2 class="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Compass class="size-3" /> Beginner timeline
		</h2>
		<ol class="grid gap-3">
			{#each TIMELINE as phase, i (phase.weeks)}
				<li class="grid grid-cols-[100px_1fr] gap-4 rounded-md border border-border bg-surface-2/40 p-3">
					<div>
						<div class="font-mono text-[11px] font-semibold text-accent" data-numeric>
							{phase.weeks}
						</div>
						<div class="mt-0.5 text-[10px] uppercase tracking-wider text-fg-subtle">
							Phase {i + 1}
						</div>
					</div>
					<div>
						<div class="mb-1 text-[13px] font-semibold text-fg">{phase.phase}</div>
						<ul class="grid gap-1 text-[12px] text-fg-muted">
							{#each phase.tasks as t (t)}
								<li class="flex gap-2">
									<span class="mt-1 size-1 shrink-0 rounded-full bg-fg-subtle"></span>
									<span>{t}</span>
								</li>
							{/each}
						</ul>
					</div>
				</li>
			{/each}
		</ol>
	</Panel>

	<Panel class="mt-6">
		<h2 class="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Pencil class="size-3" /> Exercises that actually teach you to see
		</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each EXERCISES as ex (ex.title)}
				<div class="rounded-md border border-border bg-surface-2/40 p-3">
					<div class="text-[13px] font-semibold text-fg">{ex.title}</div>
					<div class="mt-1 text-[12px] leading-snug text-fg-muted">{ex.body}</div>
				</div>
			{/each}
		</div>
	</Panel>

	<Panel class="mt-6">
		<h2 class="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Wrench class="size-3" /> Tools the practice runs on
		</h2>
		<div class="grid gap-2">
			{#each TOOLS as t (t.name)}
				<a
					href={t.href}
					target="_blank"
					rel="noopener"
					class="grid grid-cols-[140px_1fr] items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2 hover:border-accent hover:bg-accent-soft/30"
				>
					<div class="text-[13px] font-semibold text-fg">{t.name}</div>
					<div class="text-[12px] text-fg-muted">{t.role}</div>
				</a>
			{/each}
		</div>
	</Panel>

	<Panel class="mt-6">
		<h2 class="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<BookOpen class="size-3" /> Reading
		</h2>
		<div class="grid gap-2">
			{#each READING as r (r.title)}
				<a
					href={r.href}
					target="_blank"
					rel="noopener"
					class="rounded-md border border-border bg-surface-2/40 px-3 py-2 hover:border-accent hover:bg-accent-soft/30"
				>
					<div class="flex items-baseline gap-2">
						<span class="text-[13px] font-semibold text-fg">{r.title}</span>
						<span class="text-[11px] text-fg-subtle">— {r.by}</span>
					</div>
					<div class="text-[12px] text-fg-muted">{r.why}</div>
				</a>
			{/each}
		</div>
	</Panel>

	<Panel class="mt-6">
		<h2 class="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Compass class="size-3" /> Foundries worth studying
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			The strongest type-design education isn't in books — it's reading how foundries
			argue for their decisions. These public pages model the rhetoric, the system, and
			the production craft.
		</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each FOUNDRIES as f (f.name)}
				<a
					href={f.href}
					target="_blank"
					rel="noopener"
					class="rounded-md border border-border bg-surface-2/40 px-3 py-2 hover:border-accent hover:bg-accent-soft/30"
				>
					<div class="flex items-baseline justify-between gap-2">
						<span class="text-[13px] font-semibold text-fg">{f.name}</span>
						<span class="text-[10px] text-fg-subtle">↗</span>
					</div>
					<div class="text-[11px] font-medium text-fg-muted">{f.focus}</div>
					<div class="mt-0.5 text-[11px] text-fg-subtle">{f.why}</div>
				</a>
			{/each}
		</div>
	</Panel>

	<Panel class="mt-6">
		<h2 class="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<BookOpen class="size-3" /> Legibility research
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Two foundational papers — the empirical reason proof paragraphs matter more than
			polished hero glyphs.
		</p>
		<div class="grid gap-2">
			{#each RESEARCH as r (r.title)}
				<a
					href={r.href}
					target="_blank"
					rel="noopener"
					class="rounded-md border border-border bg-surface-2/40 px-3 py-2 hover:border-accent hover:bg-accent-soft/30"
				>
					<div class="flex items-baseline gap-2">
						<span class="text-[13px] font-semibold text-fg">{r.title}</span>
						<span class="text-[11px] text-fg-subtle">— {r.by}</span>
					</div>
					<div class="text-[12px] text-fg-muted">{r.why}</div>
				</a>
			{/each}
		</div>
	</Panel>

	<Panel class="mt-6">
		<div class="flex items-center gap-3">
			<Rocket class="size-5 text-accent" />
			<div class="flex-1">
				<div class="text-[13px] font-semibold text-fg">Ready to start?</div>
				<div class="text-[12px] text-fg-muted">
					Create a project, fill in the Brief tab, draw your control set.
				</div>
			</div>
			<a
				href="/"
				class="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg hover:bg-accent/90"
			>
				New project →
			</a>
		</div>
	</Panel>
</div>
