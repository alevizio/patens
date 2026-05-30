<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design/es' },
					{
						'@type': 'ListItem',
						position: 2,
						name: 'Pronunciación',
						item: 'https://patens.design/es/pronunciation'
					}
				]
			},
			{
				'@type': 'FAQPage',
				inLanguage: 'es',
				mainEntity: [
					{
						'@type': 'Question',
						name: '¿Cómo se pronuncia Patens?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Patens se pronuncia PA-tens (IPA: /ˈpɑː.tɛnz/). Dos sílabas, acento en la primera. La "pa" suena como en "padre" (ah abierta), y "tens" rima con "lens" en inglés — o, en español, con la última sílaba de "presente".'
						}
					},
					{
						'@type': 'Question',
						name: '¿Qué significa Patens?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Patens viene del latín patēns, participio presente de patēre, que significa "estar abierto" o "yacer abierto". De la misma raíz vienen "patente" (carta abierta), "patente" (el adjetivo: claro, evidente) y "patio" (un espacio abierto al cielo).'
						}
					},
					{
						'@type': 'Question',
						name: '¿Por qué se llama así el proyecto?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'El nombre codifica la filosofía: una herramienta de diseño tipográfico de código abierto MIT donde el proceso de diseño queda abierto — cada hallazgo de la auditoría se explica en lenguaje claro, cada contorno de glifo es editable, y el código está en GitHub.'
						}
					}
				]
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Cómo se pronuncia Patens (2026) — PAH-tens · herramienta de diseño tipográfico</title>
	<meta
		name="description"
		content="Patens se pronuncia PAH-tens (/ˈpɑː.tɛnz/). Dos sílabas, acento en la primera. Del latín patēns — 'lo que yace abierto'."
	/>
	<link rel="canonical" href="https://patens.design/es/pronunciation" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html hreflangLinks('/pronunciation')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Pronunciación · Patens" />
	<meta
		property="og:description"
		content="Cómo se pronuncia Patens: PAH-tens (/ˈpɑː.tɛnz/). Del latín patēns — 'yacer abierto'."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Pronunciación · Patens" />
	<meta
		name="twitter:description"
		content="Cómo se pronuncia Patens: PAH-tens (/ˈpɑː.tɛnz/). Del latín patēns — 'yacer abierto'."
	/>
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/pronunciation" lang="es" />

	<a
		href="/es/about"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Acerca de
	</a>

	<h1
		class="mb-2 text-[48px] leading-tight tracking-tight text-fg"
		
	>
		Patens
	</h1>

	<p class="mb-10 font-mono text-[14px] tracking-[0.05em] text-fg-muted">
		<span class="text-fg">PA-tens</span>
		<span class="mx-2 text-fg-subtle">·</span>
		/ˈpɑː.tɛnz/
		<span class="mx-2 text-fg-subtle">·</span>
		dos sílabas, acento en la primera
	</p>

	<section class="mb-12 space-y-4 text-[15px] leading-relaxed text-fg">
		<p>
			La <em>pa</em> suena como la primera sílaba de <em>padre</em> — una <em>a</em> abierta, no
			la <em>a</em> más cerrada del inglés <em>“patent”</em>. La <em>tens</em> rima con la
			última sílaba de <em>presente</em>.
		</p>
		<p>
			Si decís lentamente la palabra latina <em>patens</em> — o pensás en <em>patente</em>,
			pero quitándole la <em>e</em> final y abriendo el sonido — quedás muy cerca.
		</p>
	</section>

	<h2 class="mb-3 text-[20px] font-medium tracking-tight text-fg">Qué significa</h2>
	<p class="mb-10 text-[15px] leading-relaxed text-fg">
		<em>Patens</em> es latín — el participio presente de <em>patēre</em>, "estar abierto" o
		"yacer abierto". De la misma raíz vienen <em>patente</em> (una carta abierta que otorga un
		derecho), <em>patente</em> (el adjetivo: claro, evidente) y el término clínico
		<em>patencia</em>, que significa sin obstrucción. Una vena <em>patens</em> es una con el
		lumen abierto.
	</p>

	<h2 class="mb-3 text-[20px] font-medium tracking-tight text-fg">Por qué el nombre encaja</h2>
	<p class="mb-10 text-[15px] leading-relaxed text-fg">
		Código abierto MIT. Auditoría abierta — cada hallazgo se explica en lenguaje claro, sin
		warnings opacos. Lienzo abierto — cada contorno de glifo es editable, cada handle Bézier es
		alcanzable. Distribución abierta — el OTF que generás sale del navegador limpio, sin DRM,
		sin cuenta, sin cuota de exportación. El trabajo queda a la vista mientras lo hacés.
	</p>

	<div
		class="border-t border-fg/10 pt-4 text-[13px] leading-relaxed text-fg-muted"
	>
		<p>
			<span class="font-medium text-fg">Trivia.</span> El verbo latino
			<em>patēre</em> también es la raíz de "patio" — un espacio exterior abierto al cielo.
		</p>
	</div>

	<SiteFooter lang="es" />
</div>
