<script lang="ts">
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import WaitlistForm from '$lib/ui/WaitlistForm.svelte';
	import { hreflangLinks } from '$lib/i18n';

	// Marketing landing en español. NO project-list logic — la app
	// principal (/) sigue siendo inglés. Esta página explica Patens,
	// linkea al editor (demo) en inglés y a las páginas hermanas en
	// español. Voz: tú, neutro/LATAM, sin "vosotros".
	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				'@id': 'https://patens.design/es#webpage',
				url: 'https://patens.design/es',
				name: 'Patens — diseño de tipografías en el navegador',
				inLanguage: 'es',
				description:
					'Patens es un editor de tipografías para el navegador con un módulo de auditoría de 105 reglas que explica cada hallazgo en lenguaje claro. Código abierto, MIT.',
				isPartOf: { '@id': 'https://patens.design/#website' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Español', item: 'https://patens.design/es' }
				]
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Patens (2026) — un editor tipográfico con un método</title>
	<meta
		name="description"
		content="Patens es un editor tipográfico con 105 reglas corriendo por debajo. Cada regla se explica en lenguaje claro, y unas 30 arreglan el glifo por vos. Código abierto, MIT, en el navegador, sin instalación. El Método Patens."
	/>
	<link rel="canonical" href="https://patens.design/es" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html hreflangLinks('/')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Patens — diseño de tipografías en el navegador" />
	<meta
		property="og:description"
		content="Editor de tipografías en el navegador con auditoría de 105 reglas que enseña al dibujar. Código abierto, MIT."
	/>
	<meta property="og:image" content="https://patens.design/og.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Patens — diseño de tipografías en el navegador" />
	<meta
		name="twitter:description"
		content="Editor de tipografías en el navegador con auditoría de 105 reglas que enseña al dibujar. Código abierto, MIT."
	/>
	<meta name="twitter:image" content="https://patens.design/og.png" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es" lang="es" />

	<!-- Hero — paralelo al hero inglés en peso visual, no en estructura -->
	<section class="mb-16">
		<p class="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
			ESPAÑOL · BETA EN ESTA SUPERFICIE
		</p>

		<!-- H1 mirrors the EN home structure: two-line, dramatic-short
		     line 1 + descriptive line 2. Same left-to-right clip-path
		     reveal animation. The line itself is the Spanish parallel
		     of "Type, / with a mentor in the margin." — "Tipografía, /
		     con un mentor al margen." reads cleanly in neutral/LATAM
		     register (avoiding the Castilian-only "vosotros" trap). -->
		<h1
			class="mb-6 max-w-4xl text-balance text-[44px] leading-[1.02] tracking-tight sm:text-[80px]"
		>
			<span
				class="draw-line draw-line-1 block text-fg"
				
			>
				Tipografía,
			</span>
			<span
				class="draw-line draw-line-2 mt-2 block font-sans text-[0.6em] font-semibold leading-tight text-fg-muted"
			>
				con un mentor al margen.
			</span>
		</h1>

		<p class="mb-8 max-w-2xl text-[17px] leading-relaxed text-fg-muted sm:text-[19px]">
			<strong class="font-semibold text-fg">Patens</strong>
			es un editor tipográfico con el
			<em class="not-italic font-medium text-fg">Método Patens</em> integrado —
			<span class="font-mono text-fg" data-numeric>94</span> prácticas para dibujar tipografía,
			cada una explicada en lenguaje claro. Bocetá, ajustá kerning, exportá un
			<span class="font-mono text-fg">.otf</span> real — todo en una pestaña, todo guardado
			localmente. Código abierto, licencia MIT.
		</p>

		<!-- Alpha privada: el alta de invitación es la acción principal; el
		     demo (en inglés) queda abierto al público como anticipo. Voz tú,
		     neutral/LATAM. -->
		<div class="max-w-md">
			<p class="mb-3 text-[13px] font-medium text-fg">
				Está en alpha privada. Pide una invitación.
			</p>
			<WaitlistForm lang="es" />
		</div>

		<p class="mt-6 text-[13px] leading-relaxed text-fg-subtle">
			Nota: el editor y la documentación interna están en inglés por ahora. La traducción
			completa de la app está en el roadmap (v1.7+).
			Esta superficie en español cubre las páginas de marketing y la documentación pública;
			el editor sigue siendo bilingüe en sus etiquetas inglesas mientras trabajamos en la
			traducción completa.
		</p>
	</section>

	<!-- Trust band — los mismos números que la versión inglesa -->
	<section class="mb-20 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-b border-border/60 py-8 sm:grid-cols-4">
		<div>
			<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
				Reglas de auditoría
			</p>
			<p
				class="mt-1 text-[36px] leading-none tracking-tight text-fg"
				
				data-numeric
			>
				94
			</p>
		</div>
		<div>
			<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
				Glifos en el demo
			</p>
			<p
				class="mt-1 text-[36px] leading-none tracking-tight text-fg"
				
				data-numeric
			>
				162
			</p>
		</div>
		<div>
			<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
				Tests automatizados
			</p>
			<p
				class="mt-1 text-[36px] leading-none tracking-tight text-fg"
				
				data-numeric
			>
				714
			</p>
		</div>
		<div>
			<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
				Licencia
			</p>
			<p
				class="mt-1 text-[36px] leading-none tracking-tight text-fg"
				
			>
				MIT
			</p>
		</div>
	</section>

	<!-- Qué hace Patens — value props -->
	<section class="mb-20">
		<h2
			class="mb-8 text-[28px] leading-tight tracking-tight text-fg"
			
		>
			Lo que hace distinto a Patens
		</h2>

		<div class="space-y-6">
			<div class="border-l-2 border-fg/10 pl-5">
				<h3 class="mb-2 text-[18px] font-medium text-fg">
					Auditoría que enseña, no que regaña.
				</h3>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Cada uno de los 94 códigos tiene una explicación en lenguaje claro de por qué eso es
					un problema, qué efecto tiene en el render, y cómo otras tipografías lo resuelven.
					No es un linter — es un mentor técnico que corre en paralelo.
				</p>
			</div>

			<div class="border-l-2 border-fg/10 pl-5">
				<h3 class="mb-2 text-[18px] font-medium text-fg">
					Sin instalación, sin cuenta, sin servidor.
				</h3>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Todo corre en el navegador. Tus proyectos viven en IndexedDB en tu máquina. Nada sale
					de tu computadora a menos que vos lo decidas (exportar OTF, compartir un enlace, subir
					a la nube opcional).
				</p>
			</div>

			<div class="border-l-2 border-fg/10 pl-5">
				<h3 class="mb-2 text-[18px] font-medium text-fg">
					Pipeline real, no demo.
				</h3>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Bocetá con un lápiz sensible a la presión, trazá las pinceladas a contornos Bézier,
					editá ancla por ancla, ajustá kerning con clases, exportá OTF + WOFF2 + UFO + TTF.
					Variable fonts, OpenType features, anchors / composites, fuentes en color (COLR/CPAL).
				</p>
			</div>

			<div class="border-l-2 border-fg/10 pl-5">
				<h3 class="mb-2 text-[18px] font-medium text-fg">
					Código abierto, MIT, sin trampa.
				</h3>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Sin paywall en el editor. Sin "free tier" que te empuje a un plan pago. Todo el código
					es abierto bajo licencia MIT — para forkear, contribuir o autoalojar cuando quieras.
				</p>
			</div>
		</div>
	</section>

	<!-- Páginas hermanas en español -->
	<section class="mb-20">
		<h2
			class="mb-6 text-[20px] tracking-tight text-fg"
			
		>
			Páginas en español
		</h2>
		<ul class="grid grid-cols-1 gap-x-8 gap-y-3 text-[14px] sm:grid-cols-2">
			<li>
				<a
					href="/es/about"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Acerca de Patens →
				</a>
			</li>
			<li>
				<a
					href="/es/pronunciation"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Cómo se pronuncia "Patens" →
				</a>
			</li>
			<li>
				<a
					href="/es/audit"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					El módulo de auditoría →
				</a>
			</li>
			<li>
				<a
					href="/es/compare"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Comparación con otras herramientas →
				</a>
			</li>
			<li>
				<a
					href="/es/help"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Ayuda · Preguntas frecuentes →
				</a>
			</li>
			<li>
				<a
					href="/es/press"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Prensa →
				</a>
			</li>
			<li>
				<a
					href="/es/privacy"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Privacidad →
				</a>
			</li>
			<li>
				<a
					href="/es/security"
					class="text-fg-muted underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
				>
					Seguridad →
				</a>
			</li>
		</ul>
	</section>

	<SiteFooter lang="es" />
</div>

<style>
	/* H1 reveal — see src/routes/+page.svelte for the design reasoning.
	   Duplicated here (instead of pulled into a shared component) because
	   the rule is ~30 lines, scoped via Svelte's compiler, and the cost
	   of a shared helper outweighs the duplication. */
	@keyframes draw-reveal {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	.draw-line {
		clip-path: inset(0 0 0 0);
		animation: draw-reveal var(--draw-duration) cubic-bezier(0.65, 0, 0.35, 1) both;
		animation-delay: var(--draw-delay, 0ms);
	}
	.draw-line-1 {
		--draw-duration: 700ms;
		--draw-delay: 100ms;
	}
	.draw-line-2 {
		--draw-duration: 1800ms;
		--draw-delay: 900ms;
	}
	@media (prefers-reduced-motion: reduce) {
		.draw-line,
		.draw-line-1,
		.draw-line-2 {
			animation: none !important;
			clip-path: inset(0 0 0 0);
		}
	}
</style>
