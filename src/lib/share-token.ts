/**
 * Client-side delete-token storage.
 *
 * When a project is shared via POST /api/share, the server returns a
 * delete-token the originator can use to re-share or delete the cloud
 * blob. We persist it in localStorage keyed by project id so subsequent
 * "Copy share link" presses can re-share without 403, and so a "Delete
 * share" action has the token to send.
 *
 * localStorage scoping is per-browser, which matches Font Studio's
 * "browser-local first" model: if the originator moves to a different
 * browser, they lose delete capability on shares they made — that's an
 * accepted trade-off vs the complexity of a real account system.
 */

const key = (projectId: string) => `font-studio:share-token:${projectId}`;

export const getShareToken = (projectId: string): string | null => {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage.getItem(key(projectId));
	} catch {
		return null;
	}
};

export const setShareToken = (projectId: string, token: string): void => {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key(projectId), token);
	} catch {
		/* quota or private-mode — silently ignore; re-share still works for
		   the upload itself, just won't be repeatable without re-upload */
	}
};

export const clearShareToken = (projectId: string): void => {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(key(projectId));
	} catch {
		/* ignore */
	}
};
