/**
 * Parser for the "bulk sidebearing delta" prompt.
 *
 * Accepts three forms:
 *   "10"     → both sides change by +10
 *   "10/-5"  → LSB +10, RSB -5
 *   "-/5"    → LSB unchanged, RSB +5 (a "-" on either side means "skip")
 *
 * Returns:
 *   { dLsb, dRsb } where each side is either a finite number or `null`
 *     (meaning "leave that side alone").
 *   `null` if the input is malformed (non-numeric, or both sides skipped).
 */
export type Delta = { dLsb: number | null; dRsb: number | null };

export const parseSidebearingDelta = (raw: string): Delta | null => {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	const parseN = (s: string): number | null | typeof NaN => {
		const t = s.trim();
		if (t === '' || t === '-') return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : NaN;
	};

	if (trimmed.includes('/')) {
		const parts = trimmed.split('/');
		if (parts.length !== 2) return null;
		const dLsb = parseN(parts[0]);
		const dRsb = parseN(parts[1]);
		if (dLsb === undefined || dRsb === undefined) return null;
		if (typeof dLsb === 'number' && Number.isNaN(dLsb)) return null;
		if (typeof dRsb === 'number' && Number.isNaN(dRsb)) return null;
		if (dLsb === null && dRsb === null) return null; // both skipped
		return { dLsb, dRsb };
	}

	const n = parseN(trimmed);
	if (n === null || Number.isNaN(n)) return null;
	return { dLsb: n, dRsb: n };
};
