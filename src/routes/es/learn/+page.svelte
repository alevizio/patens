<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';

	const tutorials: Array<{ slug: string; title: string; what: string }> = [
		{
			slug: 'first-font',
			title: 'Tu primera tipografía en 10 pasos',
			what: 'De cero a un OTF instalable. Cubrís todo el pipeline: bocetar, trazar, anclas, métricas, kerning, export.'
		},
		{
			slug: 'audit-codes',
			title: 'Referencia de los 94 códigos de auditoría',
			what: 'La definición canónica de cada uno de los 94 códigos. Definición, ejemplos, contraejemplos.'
		},
		{
			slug: 'kerning',
			title: 'Kerning: el manual completo',
			what: 'Pares manuales vs auto-kerning, clases de kerning, kerning heredado entre proyectos.'
		},
		{
			slug: 'variable-fonts',
			title: 'Variable fonts en Patens',
			what: 'Designspace, masters, instancias nombradas, ejes, el explorador 2D.'
		},
		{
			slug: 'opentype-features',
			title: 'OpenType features',
			what: 'Sufijos de glifo (.ss01, .smcp, .onum), substituciones, ligaduras, preview con HarfBuzz.'
		},
		{
			slug: 'multi-script',
			title: 'Multi-script: Latín, Cirílico, Griego',
			what: 'Reutilizar formas entre scripts, qué glifos son look-alikes, qué tenés que dibujar a mano.'
		},
		{
			slug: 'export-formats',
			title: 'Formatos de exportación',
			what: 'OTF vs WOFF2 vs TTF vs UFO vs .font.json. Qué exportar para qué audiencia.'
		}
	];
</script>

<svelte:head>
	<title>Aprender Patens (2026) — tutoriales de diseño tipográfico</title>
	<meta
		name="description"
		content="Tutoriales para aprender diseño tipográfico con Patens: tu primera tipografía, los 94 códigos de auditoría, kerning, variable fonts, OpenType features, multi-script, exportación."
	/>
	<link rel="canonical" href="https://patens.design/es/learn" />
	{@html hreflangLinks('/learn')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Aprender · Patens" />
	<meta property="og:description" content="Tutoriales de diseño tipográfico." />
	<meta property="og:image" content="https://patens.design/og/learn" />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/learn" lang="es" />

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
		Aprender
	</h1>
	<p class="mb-10 text-[17px] leading-relaxed text-fg-muted">
		Tutoriales para construir intuición tipográfica usando Patens. Los textos completos están
		en inglés por ahora (la traducción al español está en el roadmap v1.7+) — los listo acá
		para que tengas el índice navegable.
	</p>

	<section class="mb-12 space-y-6">
		{#each tutorials as t (t.slug)}
			<article class="border-l-2 border-fg/10 pl-5">
				<h2 class="mb-2 text-[20px] tracking-tight text-fg">{t.title}</h2>
				<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">{t.what}</p>
				<a
					href="/learn/{t.slug}"
					class="inline-flex items-center gap-1.5 text-[13px] text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Leer en inglés
					<ArrowRight class="size-3" />
				</a>
			</article>
		{/each}
	</section>

	<SiteFooter lang="es" />
</div>
