<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { hreflangLinks } from '$lib/i18n';
</script>

<svelte:head>
	<title>Privacidad · Patens — sin tracking, sin cookies, sin recolección de datos</title>
	<meta
		name="description"
		content="Política de privacidad de Patens en lenguaje claro: nada de tu trabajo sale del navegador a menos que vos lo decidas. Sin analytics SDK. Sin cookies."
	/>
	<link rel="canonical" href="https://patens.design/es/privacy" />
	{@html hreflangLinks('/privacy')}
	<meta property="og:locale" content="es_ES" />
	<meta property="og:locale:alternate" content="en_US" />
	<meta property="og:title" content="Privacidad · Patens" />
	<meta
		property="og:description"
		content="Sin tracking, sin cookies, sin recolección. Tus proyectos viven en tu navegador."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Privacidad · Patens" />
	<meta name="twitter:description" content="Sin tracking, sin cookies, sin recolección." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/es/privacy" lang="es" />

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
		Privacidad
	</h1>
	<p class="mb-10 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Última actualización: 2026-05-27
	</p>

	<section class="mb-12 space-y-5 text-[15px] leading-relaxed text-fg-muted">
		<p class="text-[17px] text-fg">
			<strong class="font-semibold">Nada de tu trabajo sale de tu navegador a menos que vos lo
			decidas.</strong>
		</p>
		<p>
			Patens corre 100% en el cliente. Tus proyectos viven en
			<code class="rounded bg-fg/5 px-1 py-0.5 text-[13px] text-fg">IndexedDB</code> de tu
			navegador, en tu propia máquina. No hay base de datos del lado servidor con tus glifos,
			ni una cuenta de usuario, ni un perfil que mantengamos sobre vos.
		</p>
	</section>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Qué guardamos del lado nuestro
	</h2>
	<p class="mb-4 text-[15px] leading-relaxed text-fg-muted">
		Sólo lo que vos elegís enviar:
	</p>
	<ul class="mb-8 space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Shares en la nube (opcional).</strong> Cuando hacés clic en
			"Share" y la nube está configurada, el snapshot del proyecto sube a Vercel Blob como
			<code class="rounded bg-fg/5 px-1 text-[12px]">shares/{'{id}'}.json</code>. El enlace
			actúa como capacidad — cualquiera con el enlace puede verlo. Vos guardás un delete-token
			al subir, que te permite borrarlo después.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Logs del servidor (Vercel).</strong> Vercel guarda logs estándar
			de acceso (IP, user-agent, request path) por los plazos de retención de su platform.
			Nosotros no los miramos ni los procesamos. Esto es lo mismo que pasa con cualquier sitio
			web alojado en Vercel.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Errores 5xx, si los reportás manualmente.</strong> No hay
			Sentry, no hay error-tracking automático. Si querés reportar un bug, abrís un issue en
			GitHub.
		</li>
	</ul>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Qué NO usamos
	</h2>
	<ul class="mb-8 space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Ningún SDK de analytics.</strong> No Google Analytics, no
			Mixpanel, no PostHog, no Plausible, no nada. Cero scripts de tracking.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Ningún cookie de tracking.</strong> El sitio sí usa cookies de
			sesión técnica (para la opción de login OAuth opcional, vía firma HMAC), pero no para
			tracking entre páginas ni entre sitios.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Ningún fingerprinting.</strong> No hashes de fingerprint del
			navegador, no canvas-fingerprinting, no audio-fingerprinting.
		</li>
		<li class="border-l-2 border-fg/10 pl-4">
			<strong class="text-fg">Ningún terceros embebidos.</strong> No fuentes de Google Fonts
			(los specimens usan sólo fuentes auto-alojadas), no widgets de Twitter, no embeds.
		</li>
	</ul>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		API key de Anthropic (opcional)
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Si configurás una clave de la API de Anthropic en Settings, las funciones AI envían
		requests a
		<code class="rounded bg-fg/5 px-1 text-[12px]">api.anthropic.com</code>
		(no a nuestros servidores) cuando vos invocás una función específica como "Visual audit" o
		"Explain audit code". Tu clave se guarda en
		<code class="rounded bg-fg/5 px-1 text-[12px]">localStorage</code> de tu navegador y nunca
		sale a nuestros servidores. El proxy
		<code class="rounded bg-fg/5 px-1 text-[12px]">/api/ai/messages</code> simplemente forwardea
		(con límites de tamaño y un allowlist de modelos) — nosotros no vemos el contenido de tus
		requests.
	</p>

	<h2 class="mb-3 mt-12 border-t border-border/30 pt-12 text-[28px] tracking-tight text-fg">
		Contacto
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Preguntas sobre privacidad o pedidos de borrado de un share-link específico:
		<a
			href="mailto:hi@patens.design"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			hi@patens.design
		</a>. Reportes de seguridad:
		<a
			href="mailto:security@patens.design"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			security@patens.design
		</a> (también ver
		<a
			href="/es/security"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			Seguridad
		</a>).
	</p>

	<SiteFooter lang="es" />
</div>
