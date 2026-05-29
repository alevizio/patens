<script lang="ts">
	import { enhance } from '$app/forms';
	import Lock from '@lucide/svelte/icons/lock';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Private alpha — Patens</title>
	<!-- Gated door: keep it out of the index. -->
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-6 py-16">
	<div class="mb-8 flex items-center gap-2.5 text-fg-muted">
		<Lock class="size-4" />
		<span class="font-mono text-[11px] tracking-[0.18em] uppercase">Private alpha</span>
	</div>

	<h1
		class="text-[34px] leading-[1.05] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;"
	>
		You'll need the code.
	</h1>

	<p class="mt-4 text-[15px] leading-relaxed text-fg-muted">
		Patens is in private alpha. Enter the access code you were given to open the editor.
	</p>

	<form method="POST" use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}} class="mt-8 flex flex-col gap-3">
		<label class="flex flex-col gap-1.5">
			<span class="text-[11px] font-medium tracking-wide text-fg-subtle uppercase">Access code</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="password"
				name="passcode"
				autocomplete="off"
				autofocus
				required
				aria-invalid={form?.error ? 'true' : undefined}
				class="rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
				placeholder="••••••••"
			/>
		</label>

		{#if form?.error}
			<p class="text-[13px] text-danger-strong" role="alert">{form.error}</p>
		{/if}

		<button
			type="submit"
			disabled={submitting}
			class="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-fg px-4 py-2.5 text-[13px] font-medium text-canvas transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
		>
			{submitting ? 'Checking…' : 'Enter'}
		</button>
	</form>

	<p class="mt-8 text-[13px] text-fg-muted">
		<a href="/" class="underline-offset-4 hover:text-fg hover:underline">← Back to patens.design</a>
	</p>
</main>
