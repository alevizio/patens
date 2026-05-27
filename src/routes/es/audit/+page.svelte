<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';

	const families: Array<{ name: string; n: number; what: string }> = [
		{ name: 'Forma del contorno', n: 12, what: 'Contornos auto-intersectados, puntos duplicados, ángulos espurios, dirección de winding incorrecta.' },
		{ name: 'Alineación de métricas', n: 8, what: 'Overshoots faltantes, x-height inconsistente, baselines desalineados, cap-height drift.' },
		{ name: 'Espaciado y advance', n: 7, what: 'Sidebearings asimétricos en glifos que deberían serlo, advance widths erráticos, drift entre clases.' },
		{ name: 'Componentes y referencias', n: 6, what: 'Referencias rotas, composites con transforms inválidos, offsets que se salen del bounding box.' },
		{ name: 'Anchors', n: 8, what: 'Anchors sin pair _top, naming inconsistente, base glyphs sin marca, gpos rig roto.' },
		{ name: 'Compatibilidad variable', n: 9, what: 'Designspaces con masters incompatibles, conteos de contorno divergentes entre instancias.' },
		{ name: 'Notas, flags y naming', n: 10, what: 'TODO/FIXME en notas, naming no canónico, glyph names sin sufijo cuando lo necesitan.' },
		{ name: 'Glyph naming', n: 5, what: 'Nombres que rompen export, colisiones con AGLFN, sufijos mal escritos.' },
		{ name: 'Métricas verticales', n: 6, what: 'OS/2 typo/win/hhea inconsistente, ascender/descender drift, line-gap chico.' },
		{ name: 'Kerning + clases', n: 9, what: 'Pares duplicados, clases con miembros que se solapan, pares heredados con override accidental.' },
		{ name: 'Color fonts', n: 5, what: 'CPAL con paletas de tamaño distinto, COLR layers sin paint, alpha inválido.' },
		{ name: 'Designspace + masters', n: 4, what: 'Ejes con tags inválidos, master locations duplicadas, default no en el origen.' },
		{ name: 'Brief + metadata', n: 5, what: 'Brief incompleto, manufacturer/designer/version vacíos, vendor ID inválido.' }
	];
</script>

<svelte:head>
	<title>La auditoría · Patens — 94 reglas que enseñan tipografía mientras dibujás</title>
	<meta
		name="description"
		content="El módulo de auditoría de Patens es el diferenciador: 94 reglas que chequean contornos, métricas, kerning, color fonts, variable fonts — con explicación pedagógica en lenguaje claro."
	/>
	<link rel="canonical" href="https://patens.design/es/audit" />
	{@html hreflangLinks('/audit')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="La auditoría · Patens" />
	<meta property="og:description" content="94 reglas, explicación en lenguaje claro, ~30 con fix de un clic." />
	<meta property="og:image" content="https://patens.design/og/audit" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/audit" lang="es" />

	<a
		href="/es"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Volver al inicio
	</a>

	<h1
		class="mb-6 text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		El módulo de auditoría
	</h1>
	<p class="mb-10 text-[17px] leading-relaxed text-fg-muted">
		94 reglas que corren al lado del editor en todo momento. Cada hallazgo trae una explicación
		en lenguaje claro de por qué eso importa, qué efecto tiene en el render, y cómo otras
		tipografías lo resuelven. Para unos 30 códigos, además hay un botón "Fix" que aplica la
		corrección canónica con un clic.
	</p>

	<section class="mb-12">
		<h2 class="mb-3 text-[20px] font-medium text-fg">No es un linter. Es un mentor.</h2>
		<p class="text-[15px] leading-relaxed text-fg-muted">
			La diferencia con un linter clásico es que la auditoría de Patens
			<em>enseña</em>. Cada código tiene una entrada con la explicación, ejemplos en otras
			familias tipográficas, y referencias bibliográficas cuando aplica. Si te avisa "stroke
			crossing on glyph 'a'", lo que vas a leer no es "stroke crossing" — es por qué eso
			rompe el render, qué pasa en hinting, y qué hacen Garamond, Helvetica y Inter en el
			mismo caso.
		</p>
	</section>

	<section class="mb-12">
		<h2
			class="mb-6 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Las 13 familias de reglas
		</h2>
		<ul class="space-y-3 text-[14px]">
			{#each families as fam (fam.name)}
				<li class="border-l-2 border-fg/10 pl-4">
					<div class="flex items-baseline gap-3">
						<span class="font-medium text-fg">{fam.name}</span>
						<span class="font-mono text-[11px] tracking-wider text-fg-subtle">
							{fam.n} reglas
						</span>
					</div>
					<p class="mt-1 text-fg-muted">{fam.what}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="mb-12 border-t border-border/30 pt-12">
		<h2 class="mb-4 text-[20px] font-medium text-fg">Páginas dedicadas por código</h2>
		<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
			Cada uno de los 94 códigos tiene su propia página en
			<a
				href="/learn/audit-codes"
				class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			>
				/learn/audit-codes
			</a> (referencia en inglés por ahora — la traducción técnica al español está en el roadmap
			v1.7+). Cada página tiene la definición, ejemplos, contraejemplos y prerequisitos.
		</p>
	</section>

	<section class="mb-12 border-t border-border/30 pt-12">
		<h2 class="mb-4 text-[20px] font-medium text-fg">CLI: corré la auditoría sin abrir el editor</h2>
		<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
			<code class="rounded bg-fg/5 px-1.5 py-0.5 text-[13px]">npx patens audit</code>
			corre la auditoría completa contra un proyecto local. Tres formatos de output: text
			(humano), json (parseable), github (anotaciones PR). Útil para CI: si tu pipeline incluye
			una build de la tipografía, podés gatear el merge en la auditoría.
		</p>
		<a
			href="/learn/audit-codes"
			class="inline-flex items-center gap-2 text-[14px] text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			Ver la referencia de los 94 códigos
			<ArrowRight class="size-3" />
		</a>
	</section>

	<SiteFooter lang="es" />
</div>
