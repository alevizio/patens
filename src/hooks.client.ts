/**
 * Client-side error hook + a global window.error listener that
 * surfaces the stack on screen even when the SvelteKit error
 * boundary can't catch it (e.g. errors thrown inside async
 * timers, promise rejections that don't propagate to a load
 * function, etc).
 *
 * The page becomes covered with a red diagnostic overlay so the
 * user sees the exact error without having to open DevTools.
 */

import type { HandleClientError } from '@sveltejs/kit';

const showOverlay = (title: string, detail: string) => {
	if (typeof document === 'undefined') return;
	// Remove any existing overlay first
	document.getElementById('__fs_err_overlay')?.remove();
	const el = document.createElement('div');
	el.id = '__fs_err_overlay';
	el.style.cssText =
		'position:fixed;top:0;left:0;right:0;background:#7f1d1d;color:#fee2e2;padding:12px 16px;font-family:ui-monospace,monospace;font-size:11px;line-height:1.5;z-index:99999;max-height:50vh;overflow:auto;border-bottom:2px solid #fecaca;white-space:pre-wrap;word-break:break-word';
	el.innerHTML =
		'<div style="font-weight:600;margin-bottom:6px">' +
		title +
		' <button style="float:right;background:none;border:1px solid #fecaca;color:#fee2e2;padding:1px 6px;cursor:pointer" onclick="this.parentElement.parentElement.remove()">×</button></div>' +
		'<div>' +
		detail.replace(/[<&]/g, (c) => ({ '<': '&lt;', '&': '&amp;' })[c] ?? c) +
		'</div>';
	document.body.appendChild(el);
};

if (typeof window !== 'undefined') {
	window.addEventListener('error', (ev) => {
		const e = ev.error as Error | undefined;
		const detail = e?.stack ?? e?.message ?? String(ev.message ?? '(no message)');
		showOverlay('Uncaught error: ' + (e?.message ?? ev.message ?? ''), detail);
		console.error('[window.error]', e ?? ev);
	});
	window.addEventListener('unhandledrejection', (ev) => {
		const e = ev.reason as Error | undefined;
		const detail = e?.stack ?? e?.message ?? String(ev.reason);
		showOverlay('Unhandled rejection: ' + (e?.message ?? String(ev.reason)), detail);
		console.error('[unhandledrejection]', ev.reason);
	});
}

export const handleError: HandleClientError = ({ error, event, status, message }) => {
	console.error('[handleError]', error);
	const err = error as Error;
	const detail = err?.stack ?? err?.message ?? String(error);
	showOverlay(
		'SvelteKit error at ' + event.url.pathname + ' (' + status + ')',
		detail
	);
	return {
		message: err?.message ?? message ?? 'Unknown client error',
		stack: err?.stack,
		status,
		url: event.url.pathname
	};
};
