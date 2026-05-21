//#region src/lib/util/format.ts
/**
* Format an ISO timestamp as a compact, designer-friendly relative string —
* "just now", "12m ago", "3h ago", "2d ago", "5mo ago", "1y ago". Used across
* the home page, /families index, and family hub.
*
* Anything pre-2020 returns the absolute locale date instead.
*/
var formatRelative = (iso) => {
	const ts = Date.parse(iso);
	if (!Number.isFinite(ts)) return iso;
	const diffMs = Date.now() - ts;
	const sec = Math.max(0, Math.floor(diffMs / 1e3));
	if (sec < 60) return "just now";
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day < 30) return `${day}d ago`;
	const month = Math.floor(day / 30);
	if (month < 12) return `${month}mo ago`;
	return `${Math.floor(month / 12)}y ago`;
};
//#endregion
export { formatRelative as t };
