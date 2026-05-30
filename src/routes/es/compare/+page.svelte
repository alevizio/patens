<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';

	type Tool = {
		name: string;
		url: string;
		licence: string;
		platform: string;
		price: string;
		strength: string;
		patensDifference: string;
	};

	const tools: Tool[] = [
		{
			name: 'Fontra',
			url: 'https://fontra.xyz',
			licence: 'Apache 2.0',
			platform: 'Browser',
			price: 'Gratis',
			strength: 'Editor browser-native con respaldo profesional (Black Foundry). Cadencia de releases muy activa: shaping debugger, conditional substitutions, woff2 export en el último semestre.',
			patensDifference: 'Patens lidera con la pedagogía: la auditoría de 94 códigos con explicación en lenguaje claro es el ángulo único; Fontra es deeper en designspace y shaping debug.'
		},
		{
			name: 'FontLab 8',
			url: 'https://fontlab.com',
			licence: 'Comercial',
			platform: 'macOS, Windows',
			price: '$97 Starter / $499 Pro',
			strength: 'El estándar profesional de la industria por décadas. Toolkit más completo del mercado para tipografía comercial seria.',
			patensDifference: 'Patens es gratis, MIT, sin instalación. FontLab es profesional pago. Diferentes audiencias: Patens para diseñadores aprendiendo + indie type, FontLab para foundries shipeando familias comerciales.'
		},
		{
			name: 'Glyphs',
			url: 'https://glyphsapp.com',
			licence: 'Comercial',
			platform: 'macOS',
			price: '€299 / €49 Mini',
			strength: 'Workflow extremadamente refinado para macOS. Plugin ecosystem rico. La opción favorita de muchos diseñadores tipográficos profesionales.',
			patensDifference: 'Patens corre en cualquier OS (es web). Glyphs sigue en versión 3.4 (oct 2025) — no hay Glyphs 4 anunciado. Para quien quiere flujo profesional en macOS, Glyphs sigue siendo la opción premium; Patens es la alternativa abierta multiplataforma.'
		},
		{
			name: 'Glyphr Studio',
			url: 'https://glyphrstudio.com',
			licence: 'GPL v3',
			platform: 'Browser',
			price: 'Gratis',
			strength: 'El editor browser-native pionero. Versión 2.x activa en 2026 con PWA support, redo con historia clicable, motor bezier-boolean propio (sin Paper.js).',
			patensDifference: 'Glyphr Studio es hobbyist-oriented y consciente de eso ("no production tool"). Patens apunta a uso production-ready: audit, OpenType features completos, variable fonts, color fonts. Diferentes filosofías de scope.'
		},
		{
			name: 'BirdFont',
			url: 'https://birdfont.org',
			licence: 'GPL v3 + Comercial',
			platform: 'Linux, macOS, Windows, BSD',
			price: 'GPL gratis · Comercial $10',
			strength: 'Multiplataforma incluyendo BSD. Versión dual GPL/comercial estable.',
			patensDifference: 'Patens es 100% MIT, sin versión dual. Última release de BirdFont GPL: feb 2025 (cadencia más lenta).'
		},
		{
			name: 'FontForge',
			url: 'https://fontforge.org',
			licence: 'GPL v3',
			platform: 'Linux, macOS, Windows',
			price: 'Gratis',
			strength: 'Veterano open source. Soporta prácticamente todos los formatos de tipografía, incluidos algunos exóticos.',
			patensDifference: 'FontForge es notoriamente difícil de usar y la UI muestra su edad. Patens prioriza UX moderna y pedagogía sobre cobertura exhaustiva de formatos esotéricos.'
		},
		{
			name: 'typlr.app',
			url: 'https://typlr.app',
			licence: 'Propietario',
			platform: 'Browser',
			price: 'Gratis (con plan pago anunciado)',
			strength: 'Editor browser-native ligero. UI muy clean.',
			patensDifference: 'Sin updates públicos desde sept 2024 — estado del proyecto incierto. Patens es MIT, código abierto, mantenimiento activo público.'
		}
	];

	const newEntrants: Tool[] = [
		{
			name: 'Lipi.ai Font Studio',
			url: 'https://lipi.ai',
			licence: 'Propietario',
			platform: 'Browser',
			price: 'Por confirmar',
			strength: 'Browser-native, AI-assistido, prompt-to-editable-font. Apuntando a generación tipográfica desde prompts.',
			patensDifference: 'Patens no es AI-led. La AI es opcional, BYOK (tu key de Anthropic), y enfocada en pedagogía (explicar la auditoría) no en generación. Posturas distintas sobre el rol de la IA en diseño tipográfico.'
		},
		{
			name: 'Fontish',
			url: 'https://fontish.com',
			licence: 'Propietario',
			platform: 'Browser',
			price: 'Por confirmar',
			strength: 'Otro entrante AI-assistido en el espacio browser-native.',
			patensDifference: 'Misma diferenciación que con Lipi.ai: Patens es human-led, AI-optional. Apuntamos a enseñar al diseñador, no a generar tipografía por él.'
		}
	];
