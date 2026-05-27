<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';

	type Q = { q: string; a: string };
	const sections: Array<{ title: string; items: Q[] }> = [
		{
			title: 'Empezar',
			items: [
				{
					q: '¿Qué es Patens?',
					a: 'Una herramienta de diseño tipográfico que corre en el navegador. Bocetá glifos, trazá a curvas Bézier, ajustá métricas y kerning, exportá OpenType. Todo local, sin instalación, sin cuenta. Código abierto MIT. La diferencia: un módulo de auditoría de 94 reglas que explica cada hallazgo en lenguaje claro.'
				},
				{
					q: '¿Necesito una cuenta?',
					a: 'No. Patens corre 100% en tu navegador. Los proyectos se guardan en IndexedDB local. No hay servidor ni cuenta de usuario. Cuando compartís un enlace con la opción de nube, sólo eso se sube — vos elegís cuándo y qué.'
				},
				{
					q: '¿Funciona offline?',
					a: 'Sí. Patens es una PWA (Progressive Web App): se puede instalar y trabajar sin conexión. El service worker cachea el editor + assets; tus proyectos viven en IndexedDB.'
				},
				{
					q: '¿Funciona en mobile?',
					a: 'El editor está optimizado para desktop (≥1024px). En mobile (<1024px) verás un banner indicando que abras desde una computadora. Las páginas de marketing y la specimen page funcionan bien en cualquier tamaño.'
				}
			]
		},
		{
			title: 'Compartir',
			items: [
				{
					q: '¿Cómo comparto un proyecto?',
					a: 'En la barra superior del editor, hacé clic en "Share". Si la nube opcional está configurada, se sube y obtenés un enlace público. Si no, podés exportar a .font.json y compartir el archivo.'
				},
				{
					q: '¿Quién puede ver mis proyectos compartidos?',
					a: 'Cualquiera con el enlace. No hay control de acceso a nivel de usuario — el enlace ES la capacidad. Si querés revocar, tenés que borrar el blob (acción del originador con el delete-token).'
				},
				{
					q: '¿Puedo revocar un enlace compartido?',
					a: 'Sí. Cuando creás un share, Patens te muestra un delete-token. Guardalo. Con ese token podés borrar el blob desde la página del share o vía API. Sin token, sólo el originador (quien tenga el token) puede borrar.'
				}
			]
		},
		{
			title: 'Exportar',
			items: [
				{
					q: '¿Qué formatos de exportación soporta?',
					a: 'OTF, WOFF2, TTF (con hinting vía ttfautohint), UFO (formato abierto compatible con FontLab/Glyphs/RoboFont), bundle .zip listo para diseñador, y .font.json (formato portátil propio de Patens).'
				},
				{
					q: '¿El OTF que exporto es producción-ready?',
					a: 'Sí — pasa por opentype.js para escritura + hinting opcional con ttfautohint. Antes de exportar, corré la auditoría: 94 reglas chequean métricas, contornos, kerning, naming, color font tables, designspace. Si la auditoría está limpia, el OTF está listo.'
				},
				{
					q: '¿Por qué TTF tarda más que OTF?',
					a: 'TTF pasa por Pyodide + fontTools + ttfautohint corriendo como WebAssembly. La primera vez levanta el runtime de Python (~3-5s); después se cachea. OTF/WOFF2 son nativos a opentype.js y son instantáneos.'
				}
			]
		},
		{
			title: 'El editor',
			items: [
				{
					q: '¿Qué hace el lápiz vs la herramienta de edición?',
					a: 'Lápiz: bocetá con presión, después se traduce a contornos Bézier vía boolean union + curve-fitting. Editor: agarrá puntos de ancla, movelos, cambiá entre smooth y corner, hacé operaciones booleanas en contornos. El flujo típico es: bocetar → trazar a Bézier → editar.'
				},
				{
					q: '¿Soporta variable fonts?',
					a: 'Sí. Múltiples masters en posiciones distintas del designspace, instancias nombradas, explorador de variación 2D para proyectos con ≥2 ejes.'
				},
				{
					q: '¿Y OpenType features?',
					a: 'Auto-detectadas desde sufijos en los nombres de glifo (.ss01, .smcp, .onum). Substitución real de ligaduras (f_i → fi). Preview en vivo vía HarfBuzz.js.'
				},
				{
					q: '¿Soporta color fonts?',
					a: 'Sí. Tablas COLR v0/v1 + paletas CPAL. Composición en vivo del plan de color, editor por capa por glifo.'
				}
			]
		},
		{
			title: 'Performance',
			items: [
				{
					q: '¿Cuánto pesa el bundle?',
					a: 'El cold-load del editor es ~486 KB (gzipped). Cada subruta (audit, spacing, etc.) carga su propio módulo bajo demanda. La página de inicio es ~145 KB. Los números completos están en docs/launch/lighthouse-baseline.md.'
				},
				{
					q: '¿Y la fuente del runtime de Python (para TTF export)?',
					a: 'Pyodide se carga sólo cuando se necesita (al exportar TTF o UFO). No se incluye en el cold-load. Una vez cargada, queda en cache del navegador.'
				},
				{
					q: '¿Puedo manejar 1000+ glifos?',
					a: 'Sí. El GlyphBrowser usa content-visibility nativo del navegador para virtualizar tiles fuera de viewport. Proyectos con 500-2000 glifos rinden bien.'
				}
			]
		},
		{
			title: 'AI · IA',
			items: [
				{
					q: '¿Patens usa IA?',
					a: 'Sólo si vos lo configurás. Hay una sección AI opcional con tu propia API key de Anthropic (BYOK). Funciones: explicar códigos de auditoría en lenguaje claro, sugerir mejoras de glifo, generar metadata. Sin clave, Patens corre sin nada de IA.'
				},
				{
					q: '¿La IA tiene acceso a mis glifos?',
					a: 'Sólo cuando vos invocás una función AI específica que necesita el contexto del glifo (ej. "Visual audit"). Esa función envía el glifo a la API de Anthropic con tu clave. Nada se envía por defecto, ni en background.'
				}
			]
		},
		{
			title: 'Seguridad',
			items: [
				{
					q: '¿Mis datos salen de mi navegador?',
					a: 'No, a menos que vos lo decidas. Los proyectos viven en IndexedDB. Para que algo salga: (1) compartís un link a la nube, (2) exportás un archivo, (3) usás una función AI con tu API key. Cada acción es explícita.'
				},
				{
					q: '¿Qué headers de seguridad envía?',
					a: 'Headers baseline: X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy bloqueando camera/mic/geo/payment/USB, y HSTS sobre HTTPS. Sin cookies de tracking.'
				}
			]
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design/es' },
					{ '@type': 'ListItem', position: 2, name: 'Ayuda', item: 'https://patens.design/es/help' }
				]
			},
			{
				'@type': 'FAQPage',
				inLanguage: 'es',
				mainEntity: sections.flatMap((s) =>
					s.items.map((q) => ({
						'@type': 'Question',
						name: q.q,
						acceptedAnswer: { '@type': 'Answer', text: q.a }
					}))
				)
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Ayuda (2026) · Patens — compartir, exportar, editor, performance</title>
	<meta
		name="description"
		content="Preguntas frecuentes sobre Patens — compartir, exportar, el editor, performance. Actualizado 2026."
	/>
	<link rel="canonical" href="https://patens.design/es/help" />
	{@html hreflangLinks('/help')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Ayuda (2026) · Patens" />
	<meta property="og:description" content="Preguntas frecuentes sobre Patens." />
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Ayuda (2026) · Patens" />
	<meta name="twitter:description" content="Preguntas frecuentes sobre Patens." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/help" lang="es" />

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
		Ayuda · Preguntas frecuentes
	</h1>
	<p class="mb-12 text-[15px] leading-relaxed text-fg-muted">
		Las preguntas que aparecen más seguido — compartir, exportar, el editor, performance, AI,
		seguridad. ¿No encontrás lo que buscás? Abrí un issue en
		<a
			href="https://github.com/alevizio/patens/issues"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			rel="noopener"
		>
			GitHub
		</a> o una discusión en
		<a
			href="https://github.com/alevizio/patens/discussions"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			rel="noopener"
		>
			Discussions
		</a>.
	</p>

	{#each sections as section (section.title)}
		<section class="mb-12 border-t border-border/30 pt-12">
			<h2
				class="mb-6 text-[28px] tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				{section.title}
			</h2>
			<div class="space-y-6">
				{#each section.items as item, i (i)}
					<div>
						<h3 class="mb-2 text-[16px] font-medium text-fg">{item.q}</h3>
						<p class="text-[14px] leading-relaxed text-fg-muted">{item.a}</p>
					</div>
				{/each}
			</div>
		</section>
	{/each}

	<SiteFooter lang="es" />
</div>
