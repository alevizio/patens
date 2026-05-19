/**
 * WOFF2 encoder with native-first / Pyodide-fallback path.
 *
 * Native: woff2-encoder (~1.3MB total, ~150ms cold). Uses Google's woff2 C++
 * compiled to WebAssembly. Handles the common case (well-formed TTF/OTF).
 *
 * Fallback: the Pyodide + fontTools path in python.ts (~15MB cold, ~15s).
 * Only used if the native encoder throws — typically on fonts with unusual
 * table layouts the WASM build doesn't accept.
 *
 * `otfToWoff2` is the orchestrator that callers should use. It tries native
 * first and only loads Pyodide on demand.
 */

/** Magic bytes at the start of any valid WOFF2 file: "wOF2". */
export const WOFF2_MAGIC = 0x774f4632;

/** Verify a buffer starts with the WOFF2 magic header (sanity check after encode). */
export const isWoff2 = (buffer: ArrayBuffer | Uint8Array): boolean => {
	const view =
		buffer instanceof ArrayBuffer
			? new DataView(buffer)
			: new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	if (view.byteLength < 4) return false;
	return view.getUint32(0, false) === WOFF2_MAGIC;
};

/**
 * Encode TTF/OTF font data to WOFF2. Lazy-imports the WASM module so the
 * encoder cost only lands when the user actually exports WOFF2.
 *
 * Throws if encoding fails — caller should catch + decide whether to fall
 * back to the Pyodide path.
 */
export const otfToWoff2Native = async (
	sfntBuffer: ArrayBuffer
): Promise<ArrayBuffer> => {
	const { compress } = await import('woff2-encoder');
	const input = new Uint8Array(sfntBuffer);
	const out = await compress(input);
	const result = new Uint8Array(out);
	// Re-allocate into a fresh ArrayBuffer so callers can pass the result to
	// Blob() without worrying about Uint8Array<ArrayBufferLike> typing quirks.
	const buf = new ArrayBuffer(result.byteLength);
	new Uint8Array(buf).set(result);
	if (!isWoff2(buf)) {
		throw new Error(
			'woff2-encoder produced output that is not WOFF2 — falling back to Pyodide is safest.'
		);
	}
	return buf;
};

/**
 * Try the native WASM encoder first; on any failure, fall back to the
 * Pyodide path. Caller doesn't need to know which path succeeded — the
 * result is identical WOFF2 bytes either way.
 *
 * Lazy-imports both modules so the cost of each only lands when used.
 */
export const otfToWoff2 = async (sfntBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
	try {
		return await otfToWoff2Native(sfntBuffer);
	} catch (err) {
		console.warn(
			'WOFF2 native encoder failed — falling back to Pyodide:',
			err instanceof Error ? err.message : err
		);
		const { otfToWoff2: pyodideOtfToWoff2 } = await import('./python');
		return await pyodideOtfToWoff2(sfntBuffer);
	}
};
