<script lang="ts">
	// Color layers panel — full COLR-v1 layer stack editor. Per-glyph
	// list of ColorLayer entries; bottom-up render order matches array
	// order. Each layer has a palette colour + optional gradient
	// (linear / radial / sweep) with editable stops.
	//
	// State lives in projectStore (module singleton); this component
	// only renders + invokes the appropriate mutations. The {#if
	// projectStore.project} gate stays inside so the parent doesn't
	// have to thread `project` non-null through props.
	import { projectStore } from '$lib/stores/project.svelte';
	import { createColorLayer, defaultPalette, rgbaToCss } from '$lib/font/color';
	import type { Glyph, ColorLayer } from '$lib/font/types';

	type Props = { glyph: Glyph };
	let { glyph }: Props = $props();
</script>

			{#if projectStore.project}
				{@const activePalette = defaultPalette(projectStore.project.palettes)}
				{@const layers = glyph.colorLayers ?? []}
				<div class="border-b border-border p-4">
					<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<span>Color layers</span>
						{#if layers.length > 0}
							<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
								{layers.length}
							</span>
						{/if}
					</h3>

					{#if !activePalette}
						<div class="rounded-md border border-dashed border-border bg-surface-2/30 px-3 py-2.5 text-[11px] text-fg-subtle">
							No palettes yet. Create one on the
							<a
								href="/project/{projectStore.project.id}/features"
								class="underline underline-offset-2 hover:text-fg"
							>
								Features tab
							</a>
							to start layering colors.
						</div>
					{:else}
						<button
							type="button"
							onclick={() => {
								if (!activePalette) return;
								// Copy the current monochrome contours into a fresh layer
								// — most common workflow: draw, layer, recolor, draw next.
								const newLayer = createColorLayer(
									glyph.contours,
									0,
									`Layer ${layers.length + 1}`
								);
								projectStore.addColorLayer(glyph.codepoint, newLayer);
							}}
							class="mb-2 w-full rounded-md border border-dashed border-border bg-surface-2/30 px-2 py-1.5 text-[11px] font-medium text-fg-muted transition-all duration-100 ease-out hover:border-accent hover:bg-surface-2/60 hover:text-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
						>
							+ Add layer from current contours
						</button>

						{#if layers.length === 0}
							<p class="text-[11px] leading-snug text-fg-subtle">
								No layers yet. Click "Add layer" — copies the monochrome
								outline into a new layer; pick a palette colour from the
								row below.
							</p>
						{:else}
							<ol class="grid gap-1.5">
								{#each layers as l, idx (l.id)}
									{@const color = activePalette.colors[l.paletteIndex]}
									<li
										class="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-md border border-border bg-surface-2/30 px-2 py-1.5 text-[11px]"
									>
										<span
											class="size-4 shrink-0 rounded border border-border"
											style="background: {color
												? rgbaToCss(color)
												: 'transparent'};"
											title="Palette index {l.paletteIndex}"
										></span>
										<button
											type="button"
											onclick={() =>
												projectStore.updateColorLayer(
													glyph.codepoint,
													l.id,
													(layer: ColorLayer) => ({ ...layer, hidden: !layer.hidden })
												)}
											class="font-mono text-[10px] {l.hidden
												? 'text-fg-subtle'
												: 'text-fg'} hover:text-accent"
											aria-label={l.hidden ? 'Show layer' : 'Hide layer'}
											title={l.hidden ? 'Show layer' : 'Hide layer'}
										>
											{l.hidden ? '○' : '●'}
										</button>
										<select
											value={l.paletteIndex}
											onchange={(e) =>
												projectStore.updateColorLayer(
													glyph.codepoint,
													l.id,
													(layer: ColorLayer) => ({
														...layer,
														paletteIndex: Number(e.currentTarget.value)
													})
												)}
											class="rounded border border-border bg-surface px-1 py-0 font-mono text-[10px] text-fg outline-none focus:border-accent"
											aria-label="Palette colour for layer {idx}"
										>
											{#each activePalette.colors as _c, i (i)}
												<option value={i}>{i}</option>
											{/each}
										</select>
										<button
											type="button"
											onclick={() =>
												projectStore.removeColorLayer(glyph.codepoint, l.id)}
											class="rounded p-0.5 text-fg-subtle hover:bg-warn/10 hover:text-warn-strong"
											aria-label="Delete layer"
											title="Delete layer"
										>
											<span class="font-mono text-[12px]">×</span>
										</button>
										<!-- Gradient toggle + minimal editor (M2 starter). When
										     on, the layer renders as a linear gradient in the
										     preview instead of a flat fill; the underlying
										     paletteIndex stays as the COLR-v0 fallback for
										     export. Designers tweak via numeric inputs for now
										     — on-canvas drag handles are future work. -->
										{#if l.gradient}
											<div class="col-span-4 mt-1 grid gap-1 rounded border border-accent/30 bg-accent-soft/30 p-1.5">
												<div class="flex items-baseline justify-between gap-2 text-[10px] text-accent-strong">
													<!-- Type switcher: linear ↔ radial. Converts geometry
													     when toggling so the gradient stays usable: linear
													     centre = midpoint, radius = half length / vice versa. -->
													<div class="inline-flex rounded border border-accent/40 overflow-hidden">
														<button
															type="button"
															onclick={() =>
																projectStore.updateColorLayer(
																	glyph.codepoint,
																	l.id,
																	(layer: ColorLayer) => {
																		const g = layer.gradient;
																		if (!g || g.type === 'linear') return layer;
																		// sweep/radial → linear: use centre as midpoint,
																		// radius (or default 200) as half-length.
																		const cx = g.center.x;
																		const cy = g.center.y;
																		const r = g.type === 'radial' ? g.radius : 200;
																		return {
																			...layer,
																			gradient: {
																				type: 'linear',
																				start: { x: cx - r, y: cy },
																				end: { x: cx + r, y: cy },
																				stops: g.stops
																			}
																		};
																	}
																)}
															class="px-1.5 py-0 text-[10px] {l.gradient.type ===
															'linear'
																? 'bg-accent text-accent-fg'
																: 'text-accent-strong hover:bg-accent-soft'}"
														>
															Linear
														</button>
														<button
															type="button"
															onclick={() =>
																projectStore.updateColorLayer(
																	glyph.codepoint,
																	l.id,
																	(layer: ColorLayer) => {
																		const g = layer.gradient;
																		if (!g || g.type === 'radial') return layer;
																		let cx: number;
																		let cy: number;
																		let radius: number;
																		if (g.type === 'linear') {
																			cx = (g.start.x + g.end.x) / 2;
																			cy = (g.start.y + g.end.y) / 2;
																			const dx = g.end.x - g.start.x;
																			const dy = g.end.y - g.start.y;
																			radius = Math.max(1, Math.round(Math.hypot(dx, dy) / 2));
																		} else {
																			// sweep → radial
																			cx = g.center.x;
																			cy = g.center.y;
																			radius = 200;
																		}
																		return {
																			...layer,
																			gradient: {
																				type: 'radial',
																				center: { x: cx, y: cy },
																				radius,
																				stops: g.stops
																			}
																		};
																	}
																)}
															class="px-1.5 py-0 text-[10px] {l.gradient.type ===
															'radial'
																? 'bg-accent text-accent-fg'
																: 'text-accent-strong hover:bg-accent-soft'}"
														>
															Radial
														</button>
														<button
															type="button"
															onclick={() =>
																projectStore.updateColorLayer(
																	glyph.codepoint,
																	l.id,
																	(layer: ColorLayer) => {
																		const g = layer.gradient;
																		if (!g || g.type === 'sweep') return layer;
																		const center =
																			g.type === 'linear'
																				? {
																						x: Math.round((g.start.x + g.end.x) / 2),
																						y: Math.round((g.start.y + g.end.y) / 2)
																					}
																				: g.center;
																		return {
																			...layer,
																			gradient: {
																				type: 'sweep',
																				center,
																				startAngle: 0,
																				endAngle: 360,
																				stops: g.stops
																			}
																		};
																	}
																)}
															class="px-1.5 py-0 text-[10px] {l.gradient.type ===
															'sweep'
																? 'bg-accent text-accent-fg'
																: 'text-accent-strong hover:bg-accent-soft'}"
														>
															Sweep
														</button>
													</div>
													<button
														type="button"
														onclick={() =>
															projectStore.updateColorLayer(
																glyph.codepoint,
																l.id,
																(layer: ColorLayer) => ({ ...layer, gradient: undefined })
															)}
														class="text-[10px] underline hover:text-warn-strong"
													>
														Remove
													</button>
												</div>
												{#if l.gradient.type === 'linear'}
													<div class="grid grid-cols-2 gap-1 font-mono text-[10px] text-fg-muted">
														<label class="flex items-center gap-1">
															<span>start</span>
															<input
																type="number"
																step="10"
																value={l.gradient.start.x}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'linear'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							start: { ...layer.gradient.start, x: Number(e.currentTarget.value) }
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
															<input
																type="number"
																step="10"
																value={l.gradient.start.y}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'linear'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							start: { ...layer.gradient.start, y: Number(e.currentTarget.value) }
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
														</label>
														<label class="flex items-center gap-1">
															<span>end</span>
															<input
																type="number"
																step="10"
																value={l.gradient.end.x}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'linear'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							end: { ...layer.gradient.end, x: Number(e.currentTarget.value) }
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
															<input
																type="number"
																step="10"
																value={l.gradient.end.y}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'linear'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							end: { ...layer.gradient.end, y: Number(e.currentTarget.value) }
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
														</label>
													</div>
												{:else if l.gradient.type === 'radial'}
													<div class="grid grid-cols-[auto_1fr] gap-1 font-mono text-[10px] text-fg-muted">
														<span>centre</span>
														<div class="flex gap-1">
															<input
																type="number"
																step="10"
																value={l.gradient.center.x}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'radial'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							center: { ...layer.gradient.center, x: Number(e.currentTarget.value) }
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
															<input
																type="number"
																step="10"
																value={l.gradient.center.y}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'radial'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							center: { ...layer.gradient.center, y: Number(e.currentTarget.value) }
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
														</div>
														<span>radius</span>
														<input
															type="number"
															step="10"
															min="1"
															value={l.gradient.radius}
															oninput={(e) =>
																projectStore.updateColorLayer(
																	glyph.codepoint,
																	l.id,
																	(layer: ColorLayer) =>
																		layer.gradient?.type === 'radial'
																			? {
																					...layer,
																					gradient: {
																						...layer.gradient,
																						radius: Math.max(1, Number(e.currentTarget.value))
																					}
																				}
																			: layer
																)}
															class="w-16 rounded border border-border bg-surface px-1 text-[10px]"
														/>
													</div>
												{:else}
													<!-- Sweep: centre + start/end angles in degrees. CCW
													     from positive x-axis. -->
													<div class="grid grid-cols-[auto_1fr] gap-1 font-mono text-[10px] text-fg-muted">
														<span>centre</span>
														<div class="flex gap-1">
															<input
																type="number"
																step="10"
																value={l.gradient.center.x}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'sweep'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							center: {
																								...layer.gradient.center,
																								x: Number(e.currentTarget.value)
																							}
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
															<input
																type="number"
																step="10"
																value={l.gradient.center.y}
																oninput={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) =>
																			layer.gradient?.type === 'sweep'
																				? {
																						...layer,
																						gradient: {
																							...layer.gradient,
																							center: {
																								...layer.gradient.center,
																								y: Number(e.currentTarget.value)
																							}
																						}
																					}
																				: layer
																	)}
																class="w-12 rounded border border-border bg-surface px-1 text-[10px]"
															/>
														</div>
														<span>start °</span>
														<input
															type="number"
															step="5"
															value={l.gradient.startAngle}
															oninput={(e) =>
																projectStore.updateColorLayer(
																	glyph.codepoint,
																	l.id,
																	(layer: ColorLayer) =>
																		layer.gradient?.type === 'sweep'
																			? {
																					...layer,
																					gradient: {
																						...layer.gradient,
																						startAngle: Number(e.currentTarget.value)
																					}
																				}
																			: layer
																)}
															class="w-16 rounded border border-border bg-surface px-1 text-[10px]"
														/>
														<span>end °</span>
														<input
															type="number"
															step="5"
															value={l.gradient.endAngle}
															oninput={(e) =>
																projectStore.updateColorLayer(
																	glyph.codepoint,
																	l.id,
																	(layer: ColorLayer) =>
																		layer.gradient?.type === 'sweep'
																			? {
																					...layer,
																					gradient: {
																						...layer.gradient,
																						endAngle: Number(e.currentTarget.value)
																					}
																				}
																			: layer
																)}
															class="w-16 rounded border border-border bg-surface px-1 text-[10px]"
														/>
													</div>
												{/if}
												<!-- Gradient stops — each row: editable offset %, palette
												     picker, swatch, remove button. The minimum of 2 stops
												     is enforced by disabling the remove button when only
												     two remain (a "gradient" with 1 stop is just a flat fill). -->
												<div class="grid gap-0.5 text-[10px] text-fg-muted">
													{#each l.gradient.stops as stop, sIdx (sIdx)}
														<div class="flex items-center gap-1">
															<input
																type="number"
																min="0"
																max="100"
																step="5"
																value={Math.round(stop.offset * 100)}
																oninput={(e) => {
																	const pct = Math.max(
																		0,
																		Math.min(100, Number(e.currentTarget.value))
																	);
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) => ({
																			...layer,
																			gradient: layer.gradient
																				? {
																						...layer.gradient,
																						stops: layer.gradient.stops.map((s, j) =>
																							j === sIdx ? { ...s, offset: pct / 100 } : s
																						)
																					}
																				: layer.gradient
																		})
																	);
																}}
																class="w-10 rounded border border-border bg-surface px-1 font-mono text-[10px]"
																aria-label="Stop {sIdx + 1} offset percentage"
															/>
															<select
																value={stop.paletteIndex}
																onchange={(e) =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) => ({
																			...layer,
																			gradient: layer.gradient
																				? {
																						...layer.gradient,
																						stops: layer.gradient.stops.map((s, j) =>
																							j === sIdx
																								? { ...s, paletteIndex: Number(e.currentTarget.value) }
																								: s
																						)
																					}
																				: layer.gradient
																		})
																	)}
																class="rounded border border-border bg-surface px-1 font-mono text-[10px]"
															>
																{#each activePalette.colors as _c, ci (ci)}
																	<option value={ci}>{ci}</option>
																{/each}
															</select>
															<span
																class="size-3 rounded border border-border"
																style="background: {rgbaToCss(activePalette.colors[stop.paletteIndex])};"
															></span>
															<button
																type="button"
																onclick={() =>
																	projectStore.updateColorLayer(
																		glyph.codepoint,
																		l.id,
																		(layer: ColorLayer) => ({
																			...layer,
																			gradient: layer.gradient
																				? {
																						...layer.gradient,
																						stops: layer.gradient.stops.filter(
																							(_s, j) => j !== sIdx
																						)
																					}
																				: layer.gradient
																		})
																	)}
																disabled={l.gradient.stops.length <= 2}
																class="ml-auto rounded p-0.5 text-fg-subtle hover:bg-warn/10 hover:text-warn-strong disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-subtle"
																aria-label="Remove stop {sIdx + 1}"
																title={l.gradient.stops.length <= 2
																	? 'Minimum 2 stops required for a gradient'
																	: 'Remove this stop'}
															>
																<span class="font-mono text-[10px]">×</span>
															</button>
														</div>
													{/each}
													<button
														type="button"
														onclick={() =>
															projectStore.updateColorLayer(
																glyph.codepoint,
																l.id,
																(layer: ColorLayer) => {
																	if (!layer.gradient) return layer;
																	// Insert a new stop at the midpoint between the
																	// last existing stop and 1.0, using the last
																	// stop's palette index — designer can tweak from
																	// there.
																	const stops = [...layer.gradient.stops];
																	const last = stops[stops.length - 1];
																	const midOffset = (last.offset + 1) / 2;
																	stops.push({
																		offset: Math.min(1, midOffset),
																		paletteIndex: last.paletteIndex
																	});
																	// Sort by offset so stops always render
																	// left-to-right in the gradient direction.
																	stops.sort((a, b) => a.offset - b.offset);
																	return { ...layer, gradient: { ...layer.gradient, stops } };
																}
															)}
														disabled={activePalette.colors.length < 1}
														class="mt-0.5 rounded border border-dashed border-border-strong/50 px-2 py-0.5 text-[10px] text-fg-muted hover:border-accent hover:text-accent disabled:opacity-30"
														title="Add a new stop at the midpoint between the last stop and 100%"
													>
														+ stop
													</button>
												</div>
											</div>
										{:else}
											<button
												type="button"
												onclick={() => {
													const nextIdx = Math.min(l.paletteIndex + 1, activePalette.colors.length - 1);
													projectStore.updateColorLayer(
														glyph.codepoint,
														l.id,
														(layer: ColorLayer) => ({
															...layer,
															gradient: {
																type: 'linear',
																start: { x: 0, y: 0 },
																end: { x: glyph.advanceWidth, y: 0 },
																stops: [
																	{ offset: 0, paletteIndex: l.paletteIndex },
																	{ offset: 1, paletteIndex: nextIdx }
																]
															}
														})
													);
												}}
												class="col-span-4 mt-0.5 rounded border border-dashed border-border-strong/50 px-2 py-0.5 text-[10px] text-fg-muted hover:border-accent hover:text-accent"
												title="Convert this flat layer to a horizontal linear gradient"
												disabled={activePalette.colors.length < 2}
											>
												+ gradient
											</button>
										{/if}
									</li>
								{/each}
							</ol>
						{/if}
					{/if}
				</div>
			{/if}
