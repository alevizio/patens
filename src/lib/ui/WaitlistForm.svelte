<script lang="ts">
	// WaitlistForm — private-alpha email capture. Posts to /api/waitlist,
	// which persists the address to Vercel Blob. Bilingual via a `lang`
	// prop (the only two surfaces are the EN teaser at / and the ES teaser
	// at /es). Voice in ES: tú, neutral/LATAM.
	//
	// Honeypot: a visually-hidden `company` field. Real users never fill
	// it; bots autofill every field, so a non-empty value → silent success
	// (we drop it without hitting the API).
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Locale } from '$lib/i18n';

	type Props = { lang?: Locale; class?: string };
	let { lang = 'en', class: extraClass = '' }: Props = $props();

	const COPY = {
		en: {
			placeholder: 'you@studio.com',
			submit: 'Request an invite',
			submitting: 'Sending…',
			success: "You're on the list. We'll email you when a spot opens.",
			invalid: "That doesn't look like an email.",
			failure: 'Something went wrong. Try again in a moment.',
			aria: 'Email address for the alpha invite list'
		},
		es: {
			placeholder: 'tu@estudio.com',
			submit: 'Pedir una invitación',
			submitting: 'Enviando…',
			success: 'Estás en la lista. Te escribimos cuando se abra un lugar.',
			invalid: 'Eso no parece un correo.',
			failure: 'Algo salió mal. Probá de nuevo en un momento.',
			aria: 'Correo electrónico para la lista de invitaciones del alpha'
		}
	} as const;

	const t = $derived(COPY[lang]);

	let email = $state('');
	let company = $state(''); // honeypot
	let status = $state<'idle' | 'submitting' | 'done' | 'error'>('idle');
	let message = $state('');

	// Pragmatic client-side shape check — the server validates too.
	const looksLikeEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

	const submit = async (e: SubmitEvent) => {
		e.preventDefault();
		if (status === 'submitting') return;

		// Honeypot tripped → pretend success, send nothing.
		if (company.trim()) {
			status = 'done';
			message = t.success;
			return;
		}

		if (!looksLikeEmail(email)) {
			status = 'error';
			message = t.invalid;
			return;
		}

		status = 'submitting';
		message = '';
		try {
			const res = await fetch('/api/waitlist', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), locale: lang })
			});
			if (res.ok) {
				status = 'done';
				message = t.success;
			} else {
				status = 'error';
				message = t.failure;
			}
		} catch {
			status = 'error';
			message = t.failure;
		}
	};
</script>

{#if status === 'done'}
	<!-- Subtle entry: a brief fly-up + fade, 240ms ease-out. The transition
	     is the one delight moment in the form — gated by reduced-motion
	     through Svelte's built-in respect for prefers-reduced-motion. -->
	<p
		in:fly={{ y: 6, duration: 240, easing: cubicOut }}
		class="text-[15px] leading-relaxed text-fg {extraClass}"
		role="status"
		aria-live="polite"
		data-testid="waitlist-success"
	>
		<span
			in:fade={{ duration: 320, delay: 120 }}
			class="mr-1.5 inline-block text-accent-strong"
			aria-hidden="true"
		>
			✓
		</span>{message}
	</p>
{:else}
	<form onsubmit={submit} class="flex flex-col gap-2 {extraClass}" novalidate>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<input
				type="email"
				name="email"
				bind:value={email}
				required
				autocomplete="email"
				aria-label={t.aria}
				aria-invalid={status === 'error' ? 'true' : undefined}
				placeholder={t.placeholder}
				class="min-w-0 flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
			/>
			<!-- Honeypot — off-screen, not announced, not tab-stopped. -->
			<input
				type="text"
				name="company"
				bind:value={company}
				tabindex="-1"
				autocomplete="off"
				aria-hidden="true"
				class="absolute left-[-9999px] h-0 w-0 opacity-0"
			/>
			<button
				type="submit"
				disabled={status === 'submitting'}
				class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-fg px-4 py-2.5 text-[13px] font-medium text-canvas transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
			>
				{status === 'submitting' ? t.submitting : t.submit}
			</button>
		</div>
		{#if status === 'error'}
			<p class="text-[13px] text-danger-strong" role="alert">{message}</p>
		{/if}
	</form>
{/if}
