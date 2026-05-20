/**
 * Client-side wrapper for the /api/hint-font endpoint. Posts a TTF
 * binary, returns the hinted TTF. Throws on failure so callers can
 * fall back to the unhinted output.
 */

export type HintOptions = {
	rangeMin?: number; // PPM; default 8
	rangeMax?: number; // PPM; default 50
};

export type HinterAvailability =
	| { available: true; version: string }
	| { available: false; reason: string };

let availabilityCache: HinterAvailability | null = null;

/** Memoised health check — used by the UI to decide whether to show the toggle. */
export const checkHinterAvailable = async (): Promise<HinterAvailability> => {
	if (availabilityCache) return availabilityCache;
	try {
		const res = await fetch('/api/hint-font');
		if (!res.ok) {
			availabilityCache = { available: false, reason: `HTTP ${res.status}` };
			return availabilityCache;
		}
		availabilityCache = (await res.json()) as HinterAvailability;
		return availabilityCache;
	} catch (err) {
		availabilityCache = {
			available: false,
			reason: err instanceof Error ? err.message : String(err)
		};
		return availabilityCache;
	}
};

/** POST the TTF buffer and return the hinted TTF. */
export const hintTtf = async (
	ttfBuffer: ArrayBuffer,
	opts: HintOptions = {}
): Promise<ArrayBuffer> => {
	const params = new URLSearchParams();
	if (opts.rangeMin != null) params.set('rangeMin', String(opts.rangeMin));
	if (opts.rangeMax != null) params.set('rangeMax', String(opts.rangeMax));
	const qs = params.toString();

	const res = await fetch(`/api/hint-font${qs ? `?${qs}` : ''}`, {
		method: 'POST',
		headers: { 'Content-Type': 'font/ttf' },
		body: ttfBuffer
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`Hinting failed (${res.status}): ${text || res.statusText}`);
	}
	return res.arrayBuffer();
};
