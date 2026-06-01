<script lang="ts">
	/**
	 * Patens wordmark — the new identity SVG (a stylised P with two
	 * notch-cuts in the right arc). Replaces the prior Lucide `Type`
	 * icon used in SiteHeader, WelcomeDialog, families, and ai routes.
	 *
	 * Theme-aware via CSS tokens:
	 *   - Main stroke uses `currentColor` so the surrounding text-color
	 *     class controls it (text-fg in light, also text-fg in dark
	 *     since the token flips).
	 *   - The two notch-cuts use `hsl(var(--canvas))` so they paint in
	 *     the page background colour — visually "cutting" the main
	 *     stroke regardless of theme.
	 *
	 * Default sizing is the natural 92×114 viewBox aspect (~0.807).
	 * Pass a `size` prop for the height in pixels (width auto-scales).
	 */
	let {
		size = 28,
		class: className = '',
		ariaLabel = 'Patens'
	}: { size?: number; class?: string; ariaLabel?: string } = $props();
</script>

<svg
	width={Math.round((size * 92) / 114)}
	height={size}
	viewBox="0 0 92 114"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={className}
	role="img"
	aria-label={ariaLabel}
>
	<path
		d="M46.8988 5H9.27137C6.91229 5 4.99988 6.91241 4.99988 9.27149V103.97C4.99988 106.731 7.23845 108.97 9.99988 108.97H50.0764C52.8378 108.97 55.0764 106.731 55.0764 103.97V48.8798C55.0764 46.5657 53.2005 44.6898 50.8864 44.6898H49.351C38.6286 44.6898 29.9365 53.3819 29.9365 64.1043C29.9365 74.8266 38.6286 83.5187 49.351 83.5187H50.0157C69.9766 83.5187 86.1582 67.3372 86.1582 47.3762L86.1582 44.2594C86.1582 22.577 68.5812 5 46.8988 5Z"
		stroke="currentColor"
		stroke-width="10"
	/>
	<path
		d="M47.3267 75.8993C54.3194 76.2788 60.1304 76.0318 65.3245 71.2905"
		style="stroke: hsl(var(--canvas))"
		stroke-width="5"
	/>
	<path
		d="M46.668 90.8962C56.7635 90.8962 57.1013 90.9909 66.1815 87.9419"
		style="stroke: hsl(var(--canvas))"
		stroke-width="5"
	/>
</svg>
