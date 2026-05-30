<script lang="ts">
	/**
	 * Phase C developer playground.
	 *
	 * Tiny harness that exercises the Yjs schema bridge + IndexedDB
	 * persistence + (optional) PartyKit network all stitched together
	 * — WITHOUT touching the real projectStore. Use this in dev to
	 * confirm the data plane works end-to-end before the store-
	 * binding refactor lands.
	 *
	 * Two columns showing the same Y.Doc-backed state. Opens a fresh
	 * Y.Doc bound to IndexedDB under the room `font-studio:sync-test`.
	 * Edits to either column trigger Y.Doc transactions; the other
	 * column reacts via the `observe()` hook. Open a second tab to
	 * see cross-tab sync via Yjs's BroadcastChannel layer.
	 *
	 * "Connect to PartyKit" is opt-in. Without it, sync is local
	 * only. With it, edits propagate across machines via the
	 * deployed PartyKit server.
	 */

	import { onMount, onDestroy } from 'svelte';
	import * as Y from 'yjs';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import { bindIndexedDb, type ProjectPersistence } from '$lib/sync/yjs-persistence';
	import { connectToPartyKit, type NetworkConnection } from '$lib/sync/yjs-network';

	const ROOM = 'sync-test';
	let doc = $state<Y.Doc | null>(null);
	let persistence = $state<ProjectPersistence | null>(null);
	let network = $state<NetworkConnection | null>(null);
	let synced = $state(false);

	// Reactive view of the Y.Doc state. We use a small object so
	// Svelte can diff cleanly across observe() callbacks.
	let view = $state<{ title: string; tags: string[] }>({ title: '', tags: [] });
	const refreshView = () => {
		if (!doc) return;
		const root = doc.getMap('playground');
		const tagsRaw = root.get('tags');
		view = {
			title: (root.get('title') as string) ?? '',
			tags: tagsRaw instanceof Y.Array ? (tagsRaw.toArray() as string[]) : []
		};
	};

	onMount(async () => {
		const d = new Y.Doc();
		doc = d;
		const root = d.getMap('playground');
		// Initialise if empty.
		if (!root.has('title')) root.set('title', 'untitled');
		if (!root.has('tags')) root.set('tags', new Y.Array<string>());
		// Bind to IndexedDB for offline persistence + cross-tab sync.
		persistence = bindIndexedDb(d, ROOM);
		if (persistence) {
			await persistence.whenSynced;
		}
		synced = true;
		refreshView();
		root.observeDeep(refreshView);
	});

	onDestroy(() => {
		if (network) network.destroy();
		if (persistence) persistence.destroy();
		if (doc) doc.destroy();
	});

	const setTitle = (next: string) => {
		if (!doc) return;
		doc.transact(() => {
			doc!.getMap('playground').set('title', next);
		});
	};
	const addTag = (text: string) => {
		const trimmed = text.trim();
		if (!doc || !trimmed) return;
		doc.transact(() => {
			const arr = doc!.getMap('playground').get('tags') as Y.Array<string>;
			arr.insert(arr.length, [trimmed]);
		});
	};
	const removeTag = (index: number) => {
		if (!doc) return;
		doc.transact(() => {
			const arr = doc!.getMap('playground').get('tags') as Y.Array<string>;
			arr.delete(index, 1);
		});
	};

	let pendingTag = $state('');
	let partyKitHost = $state('');

	const toggleNetwork = () => {
		if (!doc) return;
		if (network) {
			network.destroy();
			network = null;
			return;
		}
		const opts = partyKitHost.trim() ? { host: partyKitHost.trim() } : {};
		network = connectToPartyKit(doc, ROOM, opts);
	};
</script>

<svelte:head>
	<title>Sync playground — Patens dev</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-4 p-6">
	<header>
		<h1 class="text-[24px] leading-tight text-fg"
			
		>
			Phase C sync playground
		</h1>
		<p class="mt-1 text-[13px] leading-relaxed text-fg-muted">
			Dev-only harness validating the Yjs schema + y-indexeddb + y-partykit
			foundations. Edits persist to IndexedDB under
			<span class="font-mono text-fg-subtle">font-studio:{ROOM}</span> and
			broadcast across tabs automatically. Open this page in a second tab
			to see it.
		</p>
	</header>

	<Panel>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Y.Doc state
			</h2>
			{#if synced}
				<span
					class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
				>
					IndexedDB synced
				</span>
			{:else}
				<span
					class="rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-warn-strong uppercase"
				>
					Loading…
				</span>
			{/if}
			{#if network}
				<span
					class="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-accent-strong uppercase"
				>
					Network on
				</span>
			{/if}
		</div>

		<label class="block">
			<span class="mb-1 block text-[11px] font-medium text-fg-muted">Title</span>
			<input
				type="text"
				value={view.title}
				oninput={(e) => setTitle(e.currentTarget.value)}
				class="w-full rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-fg outline-none focus:border-accent"
			/>
		</label>

		<div class="mt-4">
			<span class="mb-1 block text-[11px] font-medium text-fg-muted">Tags</span>
			<div class="mb-2 flex flex-wrap gap-1.5">
				{#each view.tags as t, i (i + t)}
					<button
						type="button"
						onclick={() => removeTag(i)}
						class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-warn-strong hover:text-warn-strong"
						title="Click to remove"
					>
						{t}
						<span class="text-[10px] opacity-60">×</span>
					</button>
				{/each}
				{#if view.tags.length === 0}
					<span class="text-[11px] text-fg-subtle">No tags yet.</span>
				{/if}
			</div>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					addTag(pendingTag);
					pendingTag = '';
				}}
				class="flex gap-2"
			>
				<input
					type="text"
					bind:value={pendingTag}
					placeholder="add a tag"
					class="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[12px] text-fg outline-none focus:border-accent"
				/>
				<Button density="sm" disabled={!pendingTag.trim()}>Add</Button>
			</form>
		</div>
	</Panel>

	<Panel>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				PartyKit network (opt-in)
			</h2>
		</div>
		<p class="mb-3 text-[12px] leading-snug text-fg-muted">
			Without a host, no real network sync — IndexedDB + cross-tab only.
			Deploy <code>partykit/font-studio.ts</code> via
			<code>pnpm dlx partykit deploy</code> and paste the resulting
			<span class="font-mono">*.partykit.dev</span> host here to flip on
			cross-machine sync.
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="text"
				bind:value={partyKitHost}
				placeholder="font-studio.your-deployer.partykit.dev"
				class="flex-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[12px] text-fg outline-none focus:border-accent"
				disabled={!!network}
			/>
			<Button density="sm" onclick={toggleNetwork}>
				{network ? 'Disconnect' : 'Connect'}
			</Button>
		</div>
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Raw Y.Doc dump
			</h2>
		</div>
		<pre
			class="overflow-auto rounded-md border border-border bg-surface-2/40 p-3 font-mono text-[11px] text-fg-muted">{JSON.stringify(view, null, 2)}</pre>
	</Panel>
</div>
