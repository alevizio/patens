<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';
</script>

<svelte:head>
	<title>Seguridad · Patens — modelo de amenazas, divulgación responsable, MIT</title>
	<meta
		name="description"
		content="Postura de seguridad de Patens: qué se almacena dónde, qué headers se envían, cómo reportar vulnerabilidades."
	/>
	<link rel="canonical" href="https://patens.design/es/security" />
	{@html hreflangLinks('/security')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Seguridad · Patens" />
	<meta
		property="og:description"
		content="Modelo de amenazas, divulgación responsable, código MIT abierto."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Seguridad · Patens" />
	<meta name="twitter:description" content="Modelo de amenazas y divulgación responsable." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/security" lang="es" />

	<a
		href="/es"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Volver al inicio
	</a>

	<h1
		class="mb-2 text-[48px] leading-tight tracking-tight text-fg"
		
	>
		Seguridad
	</h1>
	<p class="mb-10 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Última actualización: 2026-05-27
	</p>

	<section class="mb-12 space-y-5 text-[15px] leading-relaxed text-fg-muted">
		<p class="text-[17px] text-fg">
			<strong class="font-semibold">Patens es código abierto MIT.</strong> Cualquier
			afirmación que hagamos acá podés verificarla leyendo el código en
			
				github.com/alevizio/patens
			.
		</p>
	</section>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Modelo de amenazas
	</h2>
	<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
		Lo que Patens protege:
	</p>
	<ul class="mb-6 space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Tu trabajo del lado cliente.</strong> Los proyectos viven en
			IndexedDB de tu navegador. No los exportamos sin tu acción explícita.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Tu API key de Anthropic.</strong> Si la configurás, se guarda
			en localStorage local y nunca sale a nuestros servidores. El proxy AI sólo forwardea (con
			límites + allowlist de modelos).
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Los enlaces compartidos.</strong> El delete-token se almacena
			como hash SHA-256 en el blob público — el token raw nunca queda en la nube. Sólo vos (con
			el token raw que se te muestra al crear el share) podés borrarlo.
		</li>
	</ul>
	<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
		Lo que <strong class="text-fg">NO</strong> está en el modelo de amenazas:
	</p>
	<ul class="mb-8 space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Disponibilidad de los shares en la nube.</strong> Vercel Blob
			puede caer; un enlace compartido podría no responder por algún tiempo. No hay SLA.
			Mantené copia local (.font.json) para tu archivo.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Privacidad de los shares.</strong> El enlace ES la capacidad —
			cualquiera con el enlace puede ver. Si querés privacidad, no lo compartas, o usá un
			short-link revocable.
		</li>
	</ul>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Headers HTTP de hardening
	</h2>
	<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
		Cada respuesta de la app aplica estos headers vía el
		<code class="rounded bg-fg/5 px-1 text-[13px]">handle</code> hook de SvelteKit:
	</p>
	<ul class="mb-8 space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li class="border-l-2 border-fg/10 pl-4">
			<code class="rounded bg-fg/5 px-1 text-[12px]">X-Content-Type-Options: nosniff</code>
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<code class="rounded bg-fg/5 px-1 text-[12px]">X-Frame-Options: DENY</code> — bloquea
			embed en iframe (protección contra clickjacking)
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<code class="rounded bg-fg/5 px-1 text-[12px]">Referrer-Policy: strict-origin-when-cross-origin</code>
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<code class="rounded bg-fg/5 px-1 text-[12px]">Permissions-Policy</code> — bloquea
			camera, microphone, geolocation, payment, USB
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<code class="rounded bg-fg/5 px-1 text-[12px]">Strict-Transport-Security</code> (HSTS,
			preload-ready, 2 años) — sólo en HTTPS
		</li>
	</ul>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Reportar vulnerabilidades
	</h2>
	<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
		<strong class="text-fg">Por favor reportá privadamente primero</strong> — no abras issues
		públicos para vulnerabilidades.
	</p>
	<ul class="mb-8 space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Email:</strong>
			<a
				href="mailto:security@patens.design"
				class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
			>
				security@patens.design
			</a>
		</li>
	</ul>
	<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
		SLA del solo-maintainer: triage inicial dentro de 7 días, fix con la urgencia que el
		impacto amerite. Te acreditamos en el advisory público a menos que pidas anonimato.
	</p>

	<p class="mb-8 text-[13px] leading-relaxed text-fg-muted">
		La política de seguridad completa se publica con el lanzamiento público.
	</p>

	<SiteFooter lang="es" />
</div>
