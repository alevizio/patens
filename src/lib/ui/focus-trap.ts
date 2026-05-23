/**
 * Focus trap action for modal dialogs. Use with `use:focusTrap` on the
 * dialog root.
 *
 * Behavior:
 *  - On mount: remembers the previously-focused element (so it can be
 *    restored when the trap is removed), then focuses the first
 *    focusable element inside the trap. If none exists, focuses the
 *    trap node itself.
 *  - Tab cycles forward through focusable elements; Shift+Tab cycles
 *    back. Reaching the boundaries wraps around — focus can't escape.
 *  - On destroy: restores focus to whatever had it before the trap
 *    opened (e.g. the button that opened the modal).
 *
 * Notes:
 *  - The trap respects elements that become focusable mid-life (the
 *    list is recomputed on every Tab). No MutationObserver needed
 *    because Tab is the only ingress.
 *  - Hidden elements (display:none, tabindex=-1, disabled) are skipped.
 *  - Esc is NOT handled here — each modal's own keydown closes it,
 *    which then unmounts the trap and restores focus.
 */
export const focusTrap = (node: HTMLElement) => {
	const previouslyFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	const FOCUSABLE_SELECTOR = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])'
	].join(', ');

	const focusable = (): HTMLElement[] => {
		return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
			// Skip elements that aren't visible (display:none, etc.). offsetParent
			// is null for those except <body> children with position:fixed, but
			// inside a modal that's not a concern.
			return el.offsetParent !== null || node.contains(el) === false ? false : true;
		});
	};

	// Initial focus: first focusable element, or the trap node itself.
	queueMicrotask(() => {
		const items = focusable();
		if (items.length > 0) items[0].focus();
		else {
			node.setAttribute('tabindex', '-1');
			node.focus();
		}
	});

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key !== 'Tab') return;
		const items = focusable();
		if (items.length === 0) {
			e.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement as HTMLElement | null;
		if (e.shiftKey) {
			if (active === first || !node.contains(active)) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (active === last || !node.contains(active)) {
				e.preventDefault();
				first.focus();
			}
		}
	};

	node.addEventListener('keydown', onKeyDown);

	return {
		destroy() {
			node.removeEventListener('keydown', onKeyDown);
			// Restore focus to whatever had it before. Done in a microtask
			// to avoid contention with Svelte's own DOM unmount work.
			queueMicrotask(() => {
				if (previouslyFocused && document.body.contains(previouslyFocused)) {
					previouslyFocused.focus();
				}
			});
		}
	};
};
