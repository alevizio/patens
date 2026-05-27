<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';
</script>

<svelte:head>
	<title>Prensa · Patens — kit de prensa, descripciones, contacto</title>
	<meta
		name="description"
		content="Kit de prensa de Patens: descripciones de tres longitudes, factsheet, logos, capturas, contacto para reseñas."
	/>
	<link rel="canonical" href="https://patens.design/es/press" />
	{@html hreflangLinks('/press')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Prensa · Patens" />
	<meta property="og:description" content="Kit de prensa de Patens." />
	<meta property="og:image" content="https://patens.design/og/press" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/press" lang="es" />

	<a
		href="/es"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Volver al inicio
	</a>

	<h1
		class="mb-3 text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Prensa
	</h1>
	<p class="mb-12 text-[15px] leading-relaxed text-fg-muted">
		Kit de prensa para escritores, editores y reviewers que cubren herramientas de diseño y
		tipografía. Todo lo de acá se puede usar sin pedir permiso (citá la fuente, eso sí). Para
		preguntas que requieren respuesta:
		<a
			href="mailto:hi@patens.design"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			hi@patens.design
		</a>.
	</p>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">
		Descripciones (tres longitudes)
	</h2>

	<h3 class="mb-2 mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
		Una línea (para tweets, sub-headers de reseñas)
	</h3>
	<p class="mb-6 rounded-md border border-border/40 bg-fg/[0.02] p-4 text-[15px] leading-relaxed text-fg">
		Un editor tipográfico con un método. 94 reglas, en lenguaje claro, gratis para siempre.
	</p>

	<h3 class="mb-2 mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
		Un párrafo (para intros de artículos)
	</h3>
	<p class="mb-6 rounded-md border border-border/40 bg-fg/[0.02] p-4 text-[14px] leading-relaxed text-fg-muted">
		Patens es un editor de tipografías de código abierto MIT, browser-native, hecho por
		Alejandro Vizio. Lo distingue del resto del paisaje un módulo de auditoría continuo de 94
		códigos: en lugar de avisos opacos como "stroke crossing", cada hallazgo viene con una
		explicación en lenguaje claro de por qué eso importa, cómo lo resuelven otras tipografías,
		y (para unos 30 códigos) un botón para arreglarlo con un clic. El pipeline es completo —
		bocetar con lápiz sensible a la presión, trazar a curvas Bézier cúbicas, editar anchor por
		anchor, ajustar kerning con clases, exportar OTF/WOFF2/TTF/UFO — y todo corre en una
		pestaña, sin instalación, sin cuenta, con los proyectos guardados en IndexedDB local.
	</p>

	<h3 class="mb-2 mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
		Tres párrafos (para reseñas largas)
	</h3>
	<div class="mb-6 space-y-3 rounded-md border border-border/40 bg-fg/[0.02] p-4 text-[14px] leading-relaxed text-fg-muted">
		<p>
			Patens es un editor de tipografías que corre en el navegador. Bocetá glifos con un lápiz
			sensible a la presión, trazá las pinceladas a contornos Bézier cúbicos, ajustá métricas
			y kerning, exportá un archivo OpenType real. Todo en una pestaña, sin instalación, sin
			cuenta, con los proyectos viviendo en el IndexedDB local. Licencia MIT, código abierto.
		</p>
		<p>
			El diferenciador con FontLab, Glyphs, RoboFont, Fontra y otros editores es un módulo de
			auditoría integrado de 94 códigos que corre continuamente al lado del editor. Cada
			contorno, cada métrica, cada par de kerning se chequea contra las reglas que los
			diseñadores tipográficos internalizan en años de mentoría. Pero en lugar de devolver un
			warning seco, cada código viene con una explicación en lenguaje claro de qué es el
			problema, qué efecto tiene en el render, y cómo lo resuelven otras tipografías
			profesionales. Unos 30 códigos también traen un botón "Fix" que aplica la corrección
			canónica con un clic.
		</p>
		<p>
			Patens lo construye Alejandro Vizio en solitario. La filosofía es transparente: el
			editor nunca se va a paywallear, los proyectos siempre quedan en el cliente, el código
			completo está en GitHub bajo MIT. El proyecto está apuntado al lanzamiento público
			oficial en TypeCon Portland (agosto 2026).
		</p>
	</div>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">
		Datos
	</h2>
	<dl class="mb-8 space-y-3 text-[14px] leading-relaxed text-fg-muted">
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Nombre</dt>
			<dd class="flex-1 text-fg">Patens</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Sitio</dt>
			<dd class="flex-1 text-fg">patens.design</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Repo</dt>
			<dd class="flex-1 text-fg">github.com/alevizio/patens</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Licencia</dt>
			<dd class="flex-1 text-fg">MIT</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Maintainer</dt>
			<dd class="flex-1 text-fg">Alejandro Vizio (solo)</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Pronunciación</dt>
			<dd class="flex-1 text-fg">
				PAH-tens (
				<a
					href="/es/pronunciation"
					class="underline decoration-fg-subtle/40 underline-offset-2 hover:decoration-fg"
				>guía completa</a>
				)
			</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Bluesky</dt>
			<dd class="flex-1 text-fg">@patens.design</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">X</dt>
			<dd class="flex-1 text-fg">@patenstype</dd>
		</div>
		<div class="flex flex-wrap gap-x-3 border-b border-border/30 pb-2">
			<dt class="w-40 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">Instagram</dt>
			<dd class="flex-1 text-fg">@patens.type</dd>
		</div>
	</dl>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">
		Capturas y assets
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Hay capturas del editor, especímenes y la página de auditoría en el directorio
		<code class="rounded bg-fg/5 px-1 text-[12px]">static/press/</code>
		del repo, más la imagen social oficial en
		<code class="rounded bg-fg/5 px-1 text-[12px]">static/github-social.png</code>. Pedí más por
		<a
			href="mailto:hi@patens.design"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			email
		</a> si necesitás resoluciones específicas o composiciones a medida.
	</p>

	<SiteFooter lang="es" />
</div>
