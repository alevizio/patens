<script lang="ts">
	/**
	 * AccountButton — surfaces sign-in state in the editor header.
	 *
	 * Three states:
	 *   - signed in: avatar + login dropdown with Sign out
	 *   - signed out + OAuth enabled on this deploy: Sign in button
	 *   - signed out + OAuth disabled (env vars missing): nothing
	 *
	 * The deploy-level OAuth-enabled flag isn't directly exposed to the
	 * client; we infer it from a 503 on /auth/login when clicked. The
	 * button is always rendered when signed-out; if the user hits it on
	 * a build without OAuth, they get a clear toast.
	 */
	import { page } from '$app/state';
	import LogOut from '@lucide/svelte/icons/log-out';
	import LogIn from '@lucide/svelte/icons/log-in';
	import { toast } from '$lib/stores/toast.svelte';

	let menuOpen = $state(false);

	// session is provided by +layout.server.ts → page.data
	const session = $derived(page.data.session as
		| { id: string; login: string; name?: string; avatar?: string }
		| null);

	const signIn = async () => {
		// Pre-flight the route to detect 503 (OAuth not configured) and
		// surface a clear message instead of bouncing through a redirect
		// that resolves to a server error.
		try {
			const probe = await fetch('/auth/login', { redirect: 'manual', method: 'HEAD' });
			if (probe.status === 503) {
				toast.warn('Sign-in is not configured for this deployment.');
				return;
			}
		} catch {
			/* If HEAD fails for non-OAuth reasons, fall through to redirect */
		}
		window.location.href = `/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
	};
</script>

{#if session}
	<div class="relative">
		<button
			type="button"
			onclick={() => (menuOpen = !menuOpen)}
			class="inline-flex items-center gap-2 rounded px-1.5 py-1 text-[12px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
			aria-label="Account menu"
			aria-haspopup="menu"
			aria-expanded={menuOpen}
		>
			{#if session.avatar}
				<img src={session.avatar} alt="" class="size-5 rounded-full" />
			{/if}
			<span class="font-mono">{session.login}</span>
		</button>
		{#if menuOpen}
			<div
				class="fixed inset-0 z-40"
				onclick={() => (menuOpen = false)}
				role="presentation"
			></div>
			<div
				class="absolute right-0 z-50 mt-1 min-w-[180px] rounded-md border border-border bg-surface p-1 shadow-lg"
				role="menu"
			>
				<div class="px-2 py-1.5 text-[11px] text-fg-subtle">
					Signed in as <span class="font-mono">{session.login}</span>
				</div>
				<div class="my-0.5 border-t border-border"></div>
				<form method="POST" action="/auth/logout">
					<button
						type="submit"
						class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
						role="menuitem"
					>
						<LogOut class="size-3.5" />
						Sign out
					</button>
				</form>
			</div>
		{/if}
	</div>
{:else}
	<button
		type="button"
		onclick={signIn}
		class="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[12px] text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
		aria-label="Sign in with GitHub"
		title="Sign in with GitHub"
	>
		<LogIn class="size-3.5" />
		<span>Sign in</span>
	</button>
{/if}
