<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';
	let { data }: { data: { version: string } } = $props();

	// Las descripciones de las dependencias se mantienen en inglés porque
	// muchas son nombres propios o términos técnicos sin traducción
	// idiomática (Bézier, kerning, polygon-clipping, etc.).
	const deps: Array<{ name: string; what: string; url: string }> = [
		{ name: 'SvelteKit', what: 'El framework de la aplicación.', url: 'https://svelte.dev/docs/kit' },
		{ name: 'Svelte 5', what: 'Reactividad con runes ($state, $derived, $effect).', url: 'https://svelte.dev' },
		{ name: 'Tailwind CSS v4', what: 'Estilos utility-first. Tokens vía variables CSS.', url: 'https://tailwindcss.com' },
		{ name: 'opentype.js', what: 'Lectura/escritura de OTF + WOFF2 en el navegador.', url: 'https://opentype.js.org/' },
		{ name: 'Pyodide + fontTools + ttfautohint', what: 'Pipeline de exportación TTF. Corre como WebAssembly, sin servidor.', url: 'https://pyodide.org' },
		{ name: 'HarfBuzz.js', what: 'Shaping OpenType para la preview en vivo.', url: 'https://harfbuzz.github.io' },
		{ name: 'fit-curve', what: 'Ajuste de curvas Schneider para el trazo sketch → vector.', url: 'https://github.com/soswow/fit-curve' },
		{ name: 'idb-keyval', what: 'Wrapper minimalista de IndexedDB. Guarda cada proyecto localmente.', url: 'https://github.com/jakearchibald/idb-keyval' },
		{ name: 'polygon-clipping', what: 'Operaciones booleanas en contornos (unión, diferencia) para el trace.', url: 'https://github.com/mfogel/polygon-clipping' },
		{ name: 'perfect-freehand', what: 'Cálculo de path con presión para el lápiz.', url: 'https://github.com/steveruizok/perfect-freehand' },
		{ name: 'satori + resvg-js', what: 'Imágenes OG renderizadas en server: JSX → SVG → PNG.', url: 'https://github.com/vercel/satori' },
		{ name: 'Vercel Blob', what: 'Almacenamiento en la nube para enlaces compartidos entre navegadores.', url: 'https://vercel.com/docs/storage/vercel-blob' },
		{ name: 'Vercel', what: 'Deploys + CDN edge.', url: 'https://vercel.com' }
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design/es' },
					{ '@type': 'ListItem', position: 2, name: 'Acerca de', item: 'https://patens.design/es/about' }
				]
			},
			{
				'@type': 'Person',
				name: 'Alejandro Vizio',
				url: 'https://github.com/alevizio',
				sameAs: [
					'https://github.com/alevizio',
					'https://x.com/patenstype',
					'https://bsky.app/profile/patens.design',
					'https://instagram.com/patens.type'
				],
				email: 'mailto:hi@patens.design',
				worksFor: { '@type': 'Organization', name: 'Patens' }
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Acerca de Patens (2026) — diseño tipográfico en el navegador, código abierto</title>
	<meta
		name="description"
		content="Qué es Patens, sobre qué está construido, quién lo hace."
	/>
	<link rel="canonical" href="https://patens.design/es/about" />
	{@html hreflangLinks('/about')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Acerca de · Patens" />
	<meta property="og:description" content="Qué es Patens, sobre qué está construido, quién lo hace." />
	<meta property="og:image" content="https://patens.design/og/about" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Acerca de · Patens" />
	<meta name="twitter:description" content="Qué es Patens, sobre qué está construido, quién lo hace." />
	<meta name="twitter:image" content="https://patens.design/og/about" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/about" lang="es" />

	<a
		href="/es"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Volver al inicio
	</a>

	<h1
		class="mb-6 text-[48px] leading-tight tracking-tight text-fg"
		
	>
		Acerca de Patens
	</h1>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Pa·tens · Latín: yacer abierto, accesible · <a
			href="/es/pronunciation"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			pronunciación
		</a>
	</p>

	<p class="mb-6 text-[15px] leading-relaxed text-fg">
		<strong class="font-semibold">Patens es un editor tipográfico con un método.</strong>
		Noventa y cuatro reglas chequean tu trabajo mientras dibujás, y cada una viene con un
		párrafo explicando qué está mal y cómo lo resuelven las fundiciones. La auditoría es el
		producto. El editor es cómo se entrega.
	</p>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		Alrededor de treinta de las reglas ofrecen además una corrección con un clic. El resto son
		cuestiones de criterio — el tipo de criterio que los diseñadores tipográficos internalizan
		a lo largo de años de mentoría. Patens intenta ser el mentor en el cuarto. No más fuerte
		que el trabajo, sólo presente.
	</p>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		Debajo: lápiz sensible a la presión, trazo a Bézier cúbico, edición ancla por ancla,
		kerning con clases, variable fonts, color fonts, features de OpenType y un pipeline real
		de exportación OTF / WOFF2 / TTF / UFO. Todo corre en una pestaña — sin instalación, sin
		cuenta, sin telemetría. Los proyectos viven en IndexedDB de tu navegador. Nada sale de tu
		máquina a menos que decidas compartir. Licencia MIT, funciona offline como PWA.
	</p>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		El nombre es la palabra latina para
		<em class="not-italic font-medium text-fg">abierto</em>
		— raíz de
		<em class="not-italic font-medium text-fg">patente</em>, el instrumento legal para
		registrar ideas. Patens es la misma palabra, antes de que los abogados se metieran con
		ella.
	</p>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Quién lo hace
	</h2>
	<p class="mb-4 text-[14px] leading-relaxed text-fg-muted">
		Patens lo hace
		
			Alejandro Vizio
		 — diseñador de producto que también programa. Lo construí como una herramienta
		personal para diseñar mis propias tipografías y porque las herramientas que existían eran o
		muy caras, o muy duras, o ambas. Si lo encontrás útil, contribuí en GitHub o contame en
		<a
			href="https://bsky.app/profile/patens.design"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			rel="noopener"
		>
			Bluesky
		</a>,
		<a
			href="https://x.com/patenstype"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			rel="noopener"
		>
			X
		</a>
		o
		<a
			href="https://instagram.com/patens.type"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			rel="noopener"
		>
			Instagram
		</a>.
	</p>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Sobre qué está construido
	</h2>
	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		Patens depende de proyectos de código abierto increíbles. Si Patens te resulta útil, mirá
		también a estos:
	</p>
	<ul class="mb-8 space-y-3 text-[14px]">
		{#each deps as dep (dep.name)}
			<li class="border-l-2 border-fg/10 pl-4">
				<span class="font-medium text-fg">{dep.name}</span>
				<span class="ml-1 text-fg-muted">— {dep.what}</span>
			</li>
		{/each}
	</ul>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Versión actual
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Patens v{data.version}. El
		<a
			href="/changelog"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			changelog completo
		</a> (versiones desde la v0.4) se mantiene en inglés por ahora.
	</p>

	<SiteFooter lang="es" />
</div>