</script>

<svelte:head>
	<title>Patens vs FontLab, Glyphs, Fontra, Glyphr Studio (2026) — comparación</title>
	<meta
		name="description"
		content="Cómo se compara Patens con FontLab, Glyphs, Fontra, Glyphr Studio, BirdFont, FontForge, typlr.app, Lipi.ai, Fontish. Posicionamiento honesto."
	/>
	<link rel="canonical" href="https://patens.design/es/compare" />
	{@html hreflangLinks('/compare')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Comparación · Patens" />
	<meta property="og:description" content="Patens vs el paisaje de editores tipográficos." />
	<meta property="og:image" content="https://patens.design/og/compare" />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/compare" lang="es" />

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
		Patens vs el paisaje
	</h1>
	<p class="mb-10 text-[17px] leading-relaxed text-fg-muted">
		Cómo se compara Patens con las otras herramientas. La intención es honesta — Patens no
		reemplaza a FontLab para foundries comerciales, ni a Glyphs para flujos macOS refinados.
		Apunta a un espacio distinto: diseñadores aprendiendo tipografía + indie type, en cualquier
		OS, sin instalación, con un módulo de auditoría que enseña.
	</p>

	<section class="mb-12 space-y-8">
		{#each tools as tool (tool.name)}
			<article class="border-l-2 border-fg/10 pl-5">
				<h2 class="mb-2 flex items-baseline gap-3 text-[24px] tracking-tight text-fg">
					<a
						href={tool.url}
						class="inline-flex items-baseline gap-1 underline decoration-fg-subtle/40 underline-offset-2 hover:decoration-fg"
						rel="noopener"
					>
						{tool.name}
						<ExternalLink class="size-3" aria-hidden="true" />
					</a>
				</h2>
				<dl class="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
					<div class="flex gap-1.5">
						<dt class="font-mono uppercase tracking-wider text-fg-subtle">Licencia</dt>
						<dd class="text-fg-muted">{tool.licence}</dd>
					</div>
					<div class="flex gap-1.5">
						<dt class="font-mono uppercase tracking-wider text-fg-subtle">Plataforma</dt>
						<dd class="text-fg-muted">{tool.platform}</dd>
					</div>
					<div class="flex gap-1.5">
						<dt class="font-mono uppercase tracking-wider text-fg-subtle">Precio</dt>
						<dd class="text-fg-muted">{tool.price}</dd>
					</div>
				</dl>
				<p class="mb-2 text-[14px] leading-relaxed text-fg">{tool.strength}</p>
				<p class="text-[14px] leading-relaxed text-fg-muted">
					<strong class="font-medium text-fg">Vs Patens —</strong>
					{tool.patensDifference}
				</p>
			</article>
		{/each}
	</section>

	<section class="mb-12 border-t border-border/30 pt-12">
		<h2
			class="mb-6 text-[28px] tracking-tight text-fg"
			
		>
			Nuevos entrantes (2025–2026)
		</h2>
		<div class="space-y-8">
			{#each newEntrants as tool (tool.name)}
				<article class="border-l-2 border-fg/10 pl-5">
					<h3 class="mb-2 text-[20px] tracking-tight text-fg">
						<a
							href={tool.url}
							class="inline-flex items-baseline gap-1 underline decoration-fg-subtle/40 underline-offset-2 hover:decoration-fg"
							rel="noopener"
						>
							{tool.name}
							<ExternalLink class="size-3" aria-hidden="true" />
						</a>
					</h3>
					<p class="mb-2 text-[14px] leading-relaxed text-fg">{tool.strength}</p>
					<p class="text-[14px] leading-relaxed text-fg-muted">
						<strong class="font-medium text-fg">Vs Patens —</strong>
						{tool.patensDifference}
					</p>
				</article>
			{/each}
		</div>
	</section>

	<SiteFooter lang="es" />
</div>
