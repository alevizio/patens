/**
 * Tiny i18n helper for Patens's bilingual marketing surface (en + es).
 *
 * Scope is intentionally narrow:
 *   - Shared chrome strings (SiteHeader nav, SiteFooter columns, lang
 *     switcher labels)
 *   - Locale derivation from URL path (/es/* → es, everything else → en)
 *   - Locale-aware href builder for the language switcher
 *
 * NOT in scope (handled inline per page):
 *   - Page-body copy. Each /es/<route>/+page.svelte is a standalone file
 *     with Spanish content — route duplication, not paraglide. Justified
 *     by the small page count (~10) and the structural divergence
 *     between English and Spanish prose (paragraphs reshape, not just
 *     swap words).
 *   - Editor UI. Editor + audit code descriptions stay English for the
 *     v1.6 launch arc; deferred to v1.7+ per docs/launch/research-notes.md.
 *
 * Voice rule for Spanish:
 *   - voseo (Rioplatense): "dibujás", "tenés", "contame", "si lo
 *     encontrás útil". A deliberate, distinctive regional voice —
 *     it fits the editorial / not-generic-SaaS brand better than a
 *     flattened neutral tú. Keep it consistent across every /es page.
 *   - Still avoid Castilian-only constructions ("vosotros",
 *     "ordenador" → "computadora" or just "navegador").
 *   - Don't translate brand terms: Patens, OpenType, Bézier, kerning,
 *     and similar technical loanwords stay as-is.
 */

export type Locale = 'en' | 'es';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'es'] as const;

/** Derive locale from a URL pathname. /es or /es/anything → 'es'; everything else → 'en'. */
export const localeFromPath = (pathname: string): Locale => {
	if (pathname === '/es' || pathname.startsWith('/es/')) return 'es';
	return 'en';
};

/** Strip the /es prefix from a path, returning the canonical English path. */
export const stripLocalePrefix = (pathname: string): string => {
	if (pathname === '/es') return '/';
	if (pathname.startsWith('/es/')) return pathname.slice(3); // '/es/about' → '/about'
	return pathname;
};

/** Add the /es prefix to a canonical English path. /about → /es/about; / → /es. */
export const addLocalePrefix = (pathname: string): string => {
	if (pathname === '/') return '/es';
	return `/es${pathname}`;
};

/**
 * Paths that have a 1:1 Spanish translation at /es/<same path>.
 *
 * The /es/* tree only covers the marketing surface — see
 * docs/launch/positioning-rework.md. The editor + 94 audit-code
 * descriptions + /learn tutorial bodies + /changelog + audit-rule
 * deep-links stay English for v1.6 (translation roadmap v1.7+).
 *
 * `switchLocalePath` reads from this list so the EN→ES switcher
 * lands on the Spanish home (/es) instead of a 404 when the visitor
 * is on a page without a Spanish counterpart. The build was failing
 * because SvelteKit's prerender follows the switcher link and
 * couldn't reach /es/changelog.
 */
const ES_TRANSLATED_PATHS: ReadonlySet<string> = new Set([
	'/',
	'/about',
	'/help',
	'/press',
	'/privacy',
	'/security',
	'/pronunciation',
	'/compare',
	'/audit',
	'/learn'
]);

/** Build the path to the OTHER locale's version of the current page. */
export const switchLocalePath = (currentPath: string, targetLocale: Locale): string => {
	const canonical = stripLocalePrefix(currentPath);
	if (targetLocale === 'es') {
		// Only translated routes flip to their /es counterpart; everything
		// else falls back to /es home so the user lands somewhere coherent
		// instead of getting a 404.
		return ES_TRANSLATED_PATHS.has(canonical) ? addLocalePrefix(canonical) : '/es';
	}
	return canonical;
};

/**
 * Shared chrome translations. Page-body copy lives in the page files
 * themselves; this is just the surfaces both English and Spanish pages
 * share — header, footer, lang switcher.
 */
export const chrome = {
	en: {
		nav: {
			audit: 'The audit',
			learn: 'Learn',
			compare: 'Compare',
			help: 'Help'
		},
		footer: {
			product: {
				title: 'Product',
				items: {
					auditModule: 'The audit module',
					compare: 'Compare with alternatives',
					changelog: 'Changelog'
				}
			},
			learn: {
				title: 'Learn',
				items: {
					all: 'All tutorials',
					firstFont: 'Your first font',
					auditCodes: 'Audit codes reference',
					help: 'Help · FAQ'
				}
			},
			company: {
				title: 'Company',
				items: {
					about: 'About',
					pronunciation: 'Pronunciation',
					press: 'Press kit'
				}
			},
			legal: {
				title: 'Legal · Source',
				items: {
					privacy: 'Privacy',
					security: 'Security',
					github: 'GitHub repo',
					license: 'MIT license'
				}
			},
			socialLabel: 'Social + source',
			made: 'Made by',
			licence: 'Open source · MIT licence'
		},
		langSwitcher: {
			ariaLabel: 'Switch language',
			en: 'English',
			es: 'Spanish',
			switchTo: 'Read in Spanish'
		},
		skipToContent: 'Skip to content'
	},
	es: {
		nav: {
			audit: 'La auditoría',
			learn: 'Aprender',
			compare: 'Comparar',
			help: 'Ayuda'
		},
		footer: {
			product: {
				title: 'Producto',
				items: {
					auditModule: 'El módulo de auditoría',
					compare: 'Comparar con alternativas',
					changelog: 'Notas de versión'
				}
			},
			learn: {
				title: 'Aprender',
				items: {
					all: 'Todos los tutoriales',
					firstFont: 'Tu primera tipografía',
					auditCodes: 'Referencia de códigos de auditoría',
					help: 'Ayuda · Preguntas frecuentes'
				}
			},
			company: {
				title: 'Empresa',
				items: {
					about: 'Acerca de',
					pronunciation: 'Pronunciación',
					press: 'Prensa'
				}
			},
			legal: {
				title: 'Legal · Código',
				items: {
					privacy: 'Privacidad',
					security: 'Seguridad',
					github: 'Repositorio en GitHub',
					license: 'Licencia MIT'
				}
			},
			socialLabel: 'Redes + código',
			made: 'Hecho por',
			licence: 'Código abierto · Licencia MIT'
		},
		langSwitcher: {
			ariaLabel: 'Cambiar idioma',
			en: 'Inglés',
			es: 'Español',
			switchTo: 'Leer en inglés'
		},
		skipToContent: 'Saltar al contenido'
	}
} as const;

/**
 * Hreflang link tags to emit in <svelte:head> per page. Both locales
 * point at each other + x-default points at the canonical English URL.
 * Use the *canonical* English path (without /es prefix) as the input.
 */
export const hreflangLinks = (canonicalPath: string): string => {
	const enUrl = `https://patens.design${canonicalPath === '/' ? '' : canonicalPath}`;
	const esUrl = `https://patens.design${addLocalePrefix(canonicalPath)}`;
	return `
	<link rel="alternate" hreflang="en" href="${enUrl}" />
	<link rel="alternate" hreflang="es" href="${esUrl}" />
	<link rel="alternate" hreflang="x-default" href="${enUrl}" />`;
};
